import { TenantContext } from "@/types";
import { Branch } from "@/models/Branch";
import { connectToDatabase } from "@/lib/db/connection";
import { scopeToTenant } from "@/lib/db/tenant-context";

export function buildAuthorizedBranchQuery(context: TenantContext, branchIds?: string[]) {
  const query = scopeToTenant(context, { status: "active" }) as Record<string, unknown>;
  const canAccessAllBranches =
    context.role === "BUSINESS_OWNER" ||
    context.role === "PLATFORM_OWNER" ||
    context.role === "PLATFORM_ADMIN" ||
    context.role === "SUPER_ADMIN" ||
    context.branchAccess === "ALL_BRANCHES";

  const requestedIds = branchIds ? new Set(branchIds) : undefined;
  if (!canAccessAllBranches) {
    query._id = { $in: (context.branchIds || []).filter((id) => !requestedIds || requestedIds.has(id)) };
  } else if (requestedIds) {
    query._id = { $in: Array.from(requestedIds) };
  }

  return query;
}

export async function listAuthorizedBranches(context: TenantContext) {
  if (!context.businessId) return [];
  await connectToDatabase();
  return Branch.find(buildAuthorizedBranchQuery(context))
    .sort({ isMain: -1, name: 1 })
    .lean();
}