import mongoose from "mongoose";
import { Product } from "@/models/Product";
import { StockMovement, StockMovementType } from "@/models/StockMovement";

export class StockValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "StockValidationError";
    this.statusCode = statusCode;
  }
}

export interface DeductStockInput {
  businessId: string;
  branchId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  referenceId: string;
  userId: string;
  notes?: string;
}

export interface AdjustStockInput {
  businessId: string;
  branchId: string;
  productId: string;
  variantId?: string;
  quantityChange: number;
  type: StockMovementType;
  userId: string;
  referenceId?: string;
  notes?: string;
}

function validatePositiveQuantity(quantity: number): void {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new StockValidationError(
      "Stock quantity must be a positive finite number."
    );
  }
}

function findBranchStock(
  stockByBranch: Array<{
    branchId: string;
    quantity: number;
    lowStockThreshold?: number;
  }> | undefined,
  branchId: string
) {
  return stockByBranch?.find((stock) => stock.branchId === branchId);
}

function resolveTargetStock(
  product: any,
  branchId: string,
  variantId?: string,
  options: { createIfMissing?: boolean } = {}
) {
  const createIfMissing = options.createIfMissing ?? false;

  if (variantId) {
    const variant = product.variants?.find((item: any) => item._id?.toString() === variantId);
    if (!variant) {
      throw new StockValidationError("Product variant not found.");
    }

    let branchStock = findBranchStock(variant.stockByBranch, branchId);
    if (!branchStock) {
      if (!createIfMissing) {
        throw new StockValidationError("No stock record exists for this product variant at the selected branch.");
      }

      branchStock = { branchId, quantity: 0, lowStockThreshold: 5 };
      if (!variant.stockByBranch) variant.stockByBranch = [];
      variant.stockByBranch.push(branchStock);
    }

    return {
      targetLabel: `${product.name} - ${variant.name}`,
      stockList: variant.stockByBranch,
      branchStock,
      variant,
    };
  }

  let branchStock = findBranchStock(product.stockByBranch, branchId);
  if (!branchStock) {
    if (!createIfMissing) {
      throw new StockValidationError("No stock record exists for this product at the selected branch.");
    }

    branchStock = { branchId, quantity: 0, lowStockThreshold: 5 };
    if (!product.stockByBranch) product.stockByBranch = [];
    product.stockByBranch.push(branchStock);
  }

  return {
    targetLabel: product.name,
    stockList: product.stockByBranch,
    branchStock,
    variant: null,
  };
}

export async function adjustStock(
  input: AdjustStockInput,
  session: mongoose.ClientSession
): Promise<{ previousQuantity: number; newQuantity: number; type: StockMovementType }> {
  if (!Number.isFinite(input.quantityChange) || input.quantityChange === 0) {
    throw new StockValidationError("Stock quantity must be a non-zero finite number.");
  }

  if (!input.businessId?.trim()) {
    throw new StockValidationError("Business is required.");
  }

  if (!input.branchId?.trim()) {
    throw new StockValidationError("Branch is required.");
  }

  if (!mongoose.Types.ObjectId.isValid(input.productId)) {
    throw new StockValidationError("Invalid product.");
  }

  if (input.variantId && !mongoose.Types.ObjectId.isValid(input.variantId)) {
    throw new StockValidationError("Invalid variantId.");
  }

  const allowedMovementTypes: StockMovementType[] = [
    "opening_stock",
    "purchase_received",
    "sale",
    "sale_return",
    "damaged",
    "transfer_in",
    "transfer_out",
    "adjustment",
    "audit",
  ];

  if (!allowedMovementTypes.includes(input.type)) {
    throw new StockValidationError("Invalid stock adjustment type.");
  }

  const product = await Product.findOne({
    _id: input.productId,
    businessId: input.businessId,
    status: "active",
    isActive: { $ne: false },
  }).session(session);

  if (!product) {
    throw new StockValidationError("Product not found, inactive, or does not belong to this business.");
  }

  const target = resolveTargetStock(product, input.branchId, input.variantId);
  const previousQuantity = Number(target.branchStock.quantity || 0);
  const newQuantity = previousQuantity + input.quantityChange;

  if (newQuantity < 0) {
    throw new StockValidationError("Insufficient stock.");
  }

  target.branchStock.quantity = newQuantity;
  await product.save({ session });

  await StockMovement.create(
    [{
      businessId: input.businessId,
      branchId: input.branchId,
      productId: input.productId,
      variantId: input.variantId,
      type: input.type,
      quantityChange: input.quantityChange,
      previousQuantity,
      newQuantity,
      referenceId: input.referenceId,
      userId: input.userId,
      notes: input.notes,
    }],
    { session }
  );

  return { previousQuantity, newQuantity, type: input.type };
}

/**
 * Deducts stock for a completed sale.
 *
 * Product.stockByBranch / Product.variants[].stockByBranch
 * remains the single source of truth for current stock.
 *
 * StockMovement is the immutable history/ledger of the change.
 */
export async function deductStock(
  input: DeductStockInput,
  session: mongoose.ClientSession
): Promise<void> {
  validatePositiveQuantity(input.quantity);

  if (!input.businessId?.trim()) {
    throw new StockValidationError("Business is required.");
  }

  if (!input.branchId?.trim()) {
    throw new StockValidationError("Branch is required.");
  }

  if (!mongoose.Types.ObjectId.isValid(input.productId)) {
    throw new StockValidationError("Invalid product.");
  }

  const product = await Product.findOne({
    _id: input.productId,
    businessId: input.businessId,
    status: "active",
    isActive: { $ne: false },
  }).session(session);

  if (!product) {
    throw new StockValidationError(
      "Product not found, inactive, or does not belong to this business."
    );
  }

  const target = resolveTargetStock(product, input.branchId, input.variantId);
  const previousQuantity = Number(target.branchStock.quantity || 0);

  if (previousQuantity < input.quantity) {
    throw new StockValidationError(
      `Insufficient stock for "${target.targetLabel}". Available: ${previousQuantity}, requested: ${input.quantity}.`
    );
  }

  const newQuantity = previousQuantity - input.quantity;
  target.branchStock.quantity = newQuantity;

  if (newQuantity < 0) {
    throw new StockValidationError("Stock cannot become negative.");
  }

  await product.save({ session });

  await StockMovement.create(
    [
      {
        businessId: input.businessId,
        branchId: input.branchId,
        productId: input.productId,
        variantId: input.variantId,
        type: "sale" satisfies StockMovementType,
        quantityChange: -input.quantity,
        previousQuantity,
        newQuantity,
        referenceId: input.referenceId,
        userId: input.userId,
        notes: input.notes,
      },
    ],
    { session }
  );
}