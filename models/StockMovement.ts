import mongoose, { Schema, Document, Model } from "mongoose";

export type StockMovementType =
  | "purchase_received"
  | "sale"
  | "sale_return"
  | "damaged"
  | "transfer_in"
  | "transfer_out"
  | "adjustment"
  | "audit";

export interface StockMovementDocument
  extends Document {
  businessId: string;
  branchId: string;
  productId: string;
  variantId?: string;
  type: StockMovementType;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  referenceId?: string;
  userId: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const STOCK_MOVEMENT_TYPES: StockMovementType[] = [
  "purchase_received",
  "sale",
  "sale_return",
  "damaged",
  "transfer_in",
  "transfer_out",
  "adjustment",
  "audit",
];

const StockMovementSchema = new Schema<StockMovementDocument>(
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
    productId: {
      type: String,
      required: true,
      index: true,
    },
    variantId: {
      type: String,
      index: true,
    },
    type: {
      type: String,
      enum: STOCK_MOVEMENT_TYPES,
      required: true,
      index: true,
    },
    quantityChange: {
      type: Number,
      required: true,
      validate: {
        validator: (value: number) => Number.isFinite(value) && value !== 0,
        message: "quantityChange must be a non-zero finite number.",
      },
    },
    previousQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    newQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    referenceId: {
      type: String,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Main tenant/branch inventory history queries
StockMovementSchema.index({
  businessId: 1,
  branchId: 1,
  createdAt: -1,
});

// Product stock history
StockMovementSchema.index({
  businessId: 1,
  productId: 1,
  createdAt: -1,
});

// Reference lookup, e.g. all stock movements for a sale
StockMovementSchema.index({
  businessId: 1,
  referenceId: 1,
});

// Tenant + movement type reporting
StockMovementSchema.index({
  businessId: 1,
  type: 1,
  createdAt: -1,
});

export const StockMovement: Model<StockMovementDocument> =
  mongoose.models.StockMovement ||
  mongoose.model<StockMovementDocument>(
    "StockMovement",
    StockMovementSchema
  );

export default StockMovement;