import mongoose, { Schema, Document, Model } from "mongoose";
import { Product as IProduct } from "@/types";

export interface ProductDocument extends Omit<IProduct, "_id">, Document {}

const BranchStockSchema = new Schema(
  {
    branchId: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
  },
  { _id: false }
);

const ProductVariantSchema = new Schema(
  {
    sku: { type: String, required: true },
    barcode: { type: String },
    name: { type: String, required: true },
    costPrice: { type: Number, required: true, default: 0 },
    sellingPrice: { type: Number, required: true, default: 0 },
    stockByBranch: [BranchStockSchema],
    attributes: { type: Map, of: Schema.Types.Mixed, default: {} },
  },
  { _id: true }
);

const ProductSchema = new Schema<ProductDocument>(
  {
    businessId: {
      type: String,
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    barcode: { type: String, trim: true },
    description: { type: String },
    categoryId: { type: String, index: true },
    categoryName: { type: String },
    brand: { type: String },
    unit: { type: String, default: "pcs" },
    costPrice: { type: Number, required: true, default: 0 },
    sellingPrice: { type: Number, required: true, default: 0 },
    taxExempt: { type: Boolean, default: false },
    hasVariants: { type: Boolean, default: false },
    variants: [ProductVariantSchema],
    industryAttributes: {
      type: Schema.Types.Mixed,
      default: {},
    },
    stockByBranch: [BranchStockSchema],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Compound indexes strictly isolating products by tenant
ProductSchema.index({ businessId: 1, sku: 1 }, { unique: true });
ProductSchema.index({ businessId: 1, barcode: 1 }, { sparse: true });
ProductSchema.index({ businessId: 1, categoryId: 1 });
ProductSchema.index({ businessId: 1, isActive: 1 });

export const Product: Model<ProductDocument> =
  mongoose.models.Product || mongoose.model<ProductDocument>("Product", ProductSchema);

export default Product;
