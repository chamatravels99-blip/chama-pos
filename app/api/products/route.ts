import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import { Product } from "@/models/Product";
import {
  getTenantContext,
  requirePermission,
  isPlatformRole,
  AuthorizationError,
  AuthenticationError,
} from "@/lib/auth/session";
import { scopeToTenant } from "@/lib/db/tenant-context";
import { logAuditEvent } from "@/lib/db/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/products
 * Returns all products scoped to the authenticated tenant.
 * Supports: ?search=, ?status=, ?category=, ?page=, ?limit=
 * PLATFORM_OWNER / PLATFORM_ADMIN may additionally pass ?businessId= to scope to a specific tenant.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext();
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search")?.trim() || "";
    const statusFilter = searchParams.get("status") || "";
    const categoryFilter = searchParams.get("category")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    const isPlatform = isPlatformRole(tenantContext.role);

    // Build the base query with tenant isolation
    let baseQuery: Record<string, unknown> = {};

    if (isPlatform) {
      const targetBusinessId = searchParams.get("businessId");
      if (targetBusinessId) {
        baseQuery.businessId = targetBusinessId;
      }
    } else {
      // Strictly scope to the session's businessId — never trust the client
      baseQuery = scopeToTenant(tenantContext, baseQuery);
    }

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
      products,
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
 * businessId is ALWAYS taken from the session — never from the request body.
 * Requires PRODUCT_CREATE permission.
 */
export async function POST(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext();
    await requirePermission("PRODUCT_CREATE");

    const body = await request.json();

    // --- Server-side validation ---
    const { name, sku, costPrice, sellingPrice, status, description, categoryName, brand, unit, barcode } = body;

    const errors: string[] = [];
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      errors.push("Product name is required.");
    }
    if (!sku || typeof sku !== "string" || sku.trim().length === 0) {
      errors.push("SKU is required.");
    }
    if (costPrice === undefined || costPrice === null || isNaN(Number(costPrice)) || Number(costPrice) < 0) {
      errors.push("Cost price must be a non-negative number.");
    }
    if (sellingPrice === undefined || sellingPrice === null || isNaN(Number(sellingPrice)) || Number(sellingPrice) < 0) {
      errors.push("Selling price must be a non-negative number.");
    }
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(" "), errors }, { status: 400 });
    }

    await connectToDatabase();

    // Determine businessId from session — platform admin can specify via body, business users cannot
    let businessId: string;
    const isPlatform = isPlatformRole(tenantContext.role);

    if (isPlatform && body.businessId && typeof body.businessId === "string") {
      businessId = body.businessId;
    } else if (tenantContext.businessId) {
      businessId = tenantContext.businessId;
    } else {
      return NextResponse.json({ error: "Cannot determine target business." }, { status: 400 });
    }

    // Check for duplicate SKU within this tenant
    const existingProduct = await Product.findOne({ businessId, sku: sku.trim().toUpperCase() });
    if (existingProduct) {
      return NextResponse.json(
        { error: `SKU "${sku.trim().toUpperCase()}" already exists for this business.` },
        { status: 409 }
      );
    }

    const productData = {
      businessId,
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      barcode: barcode?.trim() || undefined,
      description: description?.trim() || undefined,
      categoryName: categoryName?.trim() || undefined,
      brand: brand?.trim() || undefined,
      unit: unit?.trim() || "pcs",
      costPrice: Number(costPrice),
      price: Number(sellingPrice),
      sellingPrice: Number(sellingPrice),
      status: ["active", "inactive"].includes(status) ? status : "active",
    };

    const product = await Product.create(productData);

    // Audit log
    await logAuditEvent({
      businessId,
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
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "A product with this SKU already exists." }, { status: 409 });
    }
    console.error("POST /api/products error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to create product." }, { status: 500 });
  }
}
