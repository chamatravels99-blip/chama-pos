import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import { User } from "@/models/User";
import {
  requireEffectiveTenantContext,
  hasPermission,
  AuthorizationError,
  AuthenticationError,
} from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { logAuditEvent } from "@/lib/db/audit";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

/**
 * POST /api/users/[id]/password
 * Resets or changes a user's password using bcrypt.
 * Authorized for users with USER_EDIT permission or self-service password update.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const tenantContext = await requireEffectiveTenantContext();
    await connectToDatabase();

    const isSelf = tenantContext.userId === params.id;
    const canEditUsers = hasPermission(tenantContext, "USER_EDIT");

    if (!isSelf && !canEditUsers) {
      return NextResponse.json(
        { error: "Forbidden: You lack permissions to change this user's password." },
        { status: 403 }
      );
    }

    const targetUser = await User.findOne({ _id: params.id, businessId: tenantContext.businessId });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Tenant isolation verification
    const body = await request.json();
    const { password, confirmPassword } = body;

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      );
    }

    // Hash password with bcrypt
    targetUser.passwordHash = await hashPassword(password);
    await targetUser.save();

    // Audit log without ever storing the password
    await logAuditEvent({
      businessId: targetUser.businessId,
      userId: tenantContext.userId,
      userName: tenantContext.businessName || "Staff Admin",
      userRole: tenantContext.role,
      action: "PASSWORD_CHANGED",
      entityType: "User",
      entityId: targetUser._id.toString(),
      description: `Password changed for user ${targetUser.name} (${targetUser.email}).`,
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error(`POST /api/users/${params.id}/password error:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to update password." }, { status: 500 });
  }
}
