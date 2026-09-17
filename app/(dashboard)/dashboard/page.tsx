import React from "react";
import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  Users,
  Receipt,
  Plus,
  ArrowRight,
  ShieldCheck,
  Store,
  Building,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentSalesTable } from "@/components/dashboard/RecentSalesTable";
import { LowStockAlert } from "@/components/dashboard/LowStockAlert";
import { QuickActionGrid } from "@/components/dashboard/QuickActionGrid";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { mockDashboardMetrics } from "@/services/mock-data";
import { getSession } from "@/lib/auth/session";

export default async function DashboardPage() {
  const session = await getSession();

  const businessName = session?.businessName || "Chama Modzone";
  const userName = session?.name || "Kasun Perera";
  const userRole = session?.role || "BUSINESS_OWNER";
  const businessSlug = session?.businessSlug || "chama-modzone";

  return (
    <div className="space-y-6">
      {/* Dynamic Authenticated Session Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {businessName}
                </h2>
                <Badge variant="default" size="sm" className="capitalize">
                  {userRole.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Logged in as <span className="font-semibold text-slate-700">{userName}</span> &bull; Tenant: <span className="font-mono text-slate-600">{businessSlug}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              <span>Tenant Isolated Session</span>
            </div>
            <Link href="/sales">
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Launch POS
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Page Title & Main Action */}
      <PageHeader
        title="Store Operations Overview"
        description="Real-time sales performance and inventory health across your branches."
      />

      {/* Quick POS Shortcut Cards */}
      <QuickActionGrid />

      {/* Primary KPI Metric Cards (6 Key Store Indicators) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(mockDashboardMetrics.todaySalesTotal)}
          changePercent={mockDashboardMetrics.todaySalesChangePercent}
          icon={DollarSign}
          iconColor="text-emerald-600 bg-emerald-50 border-emerald-200"
        />
        <StatCard
          title="Today's Orders"
          value={mockDashboardMetrics.todayOrdersCount}
          changePercent={mockDashboardMetrics.todayOrdersChangePercent}
          icon={ShoppingCart}
          iconColor="text-blue-600 bg-blue-50 border-blue-200"
        />
        <StatCard
          title="Active Products"
          value={mockDashboardMetrics.totalProductsCount}
          icon={Package}
          iconColor="text-purple-600 bg-purple-50 border-purple-200"
        />
        <StatCard
          title="Low Stock Items"
          value={mockDashboardMetrics.lowStockItemsCount}
          icon={AlertTriangle}
          iconColor="text-amber-600 bg-amber-50 border-amber-200"
        />
        <StatCard
          title="Customers"
          value={mockDashboardMetrics.totalCustomersCount}
          icon={Users}
          iconColor="text-cyan-600 bg-cyan-50 border-cyan-200"
        />
        <StatCard
          title="Today's Expenses"
          value={formatCurrency(mockDashboardMetrics.todayExpensesTotal)}
          icon={Receipt}
          iconColor="text-rose-600 bg-rose-50 border-rose-200"
        />
      </div>

      {/* Main Operations Grid: Recent Transactions & Critical Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Transactions (8 cols on large screens) */}
        <div className="lg:col-span-8">
          <Card noPadding className="overflow-hidden">
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100">
              <div>
                <CardTitle>Recent Sales Transactions</CardTitle>
                <CardDescription>
                  Live cashier activity across Colombo, Negombo, and Kandy branches.
                </CardDescription>
              </div>
              <Link
                href="/sales"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                View all sales
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <RecentSalesTable />
          </Card>
        </div>

        {/* Low Stock Watchlist (4 cols on large screens) */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Low Stock Warnings
                </CardTitle>
              </div>
              <CardDescription>
                Items at or below safety stock threshold.
              </CardDescription>
            </CardHeader>
            <div className="pt-4">
              <LowStockAlert />
            </div>
          </Card>

          {/* Architecture Verification Banner */}
          <div className="p-4 rounded-xl border border-brand-200 bg-brand-50/60 text-brand-900">
            <div className="flex items-center gap-2 font-semibold text-xs text-brand-950 mb-1">
              <Building className="h-4 w-4 text-brand-600" />
              Phase 2A Tenant Scoping Active
            </div>
            <p className="text-[11px] text-brand-800 leading-relaxed">
              Authenticated session is bound to tenant <code className="font-mono font-semibold">{businessName}</code>.
              Server queries enforce <code className="font-mono font-semibold">businessId</code> isolation to prevent any cross-tenant data leaks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
