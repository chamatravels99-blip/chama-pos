import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import { Product } from "@/models/Product";
import {
  requireEffectiveTenantContext,
  assertEffectiveBusinessId,
  resolveRequestedBranch,
  requirePermission,
  AuthorizationError,
  AuthenticationError,
} from "@/lib/auth/session";
import { scopeToTenant } from "@/lib/db/tenant-context";
import { logAuditEvent } from "@/lib/db/audit";
import { createProductWithOpeningStock, ProductCreationError, scopeProductStock } from "@/lib/products/product-service";
import { TenantSecurityError } from "@/lib/db/tenant-context";

export const dynamic = "force-dynamic";

/**
 * GET /api/products
 * Returns all products scoped to the authenticated tenant.
 * Supports: ?search=, ?status=, ?category=, ?page=, ?limit=
 * Platform users must first select a business in the server-side context.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantContext = await requireEffectiveTenantContext();
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search")?.trim() || "";
    const statusFilter = searchParams.get("status") || "";
    const categoryFilter = searchParams.get("category")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    assertEffectiveBusinessId(tenantContext, searchParams.get("businessId"));
    const selectedBranchId = resolveRequestedBranch(tenantContext, searchParams.get("branchId") || undefined);
    const baseQuery: Record<string, unknown> = scopeToTenant(tenantContext, {});

    // Apply optional filters
    if (statusFilter && ["active", "inactive"].includes(statusFilter)) {
      baseQuery.status = statusFilter;
    }
    if (categoryFilter) {
      baseQuery.categoryName = { $regex: categoryFilter, $options: "i" };
    }
    if (search) {
      baseQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { categoryName: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(baseQuery).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(baseQuery),
    ]);

    return NextResponse.json({
      success: true,
      products: products.map((product) => scopeProductStock(product, tenantContext, selectedBranchId)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("GET /api/products error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to retrieve products." }, { status: 500 });
  }
}

/**
 * POST /api/products
 * Creates a new product strictly within the authenticated tenant.
 * businessId is ALWAYS taken from the effective server-side tenant context.
 * Requires PRODUCT_CREATE permission.
 */
export async function POST(request: NextRequest) {
  try {
    const tenantContext = await requireEffectiveTenantContext();
    await requirePermission("PRODUCT_CREATE");

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid product data." }, { status: 400 });
    }
    if (Object.prototype.hasOwnProperty.call(body, "businessId")) {
      if (typeof body.businessId !== "string") {
        return NextResponse.json({ error: "Invalid business context." }, { status: 400 });
      }
      assertEffectiveBusinessId(tenantContext, body.businessId);
    }

    // --- Server-side validation ---
    const { name, sku, costPrice, sellingPrice, status, description, categoryName, brand, unit, barcode } = body;
    const requestedBranchId = typeof body.branchId === "string" ? body.branchId.trim() : "";
    const branchId = resolveRequestedBranch(tenantContext, requestedBranchId) || "";
    const openingQuantity = body.openingQuantity === undefined ? 0 : body.openingQuantity;
    const lowStockThreshold = body.lowStockThreshold === undefined ? 5 : body.lowStockThreshold;

    const errors: string[] = [];
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      errors.push("Product name is required.");
    }
    if (!sku || typeof sku !== "string" || sku.trim().length === 0) {
      errors.push("SKU is required.");
    }
    if (costPrice === undefined || costPrice === null || !Number.isFinite(Number(costPrice)) || Number(costPrice) < 0) {
      errors.push("Cost price must be a non-negative number.");
    }
    if (sellingPrice === undefined || sellingPrice === null || !Number.isFinite(Number(sellingPrice)) || Number(sellingPrice) < 0) {
      errors.push("Selling price must be a non-negative number.");
    }
    if (!branchId) {
      errors.push("Branch is required.");
    }
    if (typeof openingQuantity !== "number" || !Number.isFinite(openingQuantity) || openingQuantity < 0) {
      errors.push("Opening quantity must be a non-negative finite number.");
    }
    if (typeof lowStockThreshold !== "number" || !Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
      errors.push("Low stock threshold must be a non-negative finite number.");
    }
    if (body.hasVariants === true || (Array.isArray(body.variants) && body.variants.length > 0)) {
      errors.push("Variant products are not supported by this product creation form.");
    }
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(" "), errors }, { status: 400 });
    }

    await connectToDatabase();

    const product = await createProductWithOpeningStock(tenantContext, {
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      barcode: typeof barcode === "string" ? barcode.trim() || undefined : undefined,
      description: typeof description === "string" ? description.trim() || undefined : undefined,
      categoryName: typeof categoryName === "string" ? categoryName.trim() || undefined : undefined,
      brand: typeof brand === "string" ? brand.trim() || undefined : undefined,
      unit: typeof unit === "string" ? unit.trim() || "pcs" : "pcs",
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      status: ["active", "inactive"].includes(status) ? status : "active",
      branchId,
      openingQuantity,
      lowStockThreshold,
    });

    // Audit log
    await logAuditEvent({
      businessId: product.businessId,
      userId: tenantContext.userId,
      userName: tenantContext.businessName || "Staff User",
      userRole: tenantContext.role,
      action: "PRODUCT_CREATED",
      entityType: "Product",
      entityId: product._id.toString(),
      description: `Created product "${product.name}" with SKU "${product.sku}".`,
      metadata: {
        productId: product._id.toString(),
        sku: product.sku,
        name: product.name,
        price: product.price,
        costPrice: product.costPrice,
        branchId,
        openingQuantity,
      },
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof TenantSecurityError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ProductCreationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "A product with this SKU already exists." }, { status: 409 });
    }
    console.error("POST /api/products error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to create product." }, { status: 500 });
  }
}
