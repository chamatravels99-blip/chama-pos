import React from "react";
import { ShoppingCart, Plus, Filter, Search, Printer, History } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RecentSalesTable } from "@/components/dashboard/RecentSalesTable";

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales & POS Register"
        description="Process checkout orders, manage parked tickets, and review completed invoices."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <History className="h-3.5 w-3.5 mr-1.5" />
            Cash Register Sessions
          </Button>
          <Button variant="primary" size="sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Open Register / New Sale
          </Button>
        </div>
      </PageHeader>

      {/* POS Terminal Simulation Card */}
      <div className="p-4 rounded-xl border border-brand-200 bg-brand-50/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-900">
              Terminal POS Register Engine
            </h4>
            <p className="text-[11px] text-slate-500">
              Supports barcode scanner input, split cash/card payment, tax calculations, and thermal receipts.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" size="md">Multi-Branch Sync</Badge>
          <Badge variant="outline" size="md">Offline Fallback Ready</Badge>
        </div>
      </div>

      {/* Sales Invoices Table */}
      <Card noPadding className="overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
          <div>
            <CardTitle>Completed Sales Orders</CardTitle>
            <CardDescription>
              Chronological ledger of customer purchases across active branches.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Export Orders
            </Button>
          </div>
        </div>
        <RecentSalesTable />
      </Card>
    </div>
  );
}
