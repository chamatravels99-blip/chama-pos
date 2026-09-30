import { NextRequest, NextResponse } from "next/server";
import { getEffectiveTenantContext, assertEffectiveBusinessId, AuthorizationError, AuthenticationError } from "@/lib/auth/session";
import { TenantSecurityError } from "@/lib/db/tenant-context";
import { listAuthorizedBranches } from "@/lib/branches/branch-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/branches
 * Retrieves active branches scoped strictly to the authenticated tenant.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getEffectiveTenantContext();
    const requestedBusinessId = request.nextUrl.searchParams.get("businessId")?.trim();
    if (requestedBusinessId) assertEffectiveBusinessId(tenantContext, requestedBusinessId);

    const branches = tenantContext.businessId
      ? await listAuthorizedBranches(tenantContext)
      : [];

    return NextResponse.json({
      success: true,
      businessId: tenantContext.businessId,
      branches,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (error instanceof AuthorizationError || error instanceof TenantSecurityError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("GET /api/branches error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to retrieve branches." }, { status: 500 });
  }
}
