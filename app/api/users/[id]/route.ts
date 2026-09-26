import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import { User } from "@/models/User";
import { Branch } from "@/models/Branch";
import {
  getTenantContext,
  requirePermission,
  AuthorizationError,
  AuthenticationError,
} from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/db/audit";
import { DEFAULT_ROLE_PERMISSIONS, UserRole } from "@/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

/**
 * GET /api/users/[id]
 * Retrieves an individual user's profile and assigned permissions.
 * Scoped strictly to the authenticated tenant.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const tenantContext = await getTenantContext();
    await requirePermission("USER_VIEW");
    await connectToDatabase();

    const isPlatformAdmin =
      tenantContext.role === "PLATFORM_OWNER" ||
      tenantContext.role === "PLATFORM_ADMIN" ||
      tenantContext.role === "SUPER_ADMIN";

    const user = await User.findById(params.id).select("-passwordHash").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Tenant isolation verification
    if (!isPlatformAdmin && user.businessId !== tenantContext.businessId) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error(`GET /api/users/${params.id} error:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to retrieve user." }, { status: 500 });
  }
}

/**
 * PATCH /api/users/[id]
 * Updates user profile, role, branch assignments, and permissions.
 * businessId is IMMUTABLE and cannot be altered.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const tenantContext = await getTenantContext();
    await requirePermission("USER_EDIT");
    await connectToDatabase();

    const isPlatformAdmin =
      tenantContext.role === "PLATFORM_OWNER" ||
      tenantContext.role === "PLATFORM_ADMIN" ||
      tenantContext.role === "SUPER_ADMIN";

    const targetUser = await User.findById(params.id);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Tenant isolation check
    if (!isPlatformAdmin && targetUser.businessId !== tenantContext.businessId) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const body = await request.json();

    // Verify email uniqueness if changed
    if (body.email && body.email.trim().toLowerCase() !== targetUser.email) {
      const emailTaken = await User.findOne({
        email: body.email.trim().toLowerCase(),
        _id: { $ne: targetUser._id },
      });
      if (emailTaken) {
        return NextResponse.json({ error: "This email is already in use by another account." }, { status: 409 });
      }
      targetUser.email = body.email.trim().toLowerCase();
    }

    // Verify username uniqueness if changed
    if (body.username && body.username.trim().toLowerCase() !== targetUser.username) {
      const usernameTaken = await User.findOne({
        username: body.username.trim().toLowerCase(),
        _id: { $ne: targetUser._id },
      });
      if (usernameTaken) {
        return NextResponse.json({ error: "This username is already taken." }, { status: 409 });
      }
      targetUser.username = body.username.trim().toLowerCase();
    }

    if (body.name) targetUser.name = body.name.trim();
    if (body.phone !== undefined) targetUser.phone = body.phone ? body.phone.trim() : undefined;

    // Role update
    if (body.role && body.role !== targetUser.role) {
      targetUser.role = body.role as UserRole;
      // If no custom permissions provided alongside new role, reset to new role's defaults
      if (!body.permissions) {
        targetUser.permissions = DEFAULT_ROLE_PERMISSIONS[body.role as UserRole] || [];
      }
    }

    // Permissions update
    if (Array.isArray(body.permissions)) {
      targetUser.permissions = body.permissions;
    }

    // Branch access update
    if (body.branchAccess) {
      targetUser.branchAccess = body.branchAccess;
      if (targetUser.role === "BUSINESS_OWNER") {
        targetUser.branchAccess = "ALL_BRANCHES";
      }
    }

    if (Array.isArray(body.branchIds)) {
      if (targetUser.businessId) {
        const validBranches = await Branch.find({
          businessId: targetUser.businessId,
          _id: { $in: body.branchIds },
        }).select("_id");
        targetUser.branchIds = validBranches.map((b) => b._id.toString());
        targetUser.assignedBranchIds = targetUser.branchIds;
      }
    }

    // Status update (ACTIVE, INACTIVE, SUSPENDED)
    if (body.status && ["ACTIVE", "INACTIVE", "SUSPENDED", "active", "inactive"].includes(body.status)) {
      targetUser.status = body.status;
      targetUser.isActive = body.status === "ACTIVE" || body.status === "active";
    }

    await targetUser.save();

    // Audit log
    await logAuditEvent({
      businessId: targetUser.businessId,
      userId: tenantContext.userId,
      userName: tenantContext.businessName || "Staff Admin",
      userRole: tenantContext.role,
      action: "USER_UPDATED",
      entityType: "User",
      entityId: targetUser._id.toString(),
      description: `Updated profile, role, or access rules for user ${targetUser.name} (${targetUser.email}).`,
      metadata: {
        updatedUserId: targetUser._id.toString(),
        name: targetUser.name,
        role: targetUser.role,
        status: targetUser.status,
        branchAccess: targetUser.branchAccess,
        permissionsCount: targetUser.permissions?.length || 0,
      },
    });

    const userObj = targetUser.toObject();
    delete (userObj as { passwordHash?: string }).passwordHash;

    return NextResponse.json({ success: true, user: userObj });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error(`PATCH /api/users/${params.id} error:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}

/**
 * DELETE /api/users/[id]
 * Soft-deactivates a user (sets status to INACTIVE). Does not delete historical references.
 * Requires USER_DISABLE permission.
 */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const tenantContext = await getTenantContext();
    await requirePermission("USER_DISABLE");
    await connectToDatabase();

    const isPlatformAdmin =
      tenantContext.role === "PLATFORM_OWNER" ||
      tenantContext.role === "PLATFORM_ADMIN" ||
      tenantContext.role === "SUPER_ADMIN";

    const targetUser = await User.findById(params.id);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Tenant isolation check
    if (!isPlatformAdmin && targetUser.businessId !== tenantContext.businessId) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Prevent deactivating own account
    if (targetUser._id.toString() === tenantContext.userId) {
      return NextResponse.json(
        { error: "Action rejected: You cannot deactivate your own logged-in account." },
        { status: 400 }
      );
    }

    targetUser.status = "INACTIVE";
    targetUser.isActive = false;
    await targetUser.save();

    // Audit log
    await logAuditEvent({
      businessId: targetUser.businessId,
      userId: tenantContext.userId,
      userName: tenantContext.businessName || "Staff Admin",
      userRole: tenantContext.role,
      action: "USER_DISABLED",
      entityType: "User",
      entityId: targetUser._id.toString(),
      description: `Soft-deactivated user account for ${targetUser.name} (${targetUser.email}).`,
    });

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.name} has been deactivated.`,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error(`DELETE /api/users/${params.id} error:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to deactivate user." }, { status: 500 });
  }
}
