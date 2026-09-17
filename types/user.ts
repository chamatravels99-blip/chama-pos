export type UserRole =
  | "SUPER_ADMIN" // Platform SaaS Owner (cross-tenant access)
  | "BUSINESS_OWNER" // Full access to specific tenant business
  | "MANAGER" // Store management, discounts, voids, reports
  | "CASHIER" // POS checkout, register closing, customer lookup
  | "STOCK_MANAGER" // Inventory, stock receiving, supplier orders
  | "ACCOUNTANT"; // Invoices, expenses, financial reports

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
  // Super Admin Platform
  | "platform:manage_businesses"
  | "platform:manage_subscriptions"
  | "platform:system_metrics";

export interface User {
  _id: string;
  businessId: string | null; // Null for SUPER_ADMIN
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  // Multi-branch assignment: empty or undefined means all branches for this business
  assignedBranchIds: string[];
  permissions: Permission[];
  isActive: boolean;
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
  assignedBranchIds: string[];
  activeBranchId?: string;
}
