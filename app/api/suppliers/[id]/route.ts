import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import {
  AuthenticationError,
  AuthorizationError,
  requireEffectiveTenantContext,
  requirePermission,
} from "@/lib/auth/session";
import { scopeToTenant, TenantSecurityError } from "@/lib/db/tenant-context";
import { Supplier } from "@/models/Supplier";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const tenantContext = await requireEffectiveTenantContext();
    await requirePermission("SUPPLIER_EDIT");
    await connectToDatabase();

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, string> = {};
    for (const field of ["companyName", "contactPerson", "phone", "email", "category"] as const) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== "string" || (field === "companyName" && !body[field].trim())) {
          return NextResponse.json({ error: "Invalid supplier details." }, { status: 400 });
        }
        updates[field] = body[field].trim();
      }
    }
    if (body.status !== undefined) {
      if (body.status !== "active" && body.status !== "inactive") {
        return NextResponse.json({ error: "Invalid supplier status." }, { status: 400 });
      }
      updates.status = body.status;
    }

    const supplier = await Supplier.findOneAndUpdate(
      scopeToTenant(tenantContext, { _id: params.id }),
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!supplier) return NextResponse.json({ error: "Supplier not found." }, { status: 404 });
    return NextResponse.json({ success: true, supplier });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof AuthorizationError || error instanceof TenantSecurityError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error(`PATCH /api/suppliers/${params.id} error:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to update supplier." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const tenantContext = await requireEffectiveTenantContext();
    await requirePermission("SUPPLIER_EDIT");
    await connectToDatabase();

    const supplier = await Supplier.findOneAndDelete(
      scopeToTenant(tenantContext, { _id: params.id })
    );
    if (!supplier) return NextResponse.json({ error: "Supplier not found." }, { status: 404 });
    return NextResponse.json({ success: true, message: "Supplier deleted." });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof AuthorizationError || error instanceof TenantSecurityError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error(`DELETE /api/suppliers/${params.id} error:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to delete supplier." }, { status: 500 });
  }
}