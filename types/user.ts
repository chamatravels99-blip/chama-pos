export type UserRole =
  | "PLATFORM_OWNER" // Platform SaaS Owner
  | "PLATFORM_ADMIN" // Platform SaaS Owner alias
  | "SUPER_ADMIN" // Platform SaaS Owner legacy alias
  | "BUSINESS_OWNER" // Business owner with full tenant control
  | "MANAGER" // Store manager for assigned branch(es)
  | "CASHIER" // POS cashier
  | "STOCK_MANAGER" // Inventory / stock specialist
  | "ACCOUNTANT"; // Invoices & financial reporting

export type UserStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "active"
  | "inactive";

export type BranchAccess = "ALL_BRANCHES" | "SELECTED_BRANCHES";

export type StandardPermission =
  // Dashboard
  | "DASHBOARD_VIEW"
  // Sales & POS
  | "POS_ACCESS"
  | "SALE_CREATE"
  | "SALE_VIEW"
  | "SALE_VIEW_ALL"
  | "SALE_VIEW_OTHER_CASHIERS"
  | "SALE_CANCEL"
  | "SALE_REFUND"
  // Products
  | "PRODUCT_VIEW"
  | "PRODUCT_CREATE"
  | "PRODUCT_EDIT"
  | "PRODUCT_DELETE"
  // Inventory & Stock
  | "STOCK_VIEW"
  | "STOCK_ADD"
  | "STOCK_ADJUST"
  | "STOCK_TRANSFER"
  // Customers
  | "CUSTOMER_VIEW"
  | "CUSTOMER_CREATE"
  | "CUSTOMER_EDIT"
  // Suppliers
  | "SUPPLIER_VIEW"
  | "SUPPLIER_CREATE"
  | "SUPPLIER_EDIT"
  // Purchases
  | "PURCHASE_VIEW"
  | "PURCHASE_CREATE"
  | "PURCHASE_EDIT"
  // Expenses
  | "EXPENSE_VIEW"
  | "EXPENSE_CREATE"
  | "EXPENSE_EDIT"
  // Reports
  | "REPORT_VIEW"
  | "REPORT_VIEW_ALL_BRANCHES"
  // Users
  | "USER_VIEW"
  | "USER_CREATE"
  | "USER_EDIT"
  | "USER_DISABLE"
  // Branches
  | "BRANCH_VIEW"
  | "BRANCH_CREATE"
  | "BRANCH_EDIT"
  // Settings
  | "SETTINGS_VIEW"
  | "SETTINGS_EDIT"
  // Audit Logs
  | "AUDIT_LOG_VIEW";

// Legacy colon-separated permission string aliases for backward compatibility
export type LegacyPermission =
  | "pos:access"
  | "pos:create_sale"
  | "pos:apply_discount"
  | "pos:void_sale"
  | "pos:refund"
  | "products:read"
  | "products:create"
  | "products:update"
  | "products:delete"
  | "inventory:read"
  | "inventory:adjust"
  | "inventory:transfer"
  | "customers:read"
  | "customers:write"
  | "suppliers:read"
  | "suppliers:write"
  | "expenses:read"
  | "expenses:write"
  | "reports:view_sales"
  | "reports:view_financials"
  | "reports:export"
  | "branches:manage"
  | "users:manage"
  | "settings:manage"
  | "platform:manage_businesses"
  | "platform:manage_subscriptions"
  | "platform:system_metrics";

export type Permission = StandardPermission | LegacyPermission | string;

export interface PermissionGroup {
  category: string;
  permissions: {
    key: StandardPermission;
    label: string;
    description: string;
  }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    category: "Dashboard",
    permissions: [
      { key: "DASHBOARD_VIEW", label: "View Dashboard", description: "View sales overview and real-time metrics" },
    ],
  },
  {
    category: "Sales & POS",
    permissions: [
      { key: "POS_ACCESS", label: "Access POS", description: "Open and operate the POS terminal" },
      { key: "SALE_CREATE", label: "Create Sales", description: "Process sales and issue receipts" },
      { key: "SALE_VIEW", label: "View Sales", description: "View personal or branch sales history" },
      { key: "SALE_VIEW_ALL", label: "View All Branch Sales", description: "View sales across all branch locations" },
      { key: "SALE_VIEW_OTHER_CASHIERS", label: "View Other Cashiers", description: "View sales processed by other cashiers" },
      { key: "SALE_CANCEL", label: "Cancel Sales", description: "Void or cancel unpaid transactions" },
      { key: "SALE_REFUND", label: "Process Refunds", description: "Issue refunds on completed orders" },
    ],
  },
  {
    category: "Products",
    permissions: [
      { key: "PRODUCT_VIEW", label: "View Products", description: "View product catalog and prices" },
      { key: "PRODUCT_CREATE", label: "Create Products", description: "Add new products to the catalog" },
      { key: "PRODUCT_EDIT", label: "Edit Products", description: "Modify product pricing, SKU, and details" },
      { key: "PRODUCT_DELETE", label: "Deactivate Products", description: "Disable products in the catalog" },
    ],
  },
  {
    category: "Inventory & Stock",
    permissions: [
      { key: "STOCK_VIEW", label: "View Stock", description: "Check current inventory levels" },
      { key: "STOCK_ADD", label: "Add Stock", description: "Record incoming stock receipts" },
      { key: "STOCK_ADJUST", label: "Adjust Stock", description: "Perform manual stock reconciliations" },
      { key: "STOCK_TRANSFER", label: "Transfer Stock", description: "Initiate and accept branch transfers" },
    ],
  },
  {
    category: "Customers",
    permissions: [
      { key: "CUSTOMER_VIEW", label: "View Customers", description: "View customer profiles and history" },
      { key: "CUSTOMER_CREATE", label: "Create Customers", description: "Register new customer profiles" },
      { key: "CUSTOMER_EDIT", label: "Edit Customers", description: "Update customer records and credit" },
    ],
  },
  {
    category: "Suppliers",
    permissions: [
      { key: "SUPPLIER_VIEW", label: "View Suppliers", description: "View vendor directory" },
      { key: "SUPPLIER_CREATE", label: "Create Suppliers", description: "Add new suppliers" },
      { key: "SUPPLIER_EDIT", label: "Edit Suppliers", description: "Modify supplier agreements and contacts" },
    ],
  },
  {
    category: "Purchases",
    permissions: [
      { key: "PURCHASE_VIEW", label: "View Purchases", description: "View supplier purchase orders" },
      { key: "PURCHASE_CREATE", label: "Create Purchases", description: "Create purchase orders" },
      { key: "PURCHASE_EDIT", label: "Edit Purchases", description: "Update and confirm purchase orders" },
    ],
  },
  {
    category: "Expenses",
    permissions: [
      { key: "EXPENSE_VIEW", label: "View Expenses", description: "View operating expenses" },
      { key: "EXPENSE_CREATE", label: "Record Expenses", description: "Log daily operational expenses" },
      { key: "EXPENSE_EDIT", label: "Edit Expenses", description: "Modify recorded expense entries" },
    ],
  },
  {
    category: "Reports",
    permissions: [
      { key: "REPORT_VIEW", label: "View Reports", description: "View sales and financial analytics" },
      { key: "REPORT_VIEW_ALL_BRANCHES", label: "View All Branches Reports", description: "Access cross-branch reports" },
    ],
  },
  {
    category: "Users",
    permissions: [
      { key: "USER_VIEW", label: "View Users", description: "Browse store staff and user profiles" },
      { key: "USER_CREATE", label: "Create Users", description: "Add new staff accounts" },
      { key: "USER_EDIT", label: "Edit Users", description: "Modify staff roles, branches, and permissions" },
      { key: "USER_DISABLE", label: "Disable Users", description: "Deactivate staff accounts" },
    ],
  },
  {
    category: "Branches",
    permissions: [
      { key: "BRANCH_VIEW", label: "View Branches", description: "View branch locations and configuration" },
      { key: "BRANCH_CREATE", label: "Create Branches", description: "Set up new branch locations" },
      { key: "BRANCH_EDIT", label: "Edit Branches", description: "Modify branch details" },
    ],
  },
  {
    category: "Settings",
    permissions: [
      { key: "SETTINGS_VIEW", label: "View Settings", description: "View store configuration and taxes" },
      { key: "SETTINGS_EDIT", label: "Edit Settings", description: "Update business profile and tax settings" },
    ],
  },
  {
    category: "Audit Logs",
    permissions: [
      { key: "AUDIT_LOG_VIEW", label: "View Audit Logs", description: "Inspect system audit and change logs" },
    ],
  },
];

// All permissions list
export const ALL_STANDARD_PERMISSIONS: StandardPermission[] = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key)
);

// Sensible default role permissions
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, StandardPermission[]> = {
  PLATFORM_OWNER: [...ALL_STANDARD_PERMISSIONS],
  PLATFORM_ADMIN: [...ALL_STANDARD_PERMISSIONS],
  SUPER_ADMIN: [...ALL_STANDARD_PERMISSIONS],
  BUSINESS_OWNER: [...ALL_STANDARD_PERMISSIONS],
  MANAGER: [
    "DASHBOARD_VIEW",
    "POS_ACCESS",
    "SALE_CREATE",
    "SALE_VIEW",
    "SALE_CANCEL",
    "SALE_REFUND",
    "PRODUCT_VIEW",
    "PRODUCT_CREATE",
    "PRODUCT_EDIT",
    "STOCK_VIEW",
    "STOCK_ADD",
    "STOCK_ADJUST",
    "STOCK_TRANSFER",
    "CUSTOMER_VIEW",
    "CUSTOMER_CREATE",
    "CUSTOMER_EDIT",
    "SUPPLIER_VIEW",
    "SUPPLIER_CREATE",
    "SUPPLIER_EDIT",
    "PURCHASE_VIEW",
    "PURCHASE_CREATE",
    "PURCHASE_EDIT",
    "EXPENSE_VIEW",
    "EXPENSE_CREATE",
    "EXPENSE_EDIT",
    "REPORT_VIEW",
    "BRANCH_VIEW",
    "AUDIT_LOG_VIEW",
  ],
  CASHIER: [
    "DASHBOARD_VIEW",
    "POS_ACCESS",
    "SALE_CREATE",
    "SALE_VIEW",
    "PRODUCT_VIEW",
    "STOCK_VIEW",
    "CUSTOMER_VIEW",
    "CUSTOMER_CREATE",
  ],
  STOCK_MANAGER: [
    "DASHBOARD_VIEW",
    "PRODUCT_VIEW",
    "PRODUCT_CREATE",
    "PRODUCT_EDIT",
    "STOCK_VIEW",
    "STOCK_ADD",
    "STOCK_ADJUST",
    "STOCK_TRANSFER",
    "SUPPLIER_VIEW",
    "PURCHASE_VIEW",
    "PURCHASE_CREATE",
  ],
  ACCOUNTANT: [
    "DASHBOARD_VIEW",
    "SALE_VIEW",
    "EXPENSE_VIEW",
    "EXPENSE_CREATE",
    "EXPENSE_EDIT",
    "PURCHASE_VIEW",
    "REPORT_VIEW",
    "REPORT_VIEW_ALL_BRANCHES",
  ],
};

export interface User {
  _id: string;
  username?: string;
  name: string;
  email: string;
  phone?: string;
  businessId: string | null; // Null for PLATFORM_OWNER / PLATFORM_ADMIN
  branchAccess?: BranchAccess; // ALL_BRANCHES | SELECTED_BRANCHES
  branchIds: string[]; // Assigned branch locations
  assignedBranchIds?: string[]; // Backward compatibility alias
  passwordHash?: string;
  role: UserRole;
  status: UserStatus;
  isActive?: boolean;
  avatarUrl?: string;
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
  username?: string;
  name: string;
  email: string;
  role: UserRole;
  businessId: string | null;
  businessName?: string;
  businessSlug?: string;
  branchAccess?: BranchAccess;
  branchIds: string[];
  activeBranchId?: string;
  permissions?: Permission[];
}

export interface SessionPayload {
  userId: string;
  username?: string;
  email: string;
  name: string;
  role: UserRole;
  businessId: string | null;
  businessName?: string;
  businessSlug?: string;
  branchAccess?: BranchAccess;
  branchIds: string[];
  activeBranchId?: string;
  permissions?: Permission[];
}
