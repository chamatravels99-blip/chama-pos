import { NextResponse } from "next/server";
import { AuthenticationError, AuthorizationError } from "@/lib/auth/session";
import { TenantSecurityError } from "@/lib/db/tenant-context";
import { CustomerInput, CustomerValidationError } from "@/lib/customers/customer-service";

export function customerApiErrorResponse(error: unknown, operation: string) {
  if (error instanceof AuthenticationError) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (error instanceof AuthorizationError || error instanceof TenantSecurityError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof CustomerValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
  console.error(`${operation} error:`, error instanceof Error ? error.message : error);
  return NextResponse.json({ error: "Customer request failed." }, { status: 500 });
}

export function readCustomerInput(data: Record<string, unknown>, partial: boolean): CustomerInput {
  const fields = ["name", "phone", "email", "address", "notes"] as const;
  const input: CustomerInput = {};
  for (const field of fields) {
    if (data[field] !== undefined) {
      if (typeof data[field] !== "string") throw new CustomerValidationError(`${field} must be text.`);
      input[field] = data[field] as string;
    }
  }
  if (!partial && (typeof input.name !== "string" || !input.name.trim())) {
    throw new CustomerValidationError("Customer name is required.");
  }
  if (data.customerType !== undefined) {
    if (data.customerType !== "REGULAR" && data.customerType !== "BUSINESS") {
      throw new CustomerValidationError("Customer type must be REGULAR or BUSINESS.");
    }
    input.customerType = data.customerType;
  }
  return input;
}