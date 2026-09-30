import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Users,
  Truck,
  Receipt,
  BarChart3,
  Settings,
  Building2,
  CreditCard,
  ShieldCheck,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  requiresRole?: string[];
  requiresPermission?: string;
  description?: string;
}

export interface NavSection {
  sectionTitle?: string;
  items: NavItem[];
}

export const tenantNavigation: NavSection[] = [
  {
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        requiresPermission: "DASHBOARD_VIEW",
        description: "Overview and real-time sales metrics",
      },
    ],
  },
  {
    sectionTitle: "Store Operations",
    items: [
      {
        title: "Sales & POS",
        href: "/sales",
        icon: ShoppingCart,
        requiresPermission: "POS_ACCESS",
        description: "Checkout register and transaction history",
      },
      {
        title: "Products",
        href: "/products",
        icon: Package,
        requiresPermission: "PRODUCT_VIEW",
        description: "Product catalog and variant management",
      },
      {
        title: "Inventory",
        href: "/inventory",
        icon: Boxes,
        requiresPermission: "STOCK_VIEW",
        description: "Stock tracking and stock movements",
      },
    ],
  },
  {
    sectionTitle: "Relations & Finance",
    items: [
      {
        title: "Customers",
        href: "/customers",
        icon: Users,
        requiresPermission: "CUSTOMER_VIEW",
        description: "Business-wide customer database",
      },
      {
        title: "Suppliers",
        href: "/suppliers",
        icon: Truck,
        requiresPermission: "SUPPLIER_VIEW",
        description: "Vendor directory and purchase orders",
      },
      {
        title: "Expenses",
        href: "/expenses",
        icon: Receipt,
        requiresPermission: "EXPENSE_VIEW",
        description: "Operating expense tracking",
      },
      {
        title: "Reports",
        href: "/reports",
        icon: BarChart3,
        requiresPermission: "REPORT_VIEW",
        description: "Sales, revenue, and inventory analytics",
      },
    ],
  },
  {
    sectionTitle: "Administration",
    items: [
      {
        title: "Staff & Users",
        href: "/users",
        icon: UserCheck,
        requiresPermission: "USER_VIEW",
        description: "Staff accounts, role permissions, and branch assignments",
      },
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        requiresPermission: "SETTINGS_VIEW",
        description: "Business profile, branch, and tax configuration",
      },
    ],
  },
];

export const adminNavigation: NavSection[] = [
  {
    sectionTitle: "Platform Admin",
    items: [
      {
        title: "Overview",
        href: "/admin",
        icon: ShieldCheck,
        description: "SaaS platform performance",
      },
      {
        title: "Businesses",
        href: "/admin/businesses",
        icon: Building2,
        description: "Tenant business management",
      },
      {
        title: "Subscriptions",
        href: "/admin/subscriptions",
        icon: CreditCard,
        description: "Subscription tiers and tenant billing",
      },
      {
        title: "Platform Users",
        href: "/admin/users",
        icon: Users,
        description: "All registered platform users",
      },
    ],
  },
];
