import React from "react";
import { Boxes, ArrowUpDown, ArrowDownToLine, RefreshCw, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LowStockAlert } from "@/components/dashboard/LowStockAlert";

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory & Stock Management"
        description="Multi-branch stock tracking, threshold monitoring, and stock movement logs."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
            Branch Transfer
          </Button>
          <Button variant="primary" size="sm">
            <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" />
            Receive Stock
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Branch Stock Allocation</CardTitle>
              <CardDescription>
                Live stock levels across all configured branch locations.
              </CardDescription>
            </CardHeader>
            <div className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="text-xs font-semibold text-slate-700">Colombo Main Flagship</div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">1,480 pcs</div>
                  <div className="text-[11px] text-slate-400 mt-1">Valuation: $42,500</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="text-xs font-semibold text-slate-700">Negombo Auto Center</div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">820 pcs</div>
                  <div className="text-[11px] text-slate-400 mt-1">Valuation: $21,100</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="text-xs font-semibold text-slate-700">Kandy Express Branch</div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">610 pcs</div>
                  <div className="text-[11px] text-slate-400 mt-1">Valuation: $15,800</div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-8 text-center border-dashed border-slate-300">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 mb-3">
              <Boxes className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              Stock Movement Audit Architecture
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Prepared for immutable stock movement logs (<code className="text-brand-600 font-mono">StockMovement</code>) capturing purchase receiving, POS checkout deductions, transfers, and inventory write-offs.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Badge variant="default" size="md">Phase 1 Foundation</Badge>
              <Badge variant="outline" size="md">Stock Ledger in Phase 2</Badge>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Active Low Stock Warnings
              </CardTitle>
              <CardDescription>
                Automatic reorder triggers per branch.
              </CardDescription>
            </CardHeader>
            <div className="pt-4">
              <LowStockAlert />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
