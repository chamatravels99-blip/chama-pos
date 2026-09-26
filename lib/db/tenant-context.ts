import { TenantContext } from "@/types";

/**
 * Server-Side Tenant Isolation Guard
 * 
 * Enforces multi-tenant data isolation:
 * 1. Business queries MUST always be scoped by validated businessId.
 * 2. businessId is NEVER trusted from client route params or request bodies.
 * 3. It must always be extracted from the authenticated server session.
 * 4. Branch queries enforce assigned branch access rules.
 */

export class TenantSecurityError extends Error {
  constructor(message: string = "Tenant authorization failed or tenant context missing.") {
    super(message);
    this.name = "TenantSecurityError";
  }
}

/**
 * Validates that a tenant context is present and has a valid non-null businessId.
 * Throws a TenantSecurityError if tenant context is missing.
 */
export function assertTenantContext(
  context?: Partial<TenantContext> | null
): asserts context is TenantContext & { businessId: string } {
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
 * Automatically enforces branch access:
 * - If user has ALL_BRANCHES / BUSINESS_OWNER: can query specific branch or all.
 * - If user has SELECTED_BRANCHES: query is restricted strictly to assigned branchIds.
 */
export function scopeToBranch<T extends Record<string, unknown>>(
  context: TenantContext,
  branchId?: string,
  query: T = {} as T
): T & { businessId: string; branchId?: unknown } {
  assertTenantContext(context);
  const scoped = scopeToTenant(context, query);

  const isAllBranches =
    context.role === "BUSINESS_OWNER" ||
    context.role === "PLATFORM_OWNER" ||
    context.role === "PLATFORM_ADMIN" ||
    context.role === "SUPER_ADMIN" ||
    context.branchAccess === "ALL_BRANCHES";

  if (branchId && branchId !== "ALL") {
    // Specific branch requested: verify user has access
    if (!isAllBranches && !(context.branchIds || []).includes(branchId)) {
      throw new TenantSecurityError(`Forbidden: User does not have access to branch "${branchId}".`);
    }
    return { ...scoped, branchId };
  }

  // If All branches requested or omitted:
  if (!isAllBranches) {
    // Restrict strictly to the user's assigned branches
    return { ...scoped, branchId: { $in: context.branchIds || [] } };
  }

  // Business Owner / All Branches: leave branchId unconstrained across the business
  return scoped;
}
