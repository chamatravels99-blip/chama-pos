import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import {
  requireEffectiveTenantContext,
  assertEffectiveBusinessId,
  requirePermission,
  AuthorizationError,
  AuthenticationError,
  assertBranchAccess,
  resolveRequestedBranch,
} from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/db/audit";
import { adjustStock, StockValidationError } from "@/lib/inventory/stock-service";
import { Product } from "@/models/Product";
import { Branch } from "@/models/Branch";
import { TenantSecurityError } from "@/lib/db/tenant-context";

export const dynamic = "force-dynamic";

const ALLOWED_ADJUSTMENT_TYPES = new Set(["purchase_received", "adjustment"]);

export async function POST(request: NextRequest) {
  try {
    const tenantContext = await requireEffectiveTenantContext();
    await connectToDatabase();

    const body = await request.json().catch(() => ({}));
    if (Object.prototype.hasOwnProperty.call(body, "businessId")) {
      if (typeof body.businessId !== "string") {
        return NextResponse.json({ error: "Invalid business context." }, { status: 400 });
      }
      assertEffectiveBusinessId(tenantContext, body.businessId);
    }
    const requestedBranchId = typeof body.branchId === "string" ? body.branchId.trim() : "";
    const branchId = resolveRequestedBranch(tenantContext, requestedBranchId) || "";
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    const variantId = typeof body.variantId === "string" ? body.variantId.trim() : "";
    const rawType = typeof body.type === "string" ? body.type.trim() : "";
    const rawQuantity = Number(body.quantityChange);
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    const movementType = rawType as "purchase_received" | "adjustment";

    if (!branchId) {
      return NextResponse.json({ error: "Branch is required." }, { status: 400 });
    }

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ error: "Invalid productId." }, { status: 400 });
    }

    if (variantId && !mongoose.Types.ObjectId.isValid(variantId)) {
      return NextResponse.json({ error: "Invalid variantId." }, { status: 400 });
    }

    if (!ALLOWED_ADJUSTMENT_TYPES.has(rawType)) {
      return NextResponse.json({ error: "Invalid stock adjustment type." }, { status: 400 });
    }

    if (!Number.isFinite(rawQuantity) || rawQuantity === 0) {
      return NextResponse.json({ error: "Stock quantity must be a non-zero finite number." }, { status: 400 });
    }

    const requiredPermission = movementType === "purchase_received" ? "STOCK_ADD" : "STOCK_ADJUST";
    await requirePermission(requiredPermission);
    assertBranchAccess(tenantContext, branchId);

    if (!tenantContext.businessId) {
      return NextResponse.json({ error: "Tenant context missing." }, { status: 400 });
    }

    const businessId = tenantContext.businessId;

    let productName = "Product";
    let productSku = "";
    let previousQuantity = 0;
    let newQuantity = 0;

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const product = await Product.findOne({
          _id: productId,
          businessId,
          status: "active",
          isActive: { $ne: false },
        }).session(session);

        if (!product) {
          throw new StockValidationError("Product not found.");
        }

        productName = product.name;
        productSku = product.sku;

        if (variantId && product.variants?.length) {
          const variant = product.variants.find((item) => item._id?.toString() === variantId);
          if (!variant) {
            throw new StockValidationError("Variant not found.");
          }
        }

        const result = await adjustStock(
          {
            businessId,
            branchId,
            productId,
            variantId: variantId || undefined,
            quantityChange: rawQuantity,
            type: movementType,
            userId: tenantContext.userId,
            notes: notes || undefined,
          },
          session
        );

        previousQuantity = result.previousQuantity;
        newQuantity = result.newQuantity;
      });
    } finally {
      await session.endSession();
    }

    const branch = await Branch.findOne({ _id: branchId, businessId }).lean();

    await logAuditEvent({
      businessId: businessId,
      branchId,
      userId: tenantContext.userId,
      userName: tenantContext.username || tenantContext.businessName || "Staff User",
      userRole: tenantContext.role,
      action: movementType === "purchase_received" ? "INVENTORY_RECEIVED" : "INVENTORY_ADJUSTED",
      entityType: "Inventory",
      entityId: productId,
      description: `${movementType === "purchase_received" ? "Received" : "Adjusted"} stock for ${productName} (${productSku}) at ${branch?.name || "branch"}.`,
      metadata: {
        productId,
        variantId: variantId || undefined,
        product: productName,
        branch: branch?.name || branchId,
        previousQuantity,
        quantityChange: rawQuantity,
        newQuantity,
        movementType,
        user: tenantContext.username || tenantContext.userId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: movementType === "purchase_received" ? "Stock received successfully." : "Stock adjusted successfully.",
        previousQuantity,
        newQuantity,
        movementType,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof AuthorizationError || error instanceof TenantSecurityError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof StockValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/inventory/adjust error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Invalid stock adjustment." }, { status: 500 });
  }
}
