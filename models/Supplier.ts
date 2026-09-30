import mongoose, { Document, Model, Schema } from "mongoose";

export interface SupplierDocument extends Document {
  businessId: string;
  companyName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  category?: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<SupplierDocument>(
  {
    businessId: { type: String, required: true, index: true },
    companyName: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    category: { type: String, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

SupplierSchema.index({ businessId: 1, companyName: 1 });

export const Supplier: Model<SupplierDocument> =
  mongoose.models.Supplier || mongoose.model<SupplierDocument>("Supplier", SupplierSchema);

export default Supplier;