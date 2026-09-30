import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import {
  AuthenticationError,
  AuthorizationError,
  requireEffectiveTenantContext,
  requirePermission,
} from "@/lib/auth/session";
import { TenantSecurityError } from "@/lib/db/tenant-context";
import { getCustomerById } from "@/lib/customers/customer-service";
import { listSales, SaleValidationError } from "@/lib/sales/sale-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const tenantContext = await requireEffectiveTenantContext();
    await requirePermission("CUSTOMER_VIEW");
    await requirePermission("SALE_VIEW");
    await connectToDatabase();

    const customer = await getCustomerById(tenantContext, params.id);
    if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

    const page = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("limit") || "20", 10) || 20));
    const result = await listSales(tenantContext, { customerId: customer._id, page, limit });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (error instanceof AuthorizationError || error instanceof TenantSecurityError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof SaleValidationError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error(`GET /api/customers/${params.id}/sales error:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to retrieve customer purchase history." }, { status: 500 });
  }
}