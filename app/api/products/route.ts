import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import { Product } from "@/models/Product";
import { getTenantContext, AuthorizationError, AuthenticationError } from "@/lib/auth/session";
import { scopeToTenant } from "@/lib/db/tenant-context";

export const dynamic = "force-dynamic";

/**
 * GET /api/products
 * Securely retrieves products strictly scoped to the authenticated tenant.
 * Ignores any client-supplied businessId.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Resolve server-side tenant context from authenticated session
    const tenantContext = await getTenantContext();

    // 2. Connect to database
    await connectToDatabase();

    // 3. Build tenant-scoped query
    // If PLATFORM_ADMIN, allow viewing all or filtering by query param
    // If normal tenant user, businessId is MANDATORY and cannot be overridden by client
    let query: Record<string, unknown> = { status: "active" };

    if (tenantContext.role === "PLATFORM_ADMIN" || tenantContext.role === "SUPER_ADMIN") {
      const searchParams = request.nextUrl.searchParams;
      const targetBusinessId = searchParams.get("businessId");
      if (targetBusinessId) {
        query.businessId = targetBusinessId;
      }
    } else {
      // Strictly enforced server-side tenant scoping
      query = scopeToTenant(tenantContext, query);
    }

    const products = await Product.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Error in GET /api/products:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to retrieve products." },
      { status: 500 }
    );
  }
}
