import mongoose from "mongoose";
import { Branch } from "@/models/Branch";
import { CashTransaction, CashTransactionType } from "@/models/CashTransaction";
import { Sale } from "@/models/Sale";
import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/db/connection";
import { scopeToBranch } from "@/lib/db/tenant-context";
import { assertBranchAccess, AuthorizationError, hasPermission } from "@/lib/auth/session";
import { TenantContext } from "@/types";

const CASH_TYPES: CashTransactionType[] = ["OPENING_CASH", "CASH_IN", "CASH_OUT", "EXPENSE"];

export class CashValidationError extends Error {
  statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "CashValidationError";
  }
}

export interface CashTransactionInput {
  type: CashTransactionType;
  branchId: string;
  amount: number;
  description: string;
  category?: string;
  reference?: string;
}

export interface CashListOptions {
  branchId?: string;
  type?: CashTransactionType;
  includeExpenses?: boolean;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export function parseCashTransactionInput(value: unknown): CashTransactionInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CashValidationError("Invalid cash transaction data.");
  }
  const data = value as Record<string, unknown>;
  if (typeof data.type !== "string" || !CASH_TYPES.includes(data.type as CashTransactionType)) {
    throw new CashValidationError("Transaction type is invalid.");
  }
  if (typeof data.branchId !== "string" || !data.branchId.trim()) {
    throw new CashValidationError("A specific branch is required.");
  }
  if (typeof data.amount !== "number" || !Number.isFinite(data.amount) || data.amount <= 0) {
    throw new CashValidationError("Amount must be a positive finite number.");
  }
  if (Math.abs(data.amount * 100 - Math.round(data.amount * 100)) > 1e-8) {
    throw new CashValidationError("Amount cannot have more than two decimal places.");
  }
  if (typeof data.description !== "string" || !data.description.trim()) {
    throw new CashValidationError("Description is required.");
  }
  if (data.description.trim().length > 500) {
    throw new CashValidationError("Description cannot exceed 500 characters.");
  }
  for (const field of ["category", "reference"] as const) {
    if (data[field] !== undefined && typeof data[field] !== "string") {
      throw new CashValidationError(`${field} must be text.`);
    }
  }
  if (data.category && String(data.category).trim().length > 100) {
    throw new CashValidationError("Category cannot exceed 100 characters.");
  }
  if (data.reference && String(data.reference).trim().length > 150) {
    throw new CashValidationError("Reference cannot exceed 150 characters.");
  }

  return {
    type: data.type as CashTransactionType,
    branchId: data.branchId.trim(),
    amount: data.amount,
    description: data.description.trim(),
    category: typeof data.category === "string" ? data.category.trim() || undefined : undefined,
    reference: typeof data.reference === "string" ? data.reference.trim() || undefined : undefined,
  };
}

function dateRange(dateFrom?: string, dateTo?: string) {
  const range: Record<string, Date> = {};
  const parseDay = (day: string, field: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      throw new CashValidationError(`${field} must use YYYY-MM-DD format.`);
    }
    const parsed = new Date(`${day}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day) {
      throw new CashValidationError(`${field} is not a valid date.`);
    }
    return parsed;
  };

  if (dateFrom) range.$gte = parseDay(dateFrom, "Start date");
  if (dateTo) {
    const end = parseDay(dateTo, "End date");
    end.setUTCDate(end.getUTCDate() + 1);
    range.$lt = end;
  }
  if (range.$gte && range.$lt && range.$gte >= range.$lt) {
    throw new CashValidationError("Start date must be on or before end date.");
  }
  return range;
}

function permissionForType(type: CashTransactionType) {
  if (type === "CASH_OUT") return "CASH_OUT";
  if (type === "EXPENSE") return "EXPENSE_CREATE";
  return "CASH_IN";
}

function requireCashView(context: TenantContext) {
  if (!hasPermission(context, "CASH_VIEW")) {
    throw new AuthorizationError('Forbidden: Lacks required permission "CASH_VIEW".');
  }
}

async function validateCashBranch(context: TenantContext, branchId?: string) {
  if (!branchId || branchId === "ALL") return;
  if (!mongoose.isValidObjectId(branchId)) {
    throw new CashValidationError("Selected branch is invalid or unavailable.");
  }
  assertBranchAccess(context, branchId);
  const branch = await Branch.findOne({
    _id: branchId,
    businessId: context.businessId,
    status: "active",
    isActive: { $ne: false },
  }).select("_id").lean();
  if (!branch) throw new CashValidationError("Selected branch is invalid or does not belong to this business.");
}

async function createCashTransaction(context: TenantContext, input: CashTransactionInput) {
  if (!context.businessId) throw new AuthorizationError("Select an active business before recording cash.");
  if (!hasPermission(context, permissionForType(input.type))) {
    throw new AuthorizationError(`Forbidden: Lacks required permission "${permissionForType(input.type)}".`);
  }
  await connectToDatabase();
  await validateCashBranch(context, input.branchId);
  const branch = await Branch.findById(input.branchId).select("_id").lean();
  if (!branch) throw new CashValidationError("Selected branch is invalid or does not belong to this business.");

  const values: Record<string, unknown> = {
    businessId: context.businessId,
    branchId: branch._id.toString(),
    type: input.type,
    amount: input.amount,
    description: input.description,
    category: input.category,
    reference: input.reference,
    userId: context.userId,
  };
  if (input.type === "OPENING_CASH") {
    const openingDate = new Date().toISOString().slice(0, 10);
    const existingOpening = await CashTransaction.exists({
      businessId: context.businessId,
      branchId: input.branchId,
      type: "OPENING_CASH",
      openingDate,
    });
    if (existingOpening) {
      throw new CashValidationError("Opening cash has already been recorded for this branch today.");
    }
    values.openingDate = openingDate;
  }

  try {
    return await CashTransaction.create(values);
  } catch (error) {
    if (input.type === "OPENING_CASH" && (error as { code?: number }).code === 11000) {
      throw new CashValidationError("Opening cash has already been recorded for this branch today.");
    }
    throw error;
  }
}

export function createOpeningCash(context: TenantContext, input: Omit<CashTransactionInput, "type">) {
  return createCashTransaction(context, { ...input, type: "OPENING_CASH" });
}

export function createCashIn(context: TenantContext, input: Omit<CashTransactionInput, "type">) {
  return createCashTransaction(context, { ...input, type: "CASH_IN" });
}

export function createCashOut(context: TenantContext, input: Omit<CashTransactionInput, "type">) {
  return createCashTransaction(context, { ...input, type: "CASH_OUT" });
}

export function createExpense(context: TenantContext, input: Omit<CashTransactionInput, "type">) {
  return createCashTransaction(context, { ...input, type: "EXPENSE" });
}

export async function listCashTransactions(context: TenantContext, options: CashListOptions = {}) {
  if (!context.businessId) throw new AuthorizationError("Select an active business before viewing cash.");
  requireCashView(context);
  const page = Math.max(1, Math.floor(options.page || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(options.limit || 50)));
  const query = scopeToBranch(context, options.branchId || "ALL", {}) as Record<string, unknown>;
  if (options.type) query.type = options.type;
  else if (options.includeExpenses === false) query.type = { $ne: "EXPENSE" };
  const range = dateRange(options.dateFrom, options.dateTo);
  if (Object.keys(range).length) query.createdAt = range;
  await connectToDatabase();
  await validateCashBranch(context, options.branchId);

  const [records, total] = await Promise.all([
    CashTransaction.find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    CashTransaction.countDocuments(query),
  ]);
  const branchIds = Array.from(new Set(records.map((record) => record.branchId)));
  const userIds = Array.from(new Set(records.map((record) => record.userId)));
  const objectIdUserIds = userIds.filter((userId) => mongoose.isValidObjectId(userId));
  const [branches, users] = await Promise.all([
    Branch.find({ businessId: context.businessId, _id: { $in: branchIds } }).select("_id name").lean(),
    User.find({ businessId: context.businessId, _id: { $in: objectIdUserIds } }).select("_id name username").lean(),
  ]);
  const branchNames = new Map(branches.map((branch) => [branch._id.toString(), branch.name]));
  const userNames = new Map(users.map((user) => [user._id.toString(), user.name || user.username || "Unknown user"]));

  return {
    transactions: records.map((record) => ({
      ...record,
      _id: record._id.toString(),
      branchName: branchNames.get(record.branchId) || "Unknown branch",
      userName: userNames.get(record.userId) || "Unknown user",
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export interface CashSummary {
  openingCash: number;
  cashSales: number;
  cashIn: number;
  cashOut: number;
  expenses: number;
  currentExpectedCash: number;
}

export async function getCashSummary(
  context: TenantContext,
  options: Pick<CashListOptions, "branchId" | "dateFrom" | "dateTo"> = {}
): Promise<CashSummary> {
  if (!context.businessId) throw new AuthorizationError("Select an active business before viewing cash.");
  requireCashView(context);
  const branchScope = scopeToBranch(context, options.branchId || "ALL", {}) as Record<string, unknown>;
  const range = dateRange(options.dateFrom, options.dateTo);
  const today = new Date().toISOString().slice(0, 10);
  const createdAt: Record<string, Date> = Object.keys(range).length
    ? range
    : { $gte: new Date(`${today}T00:00:00.000Z`), $lt: new Date(`${today}T00:00:00.000Z`) };
  if (!options.dateFrom && !options.dateTo) createdAt.$lt.setUTCDate(createdAt.$lt.getUTCDate() + 1);
  await connectToDatabase();
  await validateCashBranch(context, options.branchId);

  const [totals, cashSales] = await Promise.all([
    CashTransaction.aggregate([
      { $match: { ...branchScope, createdAt } },
      { $group: { _id: "$type", amount: { $sum: "$amount" } } },
    ]),
    Sale.aggregate([
      {
        $match: {
          ...branchScope,
          createdAt,
          paymentMethod: "cash",
          paymentStatus: { $in: ["paid", "partial"] },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          amount: { $sum: { $subtract: ["$paidAmount", { $ifNull: ["$changeAmount", 0] }] } },
        },
      },
    ]),
  ]);
  const byType = new Map<string, number>(totals.map((row: { _id: string; amount: number }) => [row._id, row.amount]));
  const summary = {
    openingCash: byType.get("OPENING_CASH") || 0,
    cashSales: cashSales[0]?.amount || 0,
    cashIn: byType.get("CASH_IN") || 0,
    cashOut: byType.get("CASH_OUT") || 0,
    expenses: byType.get("EXPENSE") || 0,
  };
  return {
    ...summary,
    currentExpectedCash: summary.openingCash + summary.cashSales + summary.cashIn - summary.cashOut - summary.expenses,
  };
}