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
import { logAuditEvent } from "@/lib/db/audit";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

/**
 * GET /api/products/[id]
 * Returns a single product, strictly scoped to the authenticated tenant.
 * Requires PRODUCT_VIEW permission.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const tenantContext = await getTenantContext();
    await requirePermission("PRODUCT_VIEW");
    await connectToDatabase();

    const isPlatform = isPlatformRole(tenantContext.role);

    const product = await Product.findById(params.id).lean();

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    // Enforce tenant isolation — even for GET by ID
    if (!isPlatform && product.businessId !== tenantContext.businessId) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error(`GET /api/products/${params.id} error:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to retrieve product." }, { status: 500 });
  }
}

/**
 * PATCH /api/products/[id]
 * Updates an existing product. businessId is NEVER allowed to change.
 * The product must belong to the authenticated tenant.
 * Requires PRODUCT_EDIT permission.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const tenantContext = await getTenantContext();
    await requirePermission("PRODUCT_EDIT");
    await connectToDatabase();

    const isPlatform = isPlatformRole(tenantContext.role);

    // Fetch product first — must belong to tenant
    const existing = await Product.findById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    if (!isPlatform && existing.businessId !== tenantContext.businessId) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const body = await request.json();

    // --- Server-side validation ---
    const errors: string[] = [];
    if (body.name !== undefined && (typeof body.name !== "string" || body.name.trim().length === 0)) {
      errors.push("Product name cannot be empty.");
    }
    if (body.sku !== undefined && (typeof body.sku !== "string" || body.sku.trim().length === 0)) {
      errors.push("SKU cannot be empty.");
    }
    if (body.costPrice !== undefined && (isNaN(Number(body.costPrice)) || Number(body.costPrice) < 0)) {
      errors.push("Cost price must be a non-negative number.");
    }
    if (body.sellingPrice !== undefined && (isNaN(Number(body.sellingPrice)) || Number(body.sellingPrice) < 0)) {
      errors.push("Selling price must be a non-negative number.");
    }
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(" "), errors }, { status: 400 });
    }

    // Check SKU uniqueness within the tenant if SKU is changing
    if (body.sku && body.sku.trim().toUpperCase() !== existing.sku) {
      const duplicate = await Product.findOne({
        businessId: existing.businessId,
        sku: body.sku.trim().toUpperCase(),
        _id: { $ne: existing._id },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `SKU "${body.sku.trim().toUpperCase()}" is already used by another product.` },
          { status: 409 }
        );
      }
    }

    // Build update object — NEVER allow businessId to be changed
    const allowedFields = [
      "name", "sku", "barcode", "description", "categoryName",
      "brand", "unit", "costPrice", "sellingPrice", "status", "taxExempt",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (updates.sku) updates.sku = (updates.sku as string).trim().toUpperCase();
    if (updates.name) updates.name = (updates.name as string).trim();
    if (updates.sellingPrice !== undefined) {
      updates.price = Number(updates.sellingPrice);
      updates.sellingPrice = Number(updates.sellingPrice);
    }
    if (updates.costPrice !== undefined) {
      updates.costPrice = Number(updates.costPrice);
    }

    const updated = await Product.findByIdAndUpdate(
      params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    // Audit log
    await logAuditEvent({
      businessId: existing.businessId,
      userId: tenantContext.userId,
      userName: tenantContext.businessName || "Staff User",
      userRole: tenantContext.role,
      action: "PRODUCT_UPDATED",
      entityType: "Product",
      entityId: existing._id.toString(),
      description: `Updated product "${existing.name}" (SKU: ${existing.sku}).`,
      metadata: {
        updatedFields: Object.keys(updates),
      },
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "A product with this SKU already exists." }, { status: 409 });
    }
    console.error(`PATCH /api/products/${params.id} error:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to update product." }, { status: 500 });
  }
}

/**
 * DELETE /api/products/[id]
 * Soft-deletes (deactivates) a product. Does NOT permanently delete.
 * Products may be referenced by future sales history.
 * Requires PRODUCT_DELETE permission.
 */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const tenantContext = await getTenantContext();
    await requirePermission("PRODUCT_DELETE");
    await connectToDatabase();

    const isPlatform = isPlatformRole(tenantContext.role);

    const existing = await Product.findById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    if (!isPlatform && existing.businessId !== tenantContext.businessId) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    // Soft-delete: set status to inactive and isActive to false
    await Product.findByIdAndUpdate(params.id, {
      $set: { status: "inactive", isActive: false },
    });

    // Audit log
    await logAuditEvent({
      businessId: existing.businessId,
      userId: tenantContext.userId,
      userName: tenantContext.businessName || "Staff User",
      userRole: tenantContext.role,
      action: "PRODUCT_DEACTIVATED",
      entityType: "Product",
      entityId: existing._id.toString(),
      description: `Soft-deactivated product "${existing.name}" (SKU: ${existing.sku}).`,
    });

    return NextResponse.json({ success: true, message: "Product deactivated successfully." });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error(`DELETE /api/products/${params.id} error:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to deactivate product." }, { status: 500 });
  }
}
