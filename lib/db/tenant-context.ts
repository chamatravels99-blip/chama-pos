import { TenantContext } from "@/types";

/**
 * Server-Side Tenant Isolation Guard
 * 
 * Enforces multi-tenant data isolation:
 * 1. Business queries MUST always be scoped by validated businessId.
 * 2. businessId is NEVER trusted from client route params or request bodies.
 * 3. It must always be extracted from the authenticated server session.
 */

export class TenantSecurityError extends Error {
  constructor(message: string = "Tenant authorization failed or tenant context missing.") {
    super(message);
    this.name = "TenantSecurityError";
  }
}

/**
 * Validates that a tenant context is present and valid.
 * Throws a TenantSecurityError if tenant context is missing.
 */
export function assertTenantContext(context?: Partial<TenantContext> | null): asserts context is TenantContext {
  if (!context || !context.businessId) {
    throw new TenantSecurityError("Forbidden: Operation rejected due to missing or invalid tenant context.");
  }
}

/**
 * Helper to build safe tenant-scoped MongoDB filter queries.
 * Guaranteed to attach the validated businessId filter to prevent data leakage.
 */
export function scopeToTenant<T extends Record<string, unknown>>(
  context: TenantContext,
  query: T = {} as T
): T & { businessId: string } {
  assertTenantContext(context);
  return {
    ...query,
    businessId: context.businessId,
  };
}

/**
 * Helper to build safe branch-and-tenant scoped MongoDB filter queries.
 */
export function scopeToBranch<T extends Record<string, unknown>>(
  context: TenantContext,
  branchId?: string,
  query: T = {} as T
): T & { businessId: string; branchId?: string } {
  assertTenantContext(context);
  const scoped = scopeToTenant(context, query);
  if (branchId) {
    return { ...scoped, branchId };
  }
  return scoped;
}
