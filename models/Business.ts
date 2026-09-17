import mongoose, { Schema, Document, Model } from "mongoose";
import { Business as IBusiness } from "@/types";

export interface BusinessDocument extends Omit<IBusiness, "_id">, Document {}

const BusinessSettingsSchema = new Schema(
  {
    currency: { type: String, default: "USD", uppercase: true },
    currencySymbol: { type: String, default: "$" },
    taxRate: { type: Number, default: 0 },
    enableTaxes: { type: Boolean, default: false },
    receiptHeader: { type: String },
    receiptFooter: { type: String },
    lowStockThresholdDefault: { type: Number, default: 5 },
  },
  { _id: false }
);

const AddressSchema = new Schema(
  {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String },
  },
  { _id: false }
);

const BusinessSchema = new Schema<BusinessDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    industry: {
      type: String,
      enum: [
        "phones_electronics",
        "clothing_fashion",
        "car_accessories",
        "grocery",
        "electronics",
        "general_retail",
      ],
      required: true,
    },
    ownerUserId: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    address: AddressSchema,
    subscriptionTier: {
      type: String,
      enum: ["TRIAL", "STARTER", "BUSINESS", "PRO"],
      default: "TRIAL",
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "trialing", "past_due", "canceled", "suspended"],
      default: "trialing",
    },
    subscriptionEndsAt: { type: Date },
    settings: { type: BusinessSettingsSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
  }
);

// Indexes for high performance multi-tenant lookups
BusinessSchema.index({ slug: 1 });
BusinessSchema.index({ isActive: 1, subscriptionStatus: 1 });

export const Business: Model<BusinessDocument> =
  mongoose.models.Business || mongoose.model<BusinessDocument>("Business", BusinessSchema);

export default Business;
