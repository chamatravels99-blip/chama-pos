import { randomBytes } from "crypto";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connection";
import { Sale } from "@/models/Sale";
import { Product } from "@/models/Product";
import { Branch } from "@/models/Branch";
import { Business } from "@/models/Business";
import { AuditLog } from "@/models/AuditLog";
import { logAuditEvent } from "@/lib/db/audit";
import { scopeToTenant, scopeToBranch, assertTenantContext } from "@/lib/db/tenant-context";
import {
  assertBranchAccess,
  hasPermission,
  AuthorizationError,
  isPlatformRole,
} from "@/lib/auth/session";
import {
  TenantContext,
  PaymentMethod,
  SaleItem,
} from "@/types";

const PAYMENT_METHODS: PaymentMethod[] = [
  "cash",
  "card",
  "bank_transfer",
  "mobile_wallet",
  "store_credit",
  "split",
];

export class SaleValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "SaleValidationError";
    this.statusCode = statusCode;
  }
}

export function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Rejects "ALL" / "ALL_BRANCHES" and empty branch ids. Sales must target a concrete branch.
 */
export function validateSaleBranchId(branchId: unknown): string {
  if (typeof branchId !== "string" || !branchId.trim()) {
    throw new SaleValidationError("A specific branch is required to create a sale.");
  }

  const normalized = branchId.trim();
  const blocked = ["ALL", "ALL_BRANCHES", "ALL BRANCHES"];
  if (blocked.includes(normalized.toUpperCase())) {
    throw new SaleValidationError(
      'Cannot create a sale for "All Branches". Select a specific branch.'
    );
  }

  return normalized;
}

/**
 * Sale actor identity is taken ONLY from the authenticated tenant context / session cashier.
 * Client-supplied businessId and cashier fields are ignored.
 */
export function resolveSaleActor(
  context: TenantContext,
  cashier: { userId: string; name: string },
  _clientBody?: Record<string, unknown>
): { businessId: string; cashierUserId: string; cashierName: string } {
  if (!context.businessId) {
    throw new SaleValidationError("Cannot determine target business for this sale.");
  }

  return {
    businessId: context.businessId,
    cashierUserId: cashier.userId,
    cashierName: cashier.name,
  };
}

export function generateInvoiceNumber(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `INV-${year}${month}${day}-${suffix}`;
}

type ClientSaleItem = {
  productId?: unknown;
  quantity?: unknown;
  discountAmount?: unknown;
  unitPrice?: unknown;
  price?: unknown;
  name?: unknown;
  sku?: unknown;
};

export interface CreateSaleClientBody {
  branchId?: unknown;
  items?: unknown;
  paymentMethod?: unknown;
  paidAmount?: unknown;
  discountAmount?: unknown;
  orderDiscount?: unknown;
  customerId?: unknown;
  customerName?: unknown;
  notes?: unknown;
  businessId?: unknown;
  cashierUserId?: unknown;
  cashierName?: unknown;
  subtotal?: unknown;
  grandTotal?: unknown;
  taxTotal?: unknown;
  [key: string]: unknown;
}

export interface ListSalesQuery {
  branchId?: string;
  cashierUserId?: string;
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

function parseQuantity(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) {
    throw new SaleValidationError("Each item quantity must be a positive finite number.");
  }
  if (n > 100000) {
    throw new SaleValidationError("Item quantity exceeds the allowed maximum.");
  }
  return money(n);
}

function parseMoneyField(value: unknown, label: string, required = true): number {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new SaleValidationError(`${label} is required.`);
    }
    return 0;
  }
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) {
    throw new SaleValidationError(`${label} must be a non-negative finite number.`);
  }
  return money(n);
}

function requireSalePermission(context: TenantContext, permission: string): void {
  if (!hasPermission(context, permission)) {
    throw new AuthorizationError(`Forbidden: Lacks required permission "${permission}".`);
  }
}

export async function createSale(
  context: TenantContext,
  cashier: { userId: string; name: string },
  clientBody: CreateSaleClientBody
) {
  requireSalePermission(context, "POS_ACCESS");
  requireSalePermission(context, "SALE_CREATE");

  const actor = resolveSaleActor(context, cashier, clientBody);
  const branchId = validateSaleBranchId(clientBody.branchId);
  assertBranchAccess(context, branchId);

  if (!Array.isArray(clientBody.items) || clientBody.items.length === 0) {
    throw new SaleValidationError("At least one sale item is required.");
  }

  const paymentMethod = clientBody.paymentMethod;
  if (typeof paymentMethod !== "string" || !PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)) {
    throw new SaleValidationError("A valid payment method is required.");
  }

  const paidAmount = parseMoneyField(clientBody.paidAmount, "Paid amount");
  const orderDiscount = parseMoneyField(
    clientBody.discountAmount ?? clientBody.orderDiscount,
    "Discount",
    false
  );

  await connectToDatabase();

  const branch = await Branch.findOne({
    _id: branchId,
    businessId: actor.businessId,
  }).lean();

  if (!branch || branch.status === "inactive" || branch.isActive === false) {
    throw new SaleValidationError("Selected branch is invalid or does not belong to this business.");
  }

  const business = await Business.findById(actor.businessId).lean();
  const enableTaxes = Boolean(business?.settings?.enableTaxes);
  const taxRate = Number(business?.settings?.taxRate || 0);

  const rawItems = clientBody.items as ClientSaleItem[];
  const productIds = rawItems.map((item) => {
    if (typeof item.productId !== "string" || !item.productId.trim()) {
      throw new SaleValidationError("Each item must include a productId.");
    }
    return item.productId.trim();
  });

  const uniqueIds = Array.from(new Set(productIds));
  if (uniqueIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    throw new SaleValidationError("One or more products are invalid, inactive, or not in this business.");
  }
  const products = await Product.find({
    _id: { $in: uniqueIds },
    businessId: actor.businessId,
  });

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const snapshotItems: SaleItem[] = [];

  for (const raw of rawItems) {
    const productId = String(raw.productId).trim();
    const product = productMap.get(productId);

    if (
      !product ||
      product.businessId !== actor.businessId ||
      product.status !== "active" ||
      product.isActive === false
    ) {
      throw new SaleValidationError("One or more products are invalid, inactive, or not in this business.");
    }

    const quantity = parseQuantity(raw.quantity);
    const lineDiscount = parseMoneyField(raw.discountAmount, "Item discount", false);
    const unitPrice = money(Number(product.sellingPrice || product.price || 0));
    const costPrice = money(Number(product.costPrice || 0));
    const lineSubtotal = money(unitPrice * quantity);

    if (lineDiscount > lineSubtotal) {
      throw new SaleValidationError(`Discount on "${product.name}" cannot exceed the line subtotal.`);
    }

    snapshotItems.push({
      productId,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      unitPrice,
      costPrice,
      quantity,
      discountAmount: lineDiscount,
      taxAmount: 0,
      subtotal: lineSubtotal,
      total: money(lineSubtotal - lineDiscount),
    });
  }

  const itemsSubtotal = money(snapshotItems.reduce((sum, item) => sum + item.subtotal, 0));
  const lineDiscountTotal = money(snapshotItems.reduce((sum, item) => sum + item.discountAmount, 0));
  const remainingAfterLineDiscounts = money(itemsSubtotal - lineDiscountTotal);

  if (orderDiscount > remainingAfterLineDiscounts) {
    throw new SaleValidationError("Order discount cannot exceed the sale subtotal after line discounts.");
  }

  // Distribute order-level discount across lines for tax base / line totals.
  let remainingOrderDiscount = orderDiscount;
  const itemsWithOrderDiscount = snapshotItems.map((item, index) => {
    const isLast = index === snapshotItems.length - 1;
    const lineNet = money(item.subtotal - item.discountAmount);
    const share = isLast
      ? remainingOrderDiscount
      : remainingAfterLineDiscounts > 0
        ? money((lineNet / remainingAfterLineDiscounts) * orderDiscount)
        : 0;
    remainingOrderDiscount = money(remainingOrderDiscount - share);
    const discountAmount = money(item.discountAmount + share);
    const taxableBase = money(item.subtotal - discountAmount);
    const taxExempt = Boolean(productMap.get(item.productId)?.taxExempt);
    const taxAmount =
      enableTaxes && taxRate > 0 && !taxExempt ? money(taxableBase * (taxRate / 100)) : 0;

    return {
      ...item,
      discountAmount,
      taxAmount,
      total: money(taxableBase + taxAmount),
    };
  });

  const discountTotal = money(lineDiscountTotal + orderDiscount);
  const taxTotal = money(itemsWithOrderDiscount.reduce((sum, item) => sum + item.taxAmount, 0));
  const grandTotal = money(itemsSubtotal - discountTotal + taxTotal);

  if (paidAmount < grandTotal) {
    throw new SaleValidationError("Paid amount is insufficient to complete this sale.");
  }

  const changeAmount =
    paymentMethod === "cash" ? money(Math.max(0, paidAmount - grandTotal)) : 0;

  const customerName =
    typeof clientBody.customerName === "string" && clientBody.customerName.trim()
      ? clientBody.customerName.trim()
      : undefined;
  const customerId =
    typeof clientBody.customerId === "string" && clientBody.customerId.trim()
      ? clientBody.customerId.trim()
      : undefined;
  const notes =
    typeof clientBody.notes === "string" && clientBody.notes.trim()
      ? clientBody.notes.trim()
      : undefined;

  let created = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      created = await Sale.create({
        businessId: actor.businessId,
        branchId,
        invoiceNumber: generateInvoiceNumber(),
        cashierUserId: actor.cashierUserId,
        cashierName: actor.cashierName,
        customerId,
        customerName,
        items: itemsWithOrderDiscount,
        subtotal: itemsSubtotal,
        discountTotal,
        taxTotal,
        grandTotal,
        paidAmount,
        changeAmount,
        paymentMethod,
        paymentStatus: "paid",
        status: "completed",
        notes,
      });
      break;
    } catch (error) {
      const code = (error as { code?: number }).code;
      if (code === 11000 && attempt < 7) {
        continue;
      }
      throw error;
    }
  }

  if (!created) {
    throw new SaleValidationError("Failed to generate a unique invoice number. Please try again.");
  }

  await logAuditEvent({
    businessId: actor.businessId,
    branchId,
    userId: actor.cashierUserId,
    userName: actor.cashierName,
    userRole: context.role,
    action: "SALE_CREATED",
    entityType: "Sale",
    entityId: created._id.toString(),
    description: `Created sale ${created.invoiceNumber} for ${money(grandTotal)}.`,
    metadata: {
      invoiceNumber: created.invoiceNumber,
      branchId,
      itemCount: itemsWithOrderDiscount.length,
      subtotal: itemsSubtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      paidAmount,
      changeAmount,
      paymentMethod,
      paymentStatus: "paid",
      status: "completed",
    },
  });

  return created.toObject();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listSales(context: TenantContext, query: ListSalesQuery = {}) {
  requireSalePermission(context, "SALE_VIEW");

  const isPlatform = isPlatformRole(context.role);
  if (!isPlatform) {
    assertTenantContext(context);
  }

  await connectToDatabase();

  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 50));

  let filter: Record<string, unknown> = {};

  if (isPlatform) {
    if (query.branchId && query.branchId !== "ALL") {
      filter.branchId = query.branchId;
    }
  } else {
    const requestedBranch =
      query.branchId && query.branchId !== "ALL" ? query.branchId : undefined;
    if (requestedBranch) {
      assertBranchAccess(context, requestedBranch);
    }
    filter = scopeToBranch(context, requestedBranch || query.branchId, filter);
  }

  const canViewOtherCashiers = hasPermission(context, "SALE_VIEW_OTHER_CASHIERS");
  if (!canViewOtherCashiers) {
    filter.cashierUserId = context.userId;
  } else if (query.cashierUserId) {
    filter.cashierUserId = query.cashierUserId;
  }

  if (query.search && query.search.trim()) {
    const rx = new RegExp(escapeRegex(query.search.trim()), "i");
    filter.$or = [
      { invoiceNumber: rx },
      { cashierName: rx },
      { customerName: rx },
    ];
  }

  if (query.dateFrom || query.dateTo) {
    const createdAt: Record<string, Date> = {};
    if (query.dateFrom) {
      const from = new Date(query.dateFrom);
      if (!Number.isNaN(from.getTime())) {
        createdAt.$gte = from;
      }
    }
    if (query.dateTo) {
      const to = new Date(query.dateTo);
      if (!Number.isNaN(to.getTime())) {
        createdAt.$lte = to;
      }
    }
    if (Object.keys(createdAt).length > 0) {
      filter.createdAt = createdAt;
    }
  }

  const skip = (page - 1) * limit;
  const [sales, total] = await Promise.all([
    Sale.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Sale.countDocuments(filter),
  ]);

  return {
    sales,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getSaleById(context: TenantContext, saleId: string) {
  requireSalePermission(context, "SALE_VIEW");

  if (!mongoose.Types.ObjectId.isValid(saleId)) {
    throw new SaleValidationError("Sale not found.", 404);
  }

  const isPlatform = isPlatformRole(context.role);
  if (!isPlatform) {
    assertTenantContext(context);
  }

  await connectToDatabase();

  const filter: Record<string, unknown> = { _id: saleId };
  if (!isPlatform) {
    Object.assign(filter, scopeToTenant(context, {}));
  }

  const sale = await Sale.findOne(filter).lean();
  if (!sale) {
    throw new SaleValidationError("Sale not found.", 404);
  }

  try {
    assertBranchAccess(context, sale.branchId);
  } catch {
    throw new SaleValidationError("Sale not found.", 404);
  }

  const canViewOtherCashiers = hasPermission(context, "SALE_VIEW_OTHER_CASHIERS");
  if (!canViewOtherCashiers && sale.cashierUserId !== context.userId) {
    throw new SaleValidationError("Sale not found.", 404);
  }

  return sale;
}

export async function findSaleCreatedAudit(saleId: string) {
  await connectToDatabase();
  return AuditLog.findOne({ action: "SALE_CREATED", entityType: "Sale", entityId: saleId }).lean();
}

