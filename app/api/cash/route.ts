import { NextRequest, NextResponse } from "next/server";
import { Business } from "@/models/Business";
import { connectToDatabase } from "@/lib/db/connection";
import {
  assertEffectiveBusinessId,
  AuthenticationError,
  AuthorizationError,
  hasPermission,
  requireBranchAccess,
  requireEffectiveTenantContext,
  requirePermission,
  resolveRequestedBranch,
} from "@/lib/auth/session";
import { TenantSecurityError } from "@/lib/db/tenant-context";
import {
  CashValidationError,
  createCashIn,
  createCashOut,
  createExpense,
  createOpeningCash,
  listCashTransactions,
  parseCashTransactionInput,
} from "@/lib/cash/cash-service";

export const dynamic = "force-dynamic";

const CASH_TYPES = ["OPENING_CASH", "CASH_IN", "CASH_OUT", "EXPENSE"] as const;

function errorResponse(error: unknown, method: string) {
  if (error instanceof AuthenticationError) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (error instanceof AuthorizationError || error instanceof TenantSecurityError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof CashValidationError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  console.error(`${method} /api/cash error:`, error instanceof Error ? error.message : error);
  return NextResponse.json({ error: "Cash request failed." }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const context = await requireEffectiveTenantContext();
    await requirePermission("CASH_VIEW");
    const { searchParams } = request.nextUrl;
    assertEffectiveBusinessId(context, searchParams.get("businessId"));
    const requestedType = searchParams.get("type") || undefined;
    if (requestedType && !(CASH_TYPES as readonly string[]).includes(requestedType)) {
      throw new CashValidationError("Transaction type is invalid.");
    }
    if (requestedType === "EXPENSE") await requirePermission("EXPENSE_VIEW");
    const requestedBranch = searchParams.get("branchId") || undefined;
    await requireBranchAccess(requestedBranch);
    const branchId = resolveRequestedBranch(context, requestedBranch);
    await connectToDatabase();
    const result = await listCashTransactions(context, {
      branchId: branchId || "ALL",
      type: requestedType as (typeof CASH_TYPES)[number] | undefined,
      includeExpenses: hasPermission(context, "EXPENSE_VIEW"),
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      page: Number.parseInt(searchParams.get("page") || "1", 10) || 1,
      limit: Number.parseInt(searchParams.get("limit") || "50", 10) || 50,
    });
    const business = await Business.findById(context.businessId).select("settings.currency").lean();
    return NextResponse.json({ success: true, ...result, currency: business?.settings?.currency || "USD" });
  } catch (error) {
    return errorResponse(error, "GET");
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireEffectiveTenantContext();
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new CashValidationError("Invalid cash transaction data.");
    }
    const data = body as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(data, "businessId") || Object.prototype.hasOwnProperty.call(data, "userId")) {
      throw new CashValidationError("Business and user identity are assigned by the server.");
    }
    const input = parseCashTransactionInput(data);
    const permission = input.type === "CASH_OUT"
      ? "CASH_OUT"
      : input.type === "EXPENSE"
        ? "EXPENSE_CREATE"
        : "CASH_IN";
    await requirePermission(permission);
    await requireBranchAccess(input.branchId);
    await connectToDatabase();
    const transactionInput = {
      branchId: input.branchId,
      amount: input.amount,
      description: input.description,
      category: input.category,
      reference: input.reference,
    };
    const transaction = input.type === "OPENING_CASH"
      ? await createOpeningCash(context, transactionInput)
      : input.type === "CASH_IN"
        ? await createCashIn(context, transactionInput)
        : input.type === "CASH_OUT"
          ? await createCashOut(context, transactionInput)
          : await createExpense(context, transactionInput);
    return NextResponse.json({ success: true, transaction }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST");
  }
}