import mongoose, { Schema, Document, Model } from "mongoose";
import { User as IUser, UserRole } from "@/types";

export interface UserDocument extends Omit<IUser, "_id">, Document {
  passwordHash: string;
}

const UserSchema = new Schema<UserDocument>(
  {
    businessId: {
      type: String,
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: [
        "SUPER_ADMIN",
        "BUSINESS_OWNER",
        "MANAGER",
        "CASHIER",
        "STOCK_MANAGER",
        "ACCOUNTANT",
      ],
      default: "CASHIER",
      required: true,
      index: true,
    },
    avatarUrl: { type: String },
    phone: { type: String },
    assignedBranchIds: {
      type: [String],
      default: [],
    },
    permissions: {
      type: [String],
      default: [],
    },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Compound index for user lookups within a business
UserSchema.index({ businessId: 1, email: 1 }, { unique: true });
UserSchema.index({ email: 1 }); // For super-admin & global login lookups

export const User: Model<UserDocument> =
  mongoose.models.User || mongoose.model<UserDocument>("User", UserSchema);

export default User;
