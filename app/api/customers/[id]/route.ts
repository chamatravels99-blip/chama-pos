import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import {
  AuthenticationError,
  AuthorizationError,
  requireEffectiveTenantContext,
  requirePermission,
} from "@/lib/auth/session";
import { TenantSecurityError } from "@/lib/db/tenant-context";
import {
  CustomerValidationError,
  deactivateCustomer,
  getCustomerById,
  updateCustomer,
} from "@/lib/customers/customer-service";
import { customerApiErrorResponse, readCustomerInput } from "@/lib/customers/customer-api";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

function respondToError(error: unknown, operation: string) {
  if (
    error instanceof AuthenticationError || error instanceof AuthorizationError ||
    error instanceof TenantSecurityError || error instanceof CustomerValidationError
  ) {
    return customerApiErrorResponse(error, operation);
  }
  console.error(`${operation} error:`, error instanceof Error ? error.message : error);
  return NextResponse.json({ error: "Customer request failed." }, { status: 500 });
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const tenantContext = await requireEffectiveTenantContext();
    await requirePermission("CUSTOMER_VIEW");
    await connectToDatabase();
    const customer = await getCustomerById(tenantContext, params.id);
    if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    return NextResponse.json({ success: true, customer });
  } catch (error) {
    return respondToError(error, `GET /api/customers/${params.id}`);
  }
}

async function update(request: NextRequest, { params }: RouteContext) {
  try {
    const tenantContext = await requireEffectiveTenantContext();
    await requirePermission("CUSTOMER_EDIT");
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid customer data." }, { status: 400 });
    }
    const data = body as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(data, "businessId")) {
      return NextResponse.json({ error: "Business ID cannot be changed." }, { status: 400 });
    }
    const input = readCustomerInput(data, true);
    await connectToDatabase();
    const customer = await updateCustomer(tenantContext, params.id, input);
    if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    return NextResponse.json({ success: true, customer });
  } catch (error) {
    return respondToError(error, `UPDATE /api/customers/${params.id}`);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return update(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return update(request, context);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const tenantContext = await requireEffectiveTenantContext();
    await requirePermission("CUSTOMER_DELETE");
    await connectToDatabase();
    const customer = await deactivateCustomer(tenantContext, params.id);
    if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    return NextResponse.json({ success: true, customer });
  } catch (error) {
    return respondToError(error, `DELETE /api/customers/${params.id}`);
  }
}