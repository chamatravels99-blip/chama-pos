import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import {
  getTenantContext,
  requirePermission,
  AuthorizationError,
  AuthenticationError,
} from "@/lib/auth/session";
import { TenantSecurityError } from "@/lib/db/tenant-context";
import { getSaleById, SaleValidationError } from "@/lib/sales/sale-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

/**
 * GET /api/sales/[id]
 * Returns a single sale if it belongs to the authenticated tenant and the user may view it.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const tenantContext = await getTenantContext();
    await requirePermission("SALE_VIEW");
    await connectToDatabase();

    const sale = await getSaleById(tenantContext, params.id);
    return NextResponse.json({ success: true, sale });
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
    console.error(`GET /api/sales/${params.id} error:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to retrieve sale." }, { status: 500 });
  }
}
