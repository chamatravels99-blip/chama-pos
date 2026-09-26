import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import {
  getTenantContext,
  requireAuth,
  requirePermission,
  AuthorizationError,
  AuthenticationError,
} from "@/lib/auth/session";
import { TenantSecurityError } from "@/lib/db/tenant-context";
import {
  createSale,
  listSales,
  SaleValidationError,
} from "@/lib/sales/sale-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/sales
 * Lists sales for the authenticated tenant, scoped by branch access and cashier visibility.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext();
    await requirePermission("SALE_VIEW");
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const result = await listSales(tenantContext, {
      branchId: searchParams.get("branchId") || undefined,
      cashierUserId: searchParams.get("cashierUserId") || undefined,
      page: Number.isFinite(page) ? page : 1,
      limit: Number.isFinite(limit) ? limit : 50,
      search: searchParams.get("search") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (error instanceof AuthorizationError || error instanceof TenantSecurityError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof SaleValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/sales error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to retrieve sales." }, { status: 500 });
  }
}

/**
 * POST /api/sales
 * Creates a completed sale. businessId and cashier identity come only from the session.
 * Product prices and totals are calculated server-side from the database.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    await requirePermission("POS_ACCESS");
    await requirePermission("SALE_CREATE");
    const tenantContext = await getTenantContext();
    await connectToDatabase();

    const body = await request.json().catch(() => ({}));

    const sale = await createSale(
      tenantContext,
      { userId: session.userId, name: session.name },
      body
    );

    return NextResponse.json({ success: true, sale }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (error instanceof AuthorizationError || error instanceof TenantSecurityError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof SaleValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "Duplicate invoice number. Please retry." }, { status: 409 });
    }
    console.error("POST /api/sales error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to create sale." }, { status: 500 });
  }
}
