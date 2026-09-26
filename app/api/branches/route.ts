import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import { Branch } from "@/models/Branch";
import { getTenantContext, AuthorizationError, AuthenticationError } from "@/lib/auth/session";
import { scopeToTenant } from "@/lib/db/tenant-context";

export const dynamic = "force-dynamic";

/**
 * GET /api/branches
 * Retrieves active branches scoped strictly to the authenticated tenant.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext();
    await connectToDatabase();

    const isPlatformAdmin =
      tenantContext.role === "PLATFORM_OWNER" ||
      tenantContext.role === "PLATFORM_ADMIN" ||
      tenantContext.role === "SUPER_ADMIN";

    let query: Record<string, unknown> = { status: "active" };

    if (isPlatformAdmin) {
      const searchParams = request.nextUrl.searchParams;
      const targetBusinessId = searchParams.get("businessId");
      if (targetBusinessId) {
        query.businessId = targetBusinessId;
      }
    } else {
      query = scopeToTenant(tenantContext, query);
    }

    const branches = await Branch.find(query).sort({ isMain: -1, name: 1 }).lean();

    return NextResponse.json({
      success: true,
      branches,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("GET /api/branches error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to retrieve branches." }, { status: 500 });
  }
}
