import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLog {
  businessId: string | null;
  branchId?: string | null;
  userId: string;
  userName?: string;
  userRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AuditLogDocument extends Document, Omit<IAuditLog, "_id"> {}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    businessId: {
      type: String,
      default: null,
      index: true,
    },
    branchId: {
      type: String,
      default: null,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userName: {
      type: String,
    },
    userRole: {
      type: String,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for tenant audit querying
AuditLogSchema.index({ businessId: 1, createdAt: -1 });
AuditLogSchema.index({ businessId: 1, action: 1 });
AuditLogSchema.index({ businessId: 1, entityType: 1 });

export const AuditLog: Model<AuditLogDocument> =
  mongoose.models.AuditLog || mongoose.model<AuditLogDocument>("AuditLog", AuditLogSchema);

export default AuditLog;
