import { TenantContext } from "@/types";
import { Branch } from "@/models/Branch";
import { Product } from "@/models/Product";
import { Sale } from "@/models/Sale";
import { connectToDatabase } from "@/lib/db/connection";
import { buildAuthorizedBranchQuery } from "@/lib/branches/branch-service";
import { buildSalesQuery, listSales } from "@/lib/sales/sale-service";
import { hasPermission } from "@/lib/auth/session";
import { scopeToTenant } from "@/lib/db/tenant-context";

export async function getDashboardData(context: TenantContext) {
  if (!context.businessId) {
    return {
      todaySalesTotal: null,
      todayOrdersCount: null,
      activeProductsCount: 0,
      authorizedBranchesCount: 0,
    };
  }

  await connectToDatabase();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const canViewSales = hasPermission(context, "SALE_VIEW");
  const salesMatch = canViewSales
    ? buildSalesQuery(context, undefined, {
        status: "completed",
        createdAt: { $gte: startOfDay, $lt: endOfDay },
      })
    : null;
  if (salesMatch && !hasPermission(context, "SALE_VIEW_OTHER_CASHIERS")) {
    salesMatch.cashierUserId = context.userId;
  }

  const [salesTotals, activeProducts, branches] = await Promise.all([
    salesMatch
      ? Sale.aggregate([
          {
            $match: salesMatch,
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$grandTotal" },
              orders: { $sum: 1 },
            },
          },
        ])
      : Promise.resolve([]),
    Product.countDocuments(scopeToTenant(context, { status: "active" })),
    Branch.find(buildAuthorizedBranchQuery(context)).select({ _id: 1 }).lean(),
  ]);

  return {
    todaySalesTotal: canViewSales ? salesTotals[0]?.total || 0 : null,
    todayOrdersCount: canViewSales ? salesTotals[0]?.orders || 0 : null,
    activeProductsCount: activeProducts,
    authorizedBranchesCount: branches.length,
  };
}

export async function getRecentSales(context: TenantContext) {
  if (!context.businessId || !hasPermission(context, "SALE_VIEW")) return [];

  const { sales } = await listSales(context, { limit: 5 });
  if (sales.length === 0) return [];

  const branchIds = Array.from(new Set(sales.map((sale) => sale.branchId)));
  const branchQuery = buildAuthorizedBranchQuery(context, branchIds);
  const branches = await Branch.find(branchQuery).select({ name: 1 }).lean();
  const branchNames = new Map(branches.map((branch) => [branch._id.toString(), branch.name]));

  return sales.map((sale) => ({
    ...sale,
    _id: sale._id.toString(),
    branchName: branchNames.get(sale.branchId) || "Unknown Branch",
    itemCount: sale.items?.length || 0,
  }));
}