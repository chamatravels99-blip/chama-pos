import mongoose, { Document, Model, Schema } from "mongoose";

export type CashTransactionType = "OPENING_CASH" | "CASH_IN" | "CASH_OUT" | "EXPENSE";

export interface CashTransactionDocument extends Document {
  businessId: string;
  branchId: string;
  type: CashTransactionType;
  amount: number;
  description: string;
  category?: string;
  reference?: string;
  userId: string;
  openingDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CashTransactionSchema = new Schema<CashTransactionDocument>(
  {
    businessId: { type: String, required: true },
    branchId: { type: String, required: true },
    type: {
      type: String,
      enum: ["OPENING_CASH", "CASH_IN", "CASH_OUT", "EXPENSE"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0.01 },
    description: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    reference: { type: String, trim: true },
    userId: { type: String, required: true },
    openingDate: { type: String },
  },
  { timestamps: true }
);

CashTransactionSchema.index({ businessId: 1 });
CashTransactionSchema.index({ businessId: 1, branchId: 1 });
CashTransactionSchema.index({ businessId: 1, branchId: 1, createdAt: -1 });
CashTransactionSchema.index({ businessId: 1, type: 1 });
CashTransactionSchema.index(
  { businessId: 1, branchId: 1, openingDate: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "OPENING_CASH", openingDate: { $type: "string" } },
  }
);

export const CashTransaction: Model<CashTransactionDocument> =
  mongoose.models.CashTransaction ||
  mongoose.model<CashTransactionDocument>("CashTransaction", CashTransactionSchema);

export default CashTransaction;