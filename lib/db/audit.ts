import { AuditLog } from "@/models/AuditLog";

export interface LogAuditParams {
  businessId?: string | null;
  branchId?: string | null;
  userId: string;
  userName?: string;
  userRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Creates an immutable audit record in the database.
 * Automatically sanitizes any password or token fields to guarantee credentials are never logged.
 */
export async function logAuditEvent(params: LogAuditParams): Promise<void> {
  try {
    let sanitizedMetadata: Record<string, unknown> | undefined = undefined;

    if (params.metadata) {
      sanitizedMetadata = { ...params.metadata };
      // Strip any credential-bearing keys
      const sensitiveKeys = [
        "password",
        "passwordHash",
        "newPassword",
        "confirmPassword",
        "secret",
        "token",
      ];
      for (const key of sensitiveKeys) {
        if (key in sanitizedMetadata) {
          delete sanitizedMetadata[key];
        }
      }
    }

    await AuditLog.create({
      businessId: params.businessId ?? null,
      branchId: params.branchId ?? null,
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      description: params.description,
      metadata: sanitizedMetadata ?? {},
    });
  } catch (error) {
    console.error("Error creating audit log entry:", error instanceof Error ? error.message : error);
  }
}
