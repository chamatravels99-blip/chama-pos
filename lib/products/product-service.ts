import mongoose from "mongoose";
import { assertBranchAccess } from "@/lib/auth/session";
import { scopeToTenant } from "@/lib/db/tenant-context";
import { Branch } from "@/models/Branch";
import { Product } from "@/models/Product";
import { StockMovement } from "@/models/StockMovement";
import { TenantContext } from "@/types";

export class ProductCreationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ProductCreationError";
    this.statusCode = statusCode;
  }
}

export interface CreateProductInput {
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  categoryName?: string;
  brand?: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  status: "active" | "inactive";
  branchId: string;
  openingQuantity: number;
  lowStockThreshold: number;
}

export async function createProductWithOpeningStock(
  tenantContext: TenantContext,
  input: CreateProductInput
) {
  const tenant = scopeToTenant(tenantContext, {});

  if (!mongoose.Types.ObjectId.isValid(input.branchId)) {
    throw new ProductCreationError("Select a valid branch.");
  }
  if (!Number.isFinite(input.openingQuantity) || input.openingQuantity < 0) {
    throw new ProductCreationError("Opening quantity must be a non-negative finite number.");
  }
  if (!Number.isFinite(input.lowStockThreshold) || input.lowStockThreshold < 0) {
    throw new ProductCreationError("Low stock threshold must be a non-negative finite number.");
  }

  assertBranchAccess(tenantContext, input.branchId);

  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const branch = await Branch.findOne({
        _id: input.branchId,
        businessId: tenant.businessId,
        status: "active",
        isActive: { $ne: false },
      }).session(session);

      if (!branch) {
        throw new ProductCreationError("Branch not found, inactive, or does not belong to this business.", 404);
      }

      const existingProduct = await Product.findOne({
        businessId: tenant.businessId,
        sku: input.sku,
      }).session(session);
      if (existingProduct) {
        throw new ProductCreationError(`SKU "${input.sku}" already exists for this business.`, 409);
      }

      const product = new Product({
        businessId: tenant.businessId,
        name: input.name,
        sku: input.sku,
        barcode: input.barcode,
        description: input.description,
        categoryName: input.categoryName,
        brand: input.brand,
        unit: input.unit,
        costPrice: input.costPrice,
        price: input.sellingPrice,
        sellingPrice: input.sellingPrice,
        status: input.status,
        hasVariants: false,
        stockByBranch: [{
          branchId: branch._id.toString(),
          quantity: input.openingQuantity,
          lowStockThreshold: input.lowStockThreshold,
        }],
      });
      await product.save({ session });

      if (input.openingQuantity > 0) {
        await StockMovement.create(
          [{
            businessId: tenant.businessId,
            branchId: branch._id.toString(),
            productId: product._id.toString(),
            type: "opening_stock",
            quantityChange: input.openingQuantity,
            previousQuantity: 0,
            newQuantity: input.openingQuantity,
            referenceId: product._id.toString(),
            userId: tenantContext.userId,
            notes: "Opening stock",
          }],
          { session }
        );
      }

      return product;
    });
  } finally {
    await session.endSession();
  }
}