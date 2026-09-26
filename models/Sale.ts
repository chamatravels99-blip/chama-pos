import mongoose, { Schema, Document, Model } from "mongoose";
import { Sale as ISale, PaymentMethod, SaleStatus } from "@/types";

export interface SaleDocument extends Omit<ISale, "_id">, Document {}

const SaleItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    variantId: { type: String },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    barcode: { type: String, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, default: 0, min: 0 },
    quantity: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, required: true, default: 0, min: 0 },
    taxAmount: { type: Number, required: true, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    serialOrImei: { type: String },
  },
  { _id: false }
);

const PAYMENT_METHODS: PaymentMethod[] = [
  "cash",
  "card",
  "bank_transfer",
  "mobile_wallet",
  "store_credit",
  "split",
];

const SALE_STATUSES: SaleStatus[] = ["completed", "parked", "voided", "refunded"];

const SaleSchema = new Schema<SaleDocument>(
  {
    businessId: {
      type: String,
      required: true,
      index: true,
    },
    branchId: {
      type: String,
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    cashierUserId: {
      type: String,
      required: true,
      index: true,
    },
    cashierName: {
      type: String,
      required: true,
      trim: true,
    },
    customerId: { type: String },
    customerName: { type: String, trim: true },
    items: {
      type: [SaleItemSchema],
      required: true,
      validate: {
        validator: (items: unknown[]) => Array.isArray(items) && items.length > 0,
        message: "A sale must contain at least one item.",
      },
    },
    subtotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, required: true, default: 0, min: 0 },
    taxTotal: { type: Number, required: true, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0 },
    changeAmount: { type: Number, required: true, default: 0, min: 0 },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "partial", "unpaid"],
      required: true,
      default: "paid",
    },
    status: {
      type: String,
      enum: SALE_STATUSES,
      required: true,
      default: "completed",
      index: true,
    },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

SaleSchema.index({ businessId: 1, createdAt: -1 });
SaleSchema.index({ businessId: 1, branchId: 1, createdAt: -1 });
SaleSchema.index({ businessId: 1, invoiceNumber: 1 }, { unique: true });
SaleSchema.index({ businessId: 1, cashierUserId: 1, createdAt: -1 });

export const Sale: Model<SaleDocument> =
  mongoose.models.Sale || mongoose.model<SaleDocument>("Sale", SaleSchema);

export default Sale;
