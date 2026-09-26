import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import { User } from "@/models/User";
import { Business } from "@/models/Business";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/db/audit";
import { DEFAULT_ROLE_PERMISSIONS } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = (body.identifier || body.email || body.username || "").trim();
    const password = body.password;

    // Validate inputs
    if (!identifier || !password || typeof identifier !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email/username and password are required." },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.toLowerCase();

    // Connect to database
    await connectToDatabase();

    // Query user by email OR username and explicitly select passwordHash
    const user = await User.findOne({
      $or: [{ email: cleanIdentifier }, { username: cleanIdentifier }],
    }).select("+passwordHash");

    const isInactive =
      !user ||
      user.status === "inactive" ||
      user.status === "INACTIVE" ||
      user.status === "SUSPENDED" ||
      user.isActive === false;

    if (!user || isInactive) {
      return NextResponse.json(
        { error: "Invalid email/username or account is deactivated." },
        { status: 401 }
      );
    }

    // Verify password with bcrypt
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Lookup business details for tenant users
    let businessName: string | undefined;
    let businessSlug: string | undefined;

    if (user.businessId) {
      const business = await Business.findById(user.businessId);

      if (!business || business.status !== "active") {
        return NextResponse.json(
          { error: "Your business account is suspended or inactive. Please contact support." },
          { status: 403 }
        );
      }

      businessName = business.name;
      businessSlug = business.slug;
    }

    // Update last login timestamp in background
    user.lastLoginAt = new Date();
    await user.save();

    // Determine branch access rule
    const branchAccess =
      user.branchAccess || (user.role === "BUSINESS_OWNER" ? "ALL_BRANCHES" : "SELECTED_BRANCHES");

    // Resolve permissions (explicit or role defaults)
    const effectivePermissions =
      user.permissions && user.permissions.length > 0
        ? user.permissions
        : DEFAULT_ROLE_PERMISSIONS[user.role] || [];

    // Construct session payload
    const sessionPayload = {
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      businessId: user.businessId ? user.businessId.toString() : null,
      businessName,
      businessSlug,
      branchAccess,
      branchIds: user.branchIds || [],
      activeBranchId: user.branchIds?.[0],
      permissions: effectivePermissions,
    };

    // Set secure HTTP-only cookie
    await createSession(sessionPayload);

    // Audit log login
    await logAuditEvent({
      businessId: user.businessId ? user.businessId.toString() : null,
      userId: user._id.toString(),
      userName: user.name,
      userRole: user.role,
      action: "USER_LOGIN",
      entityType: "User",
      entityId: user._id.toString(),
      description: `User ${user.name} (${user.email}) logged in successfully.`,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id.toString(),
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          businessId: user.businessId,
          businessName,
          businessSlug,
          branchAccess,
          branchIds: user.branchIds || [],
          permissions: effectivePermissions,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // Log internal error safely on server only (no secrets/passwords)
    console.error("Authentication error occurred in /api/auth/login:", error instanceof Error ? error.message : "Unknown error");

    // Return safe generic error response
    return NextResponse.json(
      { error: "An unexpected error occurred during authentication. Please try again." },
      { status: 500 }
    );
  }
}
