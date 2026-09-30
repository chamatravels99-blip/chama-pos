import { NextRequest, NextResponse } from "next/server";
import {
  assertEffectiveBusinessId,
  AuthenticationError,
  AuthorizationError,
  requireBranchAccess,
  requireEffectiveTenantContext,
  requirePermission,
  resolveRequestedBranch,
} from "@/lib/auth/session";
import { TenantSecurityError } from "@/lib/db/tenant-context";
import { CashValidationError, getCashSummary } from "@/lib/cash/cash-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await requireEffectiveTenantContext();
    await requirePermission("CASH_VIEW");
    const { searchParams } = request.nextUrl;
    assertEffectiveBusinessId(context, searchParams.get("businessId"));
    const requestedBranch = searchParams.get("branchId") || undefined;
    await requireBranchAccess(requestedBranch);
    const branchId = resolveRequestedBranch(context, requestedBranch);
    const summary = await getCashSummary(context, {
      branchId: branchId || "ALL",
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
    });
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (error instanceof AuthorizationError || error instanceof TenantSecurityError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof CashValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("GET /api/cash/summary error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Cash summary request failed." }, { status: 500 });
  }
}