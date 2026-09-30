import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import { Product } from "@/models/Product";
import { Branch } from "@/models/Branch";
import {
  requireEffectiveTenantContext,
  assertEffectiveBusinessId,
  requirePermission,
  AuthorizationError,
  AuthenticationError,
  resolveRequestedBranch,
} from "@/lib/auth/session";
import { scopeToTenant } from "@/lib/db/tenant-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const tenantContext = await requireEffectiveTenantContext();
    await requirePermission("STOCK_VIEW");
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    assertEffectiveBusinessId(tenantContext, searchParams.get("businessId"));
    const selectedBranch = resolveRequestedBranch(tenantContext, searchParams.get("branchId") || undefined);
    const search = searchParams.get("search")?.trim() || "";
    const lowOnly = searchParams.get("lowOnly") === "true";

    const businessQuery = scopeToTenant(tenantContext, {});

    const productQuery = {
      ...businessQuery,
      ...(search ? { $or: [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
      ] } : {}),
      status: "active",
      isActive: { $ne: false },
    };

    const products = await Product.find(productQuery).lean();
    const branches = await Branch.find(
      {
        businessId: tenantContext.businessId,
        status: "active",
        isActive: { $ne: false },
      }
    ).lean();

    const branchMap = new Map(branches.map((branch) => [branch._id.toString(), branch.name]));

    const rows: any[] = [];

    for (const product of products) {
      const candidateVariants = product.variants || [];

      const productBranchEntries = (product.stockByBranch || []).filter((entry) => {
        if (selectedBranch && selectedBranch !== "ALL") {
          return entry.branchId === selectedBranch;
        }
        if (tenantContext.branchAccess !== "ALL_BRANCHES" && tenantContext.role !== "BUSINESS_OWNER" && !tenantContext.branchIds?.length) {
          return false;
        }
        if (tenantContext.role === "BUSINESS_OWNER" || tenantContext.branchAccess === "ALL_BRANCHES") {
          return true;
        }
        return (tenantContext.branchIds || []).includes(entry.branchId);
      });

      const productEntries = productBranchEntries.length > 0 ? productBranchEntries : [];
      if (productEntries.length === 0 && candidateVariants.length === 0) continue;

      if (!product.hasVariants && productEntries.length > 0) {
        for (const entry of productEntries) {
          const currentStock = Number(entry.quantity || 0);
          const threshold = Number(entry.lowStockThreshold ?? 5);
          if (lowOnly && currentStock > threshold) continue;
          rows.push({
            productId: product._id.toString(),
            variantId: null,
            productName: product.name,
            sku: product.sku,
            barcode: product.barcode,
            branchId: entry.branchId,
            branchName: branchMap.get(entry.branchId) || "Unknown Branch",
            stock: currentStock,
            lowStockThreshold: threshold,
            costPrice: Number(product.costPrice || 0),
            sellingPrice: Number(product.sellingPrice ?? product.price ?? 0),
            isLowStock: currentStock <= threshold,
            hasVariants: false,
            variantName: null,
          });
        }
      }

      if (candidateVariants.length > 0) {
        for (const variant of candidateVariants) {
          const variantEntries = (variant.stockByBranch || []).filter((entry) => {
            if (selectedBranch && selectedBranch !== "ALL") {
              return entry.branchId === selectedBranch;
            }
            if (tenantContext.role === "BUSINESS_OWNER" || tenantContext.branchAccess === "ALL_BRANCHES" || tenantContext.role === "PLATFORM_ADMIN" || tenantContext.role === "PLATFORM_OWNER" || tenantContext.role === "SUPER_ADMIN") {
              return true;
            }
            return (tenantContext.branchIds || []).includes(entry.branchId);
          });

          if (variantEntries.length === 0) continue;

          for (const entry of variantEntries) {
            const currentStock = Number(entry.quantity || 0);
            const threshold = Number(entry.lowStockThreshold ?? 5);
            if (lowOnly && currentStock > threshold) continue;
            rows.push({
              productId: product._id.toString(),
              variantId: variant._id?.toString(),
              productName: product.name,
              sku: variant.sku || product.sku,
              barcode: variant.barcode || product.barcode,
              branchId: entry.branchId,
              branchName: branchMap.get(entry.branchId) || "Unknown Branch",
              stock: currentStock,
              lowStockThreshold: threshold,
              costPrice: Number(variant.costPrice || product.costPrice || 0),
              sellingPrice: Number(variant.sellingPrice ?? variant.price ?? product.sellingPrice ?? product.price ?? 0),
              isLowStock: currentStock <= threshold,
              hasVariants: true,
              variantName: variant.name,
            });
          }
        }
      }
    }

    const summary = {
      totalProducts: new Set(rows.map((row) => row.productId)).size,
      totalStockUnits: rows.reduce((sum, row) => sum + Number(row.stock || 0), 0),
      lowStockItems: rows.filter((row) => row.isLowStock).length,
      stockValue: rows.reduce((sum, row) => sum + (Number(row.stock || 0) * Number(row.costPrice || 0)), 0),
    };

    return NextResponse.json({
      success: true,
      branchId: selectedBranch || "ALL",
      rows,
      summary,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("GET /api/inventory error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to retrieve inventory." }, { status: 500 });
  }
}
