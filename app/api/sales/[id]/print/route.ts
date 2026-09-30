import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import {
  AuthenticationError,
  AuthorizationError,
  getEffectiveTenantContext,
  requireBranchAccess,
  requirePermission,
} from "@/lib/auth/session";
import { TenantSecurityError } from "@/lib/db/tenant-context";
import { getCurrentBusiness } from "@/lib/business/business-service";
import { Branch } from "@/models/Branch";
import { getSaleById, SaleValidationError } from "@/lib/sales/sale-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const tenantContext = await getEffectiveTenantContext();
    if (!tenantContext.businessId) {
      throw new AuthorizationError("Select an active business before accessing sales.");
    }
    await requirePermission("SALE_VIEW");

    const format = request.nextUrl.searchParams.get("format");
    if (format !== "80mm" && format !== "A4") {
      return NextResponse.json({ error: "Print format must be either 80mm or A4." }, { status: 400 });
    }

    await connectToDatabase();
    const sale = await getSaleById(tenantContext, params.id);
    await requireBranchAccess(sale.branchId);

    const [business, branch] = await Promise.all([
      getCurrentBusiness(tenantContext),
      Branch.findOne({ _id: sale.branchId, businessId: tenantContext.businessId }).lean(),
    ]);

    if (!business || !branch) {
      return NextResponse.json({ error: "Sale not found." }, { status: 404 });
    }
    if (sale.status !== "completed") {
      return NextResponse.json({ error: "Only completed sales can be printed." }, { status: 409 });
    }

    return NextResponse.json({ success: true, sale, business, branch, format });
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
    console.error(`GET /api/sales/${params.id}/print error:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to load sale for printing." }, { status: 500 });
  }
}