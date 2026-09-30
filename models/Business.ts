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
    defaultPrintFormat: {
  type: String,
  enum: ["80mm", "A4"],
  default: "80mm",
},
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
    businessType: {
      type: String,
      required: true,
      trim: true,
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
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
      index: true,
    },
    ownerUserId: { type: String, index: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String },
    address: AddressSchema,
    subscriptionTier: {
      type: String,
      enum: ["TRIAL", "STARTER", "BUSINESS", "PRO"],
      default: "TRIAL",
    },
    subscriptionStatus: {
      type: String,
      default: "active",
    },
    settings: { type: BusinessSettingsSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);


export const Business: Model<BusinessDocument> =
  mongoose.models.Business || mongoose.model<BusinessDocument>("Business", BusinessSchema);

export default Business;
