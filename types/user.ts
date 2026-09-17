export type UserRole =
  | "PLATFORM_ADMIN" // Platform SaaS Owner (cross-tenant access)
  | "BUSINESS_OWNER" // Full access to specific tenant business
  | "MANAGER" // Store management, discounts, voids, reports
  | "CASHIER" // POS checkout, register closing, customer lookup
  | "STOCK_MANAGER" // Inventory, stock receiving, supplier orders
  | "ACCOUNTANT" // Invoices, expenses, financial reports
  | "SUPER_ADMIN"; // Backward compatible alias for PLATFORM_ADMIN

export type UserStatus = "active" | "inactive";

export type Permission =
  // Sales & POS
  | "pos:access"
  | "pos:create_sale"
  | "pos:apply_discount"
  | "pos:void_sale"
  | "pos:refund"
  // Products & Inventory
  | "products:read"
  | "products:create"
  | "products:update"
  | "products:delete"
  | "inventory:read"
  | "inventory:adjust"
  | "inventory:transfer"
  // Contacts
  | "customers:read"
  | "customers:write"
  | "suppliers:read"
  | "suppliers:write"
  // Financials
  | "expenses:read"
  | "expenses:write"
  | "reports:view_sales"
  | "reports:view_financials"
  | "reports:export"
  // Management & Branches
  | "branches:manage"
  | "users:manage"
  | "settings:manage"
  // Platform Admin
  | "platform:manage_businesses"
  | "platform:manage_subscriptions"
  | "platform:system_metrics";

export interface User {
  _id: string;
  businessId: string | null; // Null for PLATFORM_ADMIN
  branchIds: string[]; // Assigned branch locations
  assignedBranchIds?: string[]; // Backward compatibility alias
  name: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  status: UserStatus;
  isActive?: boolean;
  avatarUrl?: string;
  phone?: string;
  permissions?: Permission[];
  lastLoginAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Minimal session representation stored in auth tokens.
 */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  businessId: string | null;
  businessName?: string;
  businessSlug?: string;
  branchIds: string[];
  activeBranchId?: string;
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  businessId: string | null;
  businessName?: string;
  businessSlug?: string;
  branchIds: string[];
  activeBranchId?: string;
}
