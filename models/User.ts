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
    branchIds: {
      type: [String],
      default: [],
    },
    assignedBranchIds: {
      type: [String],
      default: [],
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: [
        "PLATFORM_ADMIN",
        "BUSINESS_OWNER",
        "MANAGER",
        "CASHIER",
        "STOCK_MANAGER",
        "ACCOUNTANT",
        "SUPER_ADMIN",
      ],
      default: "CASHIER",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    avatarUrl: { type: String },
    phone: { type: String },
    permissions: {
      type: [String],
      default: [],
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Compound index for user lookups within a business
UserSchema.index({ businessId: 1, email: 1 });
UserSchema.index({ businessId: 1, status: 1 });

export const User: Model<UserDocument> =
  mongoose.models.User || mongoose.model<UserDocument>("User", UserSchema);

export default User;
