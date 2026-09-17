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
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  requiresRole?: string[];
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
        description: "Checkout register and transaction history",
      },
      {
        title: "Products",
        href: "/products",
        icon: Package,
        description: "Product catalog and variant management",
      },
      {
        title: "Inventory",
        href: "/inventory",
        icon: Boxes,
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
        description: "Customer database and store credit",
      },
      {
        title: "Suppliers",
        href: "/suppliers",
        icon: Truck,
        description: "Vendor directory and purchase orders",
      },
      {
        title: "Expenses",
        href: "/expenses",
        icon: Receipt,
        description: "Operating expense tracking",
      },
      {
        title: "Reports",
        href: "/reports",
        icon: BarChart3,
        description: "Sales, revenue, and inventory analytics",
      },
    ],
  },
  {
    sectionTitle: "Configuration",
    items: [
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
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
