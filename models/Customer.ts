import mongoose, { Document, Model, Schema } from "mongoose";

export type CustomerTypeValue = "REGULAR" | "BUSINESS";

export interface CustomerDocument extends Document {
  businessId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  customerType: CustomerTypeValue;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<CustomerDocument>(
  {
    businessId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    customerType: { type: String, enum: ["REGULAR", "BUSINESS"], default: "REGULAR", required: true },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CustomerSchema.index({ businessId:  1, phone: 1 });
CustomerSchema.index({ businessId: 1, name: 1 });

export const Customer: Model<CustomerDocument> =
  mongoose.models.Customer || mongoose.model<CustomerDocument>("Customer", CustomerSchema);

export default Customer;