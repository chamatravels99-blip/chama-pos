import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import { StockMovement } from "@/models/StockMovement";
import {
  getTenantContext,
  requirePermission,
  AuthorizationError,
  AuthenticationError,
  isPlatformRole,
} from "@/lib/auth/session";
import { scopeToTenant, scopeToBranch } from "@/lib/db/tenant-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext();
    await requirePermission("STOCK_VIEW");
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const branchId = searchParams.get("branchId") || undefined;
    const productId = searchParams.get("productId") || undefined;
    const type = searchParams.get("type") || undefined;
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo = searchParams.get("dateTo") || undefined;

    const baseQuery: Record<string, unknown> = scopeToTenant(tenantContext, {});
    if (!isPlatformRole(tenantContext.role)) {
      const branchScoped = scopeToBranch(tenantContext, branchId || undefined, baseQuery);
      Object.assign(baseQuery, branchScoped);
    }

    if (branchId && branchId !== "ALL") {
      baseQuery.branchId = branchId;
    }
    if (productId) {
      baseQuery.productId = productId;
    }
    if (type) {
      baseQuery.type = type;
    }
    if (dateFrom || dateTo) {
      baseQuery.createdAt = {} as Record<string, Date>;
      if (dateFrom) {
        (baseQuery.createdAt as Record<string, Date>).$gte = new Date(dateFrom);
      }
      if (dateTo) {
        (baseQuery.createdAt as Record<string, Date>).$lte = new Date(dateTo);
      }
    }

    const movements = await StockMovement.find(baseQuery).sort({ createdAt: -1 }).limit(300).lean();

    return NextResponse.json({ success: true, movements });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("GET /api/inventory/movements error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to retrieve stock movements." }, { status: 500 });
  }
}
