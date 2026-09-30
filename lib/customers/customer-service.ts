import { scopeToTenant } from "@/lib/db/tenant-context";
import { Customer, CustomerDocument } from "@/models/Customer";
import { Customer as CustomerType, CustomerType as CustomerKind } from "@/types/customer";
import { TenantContext } from "@/types";

export class CustomerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomerValidationError";
  }
}

export interface CustomerInput {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  customerType?: CustomerKind;
  notes?: string;
}

export interface CustomerListOptions {
  search?: string;
  active?: boolean | "all";
  page?: number;
  limit?: number;
}

function toCustomer(customer: CustomerDocument | Record<string, unknown>): CustomerType {
  const record = customer as CustomerDocument & { _id: { toString(): string } };
  return {
    _id: record._id.toString(),
    name: record.name,
    phone: record.phone,
    email: record.email,
    address: record.address,
    customerType: record.customerType,
    notes: record.notes,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function validateCustomerInput(input: Partial<CustomerInput>, creating = false) {
  if (creating && (typeof input.name !== "string" || !input.name.trim())) {
    throw new CustomerValidationError("Customer name is required.");
  }
  if (input.name !== undefined && (typeof input.name !== "string" || !input.name.trim())) {
    throw new CustomerValidationError("Customer name cannot be empty.");
  }
  if (input.customerType !== undefined && !["REGULAR", "BUSINESS"].includes(input.customerType)) {
    throw new CustomerValidationError("Customer type must be REGULAR or BUSINESS.");
  }
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    throw new CustomerValidationError("Enter a valid email address.");
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listCustomers(tenantContext: TenantContext, options: CustomerListOptions = {}) {
  const page = Math.max(1, Math.floor(options.page || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(options.limit || 50)));
  const query: Record<string, unknown> = scopeToTenant(tenantContext, {});

  if (options.active !== "all") {
    query.isActive = options.active === undefined ? true : options.active;
  }
  const search = options.search?.trim();
  if (search) {
    const searchRegex = { $regex: escapeRegex(search), $options: "i" };
    query.$or = [{ name: searchRegex }, { phone: searchRegex }];
  }

  const skip = (page - 1) * limit;
  const [customers, total] = await Promise.all([
    Customer.find(query).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Customer.countDocuments(query),
  ]);

  return {
    customers: customers.map((customer) => toCustomer(customer as unknown as Record<string, unknown>)),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getCustomerById(tenantContext: TenantContext, customerId: string) {
  const customer = await Customer.findOne(scopeToTenant(tenantContext, { _id: customerId })).lean();
  return customer ? toCustomer(customer as unknown as Record<string, unknown>) : null;
}

export async function createCustomer(tenantContext: TenantContext, input: CustomerInput) {
  validateCustomerInput(input, true);
  const tenant = scopeToTenant(tenantContext, {});
  const customer = await Customer.create({
    ...tenant,
    name: input.name!.trim(),
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim().toLowerCase() || undefined,
    address: input.address?.trim() || undefined,
    customerType: input.customerType || "REGULAR",
    notes: input.notes?.trim() || undefined,
    isActive: true,
  });
  return toCustomer(customer);
}

export async function updateCustomer(
  tenantContext: TenantContext,
  customerId: string,
  input: Partial<CustomerInput>
) {
  validateCustomerInput(input);
  const updates: Record<string, unknown> = {};
  for (const field of ["name", "phone", "email", "address", "customerType", "notes"] as const) {
    if (input[field] !== undefined) {
      const value = input[field];
      updates[field] = typeof value === "string"
        ? field === "email" ? value.trim().toLowerCase() || undefined : value.trim() || undefined
        : value;
    }
  }
  if (typeof updates.name === "undefined" && input.name !== undefined) {
    throw new CustomerValidationError("Customer name cannot be empty.");
  }

  const customer = await Customer.findOneAndUpdate(
    scopeToTenant(tenantContext, { _id: customerId }),
    { $set: updates },
    { new: true, runValidators: true }
  ).lean();
  return customer ? toCustomer(customer as unknown as Record<string, unknown>) : null;
}

export async function deactivateCustomer(tenantContext: TenantContext, customerId: string) {
  const customer = await Customer.findOneAndUpdate(
    scopeToTenant(tenantContext, { _id: customerId }),
    { $set: { isActive: false } },
    { new: true }
  ).lean();
  return customer ? toCustomer(customer as unknown as Record<string, unknown>) : null;
}