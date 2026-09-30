import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import {
  AuthenticationError,
  AuthorizationError,
  getTenantContext,
  requirePermission,
} from "@/lib/auth/session";
import { scopeToTenant, TenantSecurityError } from "@/lib/db/tenant-context";
import { Supplier } from "@/models/Supplier";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenantContext = await getTenantContext();
    await requirePermission("SUPPLIER_VIEW");
    await connectToDatabase();

    const suppliers = await Supplier.find(scopeToTenant(tenantContext, {}))
      .sort({ companyName: 1 })
      .lean();

    return NextResponse.json({ success: true, suppliers });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof AuthorizationError || error instanceof TenantSecurityError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("GET /api/suppliers error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to retrieve suppliers." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext();
    await requirePermission("SUPPLIER_CREATE");
    await connectToDatabase();

    const body = await request.json().catch(() => ({}));
    if (typeof body.companyName !== "string" || !body.companyName.trim()) {
      return NextResponse.json({ error: "Supplier company name is required." }, { status: 400 });
    }

    const tenant = scopeToTenant(tenantContext, {});
    const supplier = await Supplier.create({
      ...tenant,
      companyName: body.companyName.trim(),
      contactPerson: typeof body.contactPerson === "string" ? body.contactPerson.trim() : undefined,
      phone: typeof body.phone === "string" ? body.phone.trim() : undefined,
      email: typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined,
      category: typeof body.category === "string" ? body.category.trim() : undefined,
      status: body.status === "inactive" ? "inactive" : "active",
    });

    return NextResponse.json({ success: true, supplier }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof AuthorizationError || error instanceof TenantSecurityError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("POST /api/suppliers error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to create supplier." }, { status: 500 });
  }
}