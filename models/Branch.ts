import mongoose, { Schema, Document, Model } from "mongoose";
import { Branch as IBranch } from "@/types";

export interface BranchDocument extends Omit<IBranch, "_id">, Document {}

const BranchSchema = new Schema<BranchDocument>(
  {
    businessId: {
      type: String,
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    phone: { type: String },
    email: { type: String, lowercase: true, trim: true },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String },
    },
    isMain: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Enforce unique branch code per business/tenant
BranchSchema.index({ businessId: 1, code: 1 }, { unique: true });
BranchSchema.index({ businessId: 1, isActive: 1 });

export const Branch: Model<BranchDocument> =
  mongoose.models.Branch || mongoose.model<BranchDocument>("Branch", BranchSchema);

export default Branch;
