import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import {
  assertEffectiveBusinessId,
  AuthenticationError,
  AuthorizationError,
  requireEffectiveTenantContext,
  requirePermission,
} from "@/lib/auth/session";
import { TenantSecurityError } from "@/lib/db/tenant-context";
import { createCustomer, CustomerInput, CustomerValidationError, listCustomers } from "@/lib/customers/customer-service";
import { customerApiErrorResponse, readCustomerInput } from "@/lib/customers/customer-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const tenantContext = await requireEffectiveTenantContext();
    await requirePermission("CUSTOMER_VIEW");
    assertEffectiveBusinessId(tenantContext, request.nextUrl.searchParams.get("businessId"));
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const requestedStatus = searchParams.get("status") || "active";
    if (!["active", "inactive", "all"].includes(requestedStatus)) {
      return NextResponse.json({ error: "Status must be active, inactive, or all." }, { status: 400 });
    }
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "50", 10) || 50));
    const result = await listCustomers(tenantContext, {
      search: searchParams.get("search") || "",
      active: requestedStatus === "all" ? "all" : requestedStatus === "active",
      page,
      limit,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return customerApiErrorResponse(error, "GET /api/customers");
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantContext = await requireEffectiveTenantContext();
    await requirePermission("CUSTOMER_CREATE");
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid customer data." }, { status: 400 });
    }
    const data = body as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(data, "businessId")) {
      return NextResponse.json({ error: "Business ID is assigned by the server." }, { status: 400 });
    }
    const input = readCustomerInput(data, false);
    await connectToDatabase();
    const customer = await createCustomer(tenantContext, input);
    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (error) {
    return customerApiErrorResponse(error, "POST /api/customers");
  }
}
