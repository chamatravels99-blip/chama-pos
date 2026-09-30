import { TenantContext } from "@/types";
import { Branch } from "@/models/Branch";
import { Product } from "@/models/Product";
import { StockMovementDocument } from "@/models/StockMovement";
import { User } from "@/models/User";
import { scopeToTenant } from "@/lib/db/tenant-context";

type MovementReference = Pick<StockMovementDocument, "productId" | "branchId" | "userId">;

export function buildMovementReferenceQueries(
  tenantContext: TenantContext,
  movements: MovementReference[]
) {
  const productIds = Array.from(new Set(movements.map((movement) => movement.productId)));
  const branchIds = Array.from(new Set(movements.map((movement) => movement.branchId)));
  const userIds = Array.from(new Set(movements.map((movement) => movement.userId)));
  const hasAllBranchAccess =
    tenantContext.role === "BUSINESS_OWNER" ||
    tenantContext.role === "PLATFORM_OWNER" ||
    tenantContext.role === "PLATFORM_ADMIN" ||
    tenantContext.role === "SUPER_ADMIN" ||
    tenantContext.branchAccess === "ALL_BRANCHES";
  const accessibleBranchIds = hasAllBranchAccess
    ? branchIds
    : branchIds.filter((branchId) => (tenantContext.branchIds || []).includes(branchId));

  return {
    products: scopeToTenant(tenantContext, { _id: { $in: productIds } }),
    branches: scopeToTenant(tenantContext, { _id: { $in: accessibleBranchIds } }),
    users: scopeToTenant(tenantContext, { _id: { $in: userIds } }),
  };
}

export function mapMovementNames<T extends MovementReference>(
  movements: T[],
  products: Array<{ _id: { toString(): string }; name: string }>,
  branches: Array<{ _id: { toString(): string }; name: string }>,
  users: Array<{ _id: { toString(): string }; name: string }>
) {
  const productNames = new Map(products.map((product) => [product._id.toString(), product.name]));
  const branchNames = new Map(branches.map((branch) => [branch._id.toString(), branch.name]));
  const userNames = new Map(users.map((user) => [user._id.toString(), user.name]));

  return movements.map((movement) => ({
    ...movement,
    productName: productNames.get(movement.productId) || "Unknown Product",
    branchName: branchNames.get(movement.branchId) || "Unknown Branch",
    userName: userNames.get(movement.userId) || "Unknown User",
  }));
}

export async function addMovementNames<T extends MovementReference>(
  tenantContext: TenantContext,
  movements: T[]
) {
  const queries = buildMovementReferenceQueries(tenantContext, movements);
  const [products, branches, users] = await Promise.all([
    Product.find(queries.products)
      .select({ name: 1 })
      .lean(),
    Branch.find(queries.branches)
      .select({ name: 1 })
      .lean(),
    User.find(queries.users)
      .select({ name: 1 })
      .lean(),
  ]);

  return mapMovementNames(movements, products, branches, users);
}