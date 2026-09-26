import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import { AuditLog } from "@/models/AuditLog";
import {
  getTenantContext,
  requirePermission,
  AuthorizationError,
  AuthenticationError,
} from "@/lib/auth/session";
import { scopeToTenant } from "@/lib/db/tenant-context";

export const dynamic = "force-dynamic";

/**
 * GET /api/audit-logs
 * Retrieves immutable audit records for the current tenant.
 * Requires AUDIT_LOG_VIEW permission.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext();
    await requirePermission("AUDIT_LOG_VIEW");
    await connectToDatabase();

    const isPlatformAdmin =
      tenantContext.role === "PLATFORM_OWNER" ||
      tenantContext.role === "PLATFORM_ADMIN" ||
      tenantContext.role === "SUPER_ADMIN";

    let query: Record<string, unknown> = {};

    if (isPlatformAdmin) {
      const targetBusinessId = request.nextUrl.searchParams.get("businessId");
      if (targetBusinessId) {
        query.businessId = targetBusinessId;
      }
    } else {
      query = scopeToTenant(tenantContext, query);
    }

    const action = request.nextUrl.searchParams.get("action");
    if (action) {
      query.action = action;
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("GET /api/audit-logs error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to retrieve audit logs." }, { status: 500 });
  }
}
