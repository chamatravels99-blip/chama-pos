import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import { User } from "@/models/User";
import { Branch } from "@/models/Branch";
import {
  requireEffectiveTenantContext,
  assertEffectiveBusinessId,
  requirePermission,
  AuthorizationError,
  AuthenticationError,
  resolveRequestedBranch,
} from "@/lib/auth/session";
import { scopeToTenant } from "@/lib/db/tenant-context";
import { hashPassword } from "@/lib/auth/password";
import { logAuditEvent } from "@/lib/db/audit";
import { DEFAULT_ROLE_PERMISSIONS, UserRole } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/users
 * Returns users belonging to the current tenant.
 * Requires USER_VIEW permission.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantContext = await requireEffectiveTenantContext();
    await requirePermission("USER_VIEW");
    await connectToDatabase();

    assertEffectiveBusinessId(tenantContext, request.nextUrl.searchParams.get("businessId"));
    const query: Record<string, unknown> = scopeToTenant(tenantContext, {});
    const activeBranchId = resolveRequestedBranch(tenantContext);
    if (activeBranchId) {
      query.$or = [
        { role: "BUSINESS_OWNER" },
        { branchAccess: "ALL_BRANCHES" },
        { branchIds: activeBranchId },
      ];
    }

    const users = await User.find(query)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("GET /api/users error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to retrieve users." }, { status: 500 });
  }
}

/**
 * POST /api/users
 * Creates a new user strictly inside the authenticated business.
 * Requires USER_CREATE permission.
 */
export async function POST(request: NextRequest) {
  try {
    const tenantContext = await requireEffectiveTenantContext();
    await requirePermission("USER_CREATE");
    await connectToDatabase();

    const body = await request.json();
    const {
      name,
      email,
      username,
      password,
      confirmPassword,
      phone,
      role = "CASHIER",
      branchAccess = "SELECTED_BRANCHES",
      branchIds = [],
      permissions,
      status = "ACTIVE",
    } = body;

    // Validate name
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "User full name is required." }, { status: 400 });
    }

    // Validate email
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    // Validate password
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username ? username.trim().toLowerCase() : cleanEmail.split("@")[0];

    // Check email uniqueness
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
    }

    // Check username uniqueness if supplied
    if (cleanUsername) {
      const existingUsername = await User.findOne({ username: cleanUsername });
      if (existingUsername) {
        return NextResponse.json({ error: "This username is already taken. Please choose another." }, { status: 409 });
      }
    }

    // Determine target businessId
    if (Object.prototype.hasOwnProperty.call(body, "businessId")) {
      if (typeof body.businessId !== "string") {
        return NextResponse.json({ error: "Invalid business context." }, { status: 400 });
      }
      assertEffectiveBusinessId(tenantContext, body.businessId);
    }
    const targetBusinessId = tenantContext.businessId;

    // Validate assigned branches belong to this business
    let validatedBranchIds: string[] = [];
    if (targetBusinessId && branchAccess === "SELECTED_BRANCHES" && Array.isArray(branchIds) && branchIds.length > 0) {
      const validBranches = await Branch.find({
        businessId: targetBusinessId,
        _id: { $in: branchIds },
        status: "active",
        isActive: { $ne: false },
      }).select("_id");
      validatedBranchIds = validBranches.map((b) => b._id.toString());
    }

    // If BUSINESS_OWNER, force ALL_BRANCHES
    const effectiveBranchAccess = role === "BUSINESS_OWNER" ? "ALL_BRANCHES" : branchAccess;

    // Resolve permissions: custom or fallback to role defaults
    const effectivePermissions =
      Array.isArray(permissions) && permissions.length > 0
        ? permissions
        : DEFAULT_ROLE_PERMISSIONS[role as UserRole] || [];

    // Hash password
    const passwordHash = await hashPassword(password);

    // Normalize status
    const effectiveStatus = ["ACTIVE", "INACTIVE", "SUSPENDED", "active", "inactive"].includes(status)
      ? status
      : "ACTIVE";

    const newUser = await User.create({
      businessId: targetBusinessId,
      name: name.trim(),
      email: cleanEmail,
      username: cleanUsername,
      phone: phone?.trim() || undefined,
      passwordHash,
      role,
      branchAccess: effectiveBranchAccess,
      branchIds: effectiveBranchAccess === "ALL_BRANCHES" ? [] : validatedBranchIds,
      assignedBranchIds: effectiveBranchAccess === "ALL_BRANCHES" ? [] : validatedBranchIds,
      permissions: effectivePermissions,
      status: effectiveStatus,
      isActive: effectiveStatus === "ACTIVE" || effectiveStatus === "active",
    });

    // Write audit log
    await logAuditEvent({
      businessId: targetBusinessId,
      userId: tenantContext.userId,
      userName: tenantContext.businessName || "Staff Admin",
      userRole: tenantContext.role,
      action: "USER_CREATED",
      entityType: "User",
      entityId: newUser._id.toString(),
      description: `Created user account for ${newUser.name} (${newUser.email}) with role ${newUser.role}.`,
      metadata: {
        createdUserId: newUser._id.toString(),
        createdUserName: newUser.name,
        createdUserEmail: newUser.email,
        role: newUser.role,
        branchAccess: effectiveBranchAccess,
        assignedBranchesCount: validatedBranchIds.length,
      },
    });

    const userObj = newUser.toObject();
    delete (userObj as { passwordHash?: string }).passwordHash;

    return NextResponse.json(
      {
        success: true,
        user: userObj,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("POST /api/users error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to create user account." }, { status: 500 });
  }
}
