"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useBranch } from "@/components/context/BranchContext";
import { Printer, RefreshCw } from "lucide-react";

interface HistorySale {
  _id: string;
  invoiceNumber: string;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
  items?: { quantity: number }[];
  paymentMethod: string;
  grandTotal: number;
  status: string;
  createdAt: string;
  branchId: string;
}

export function SalesHistory({ refreshKey = 0 }: { refreshKey?: number }) {
  const { selectedBranchId, branches } = useBranch();
  const [sales, setSales] = useState<HistorySale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSales = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "20", page: "1" });
      if (selectedBranchId && selectedBranchId !== "ALL") {
        params.set("branchId", selectedBranchId);
      }
      const res = await fetch(`/api/sales?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load sales.");
      }
      setSales(data.sales || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sales.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadSales();
  }, [loadSales, refreshKey]);

  function branchName(branchId: string): string {
    return branches.find((b) => b._id === branchId)?.name || branchId;
  }

  function openPrint(saleId: string, format: "80mm" | "A4") {
    window.open(`/print/sales/${encodeURIComponent(saleId)}?format=${format}`, "_blank", "noopener,noreferrer");
  }

  return (
    <Card noPadding className="overflow-hidden">
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
        <div>
          <CardTitle>Completed Sales</CardTitle>
          <CardDescription>Live sales history for the current tenant and allowed branches.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={loadSales}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {error && <p className="px-4 py-3 text-xs text-rose-600">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-3 px-4">Invoice</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Cashier</th>
              <th className="py-3 px-4 hidden md:table-cell">Branch</th>
              <th className="py-3 px-4">Method</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-4 hidden sm:table-cell">Time</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Print</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td className="py-6 px-4 text-slate-400" colSpan={9}>
                  Loading sales…
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td className="py-6 px-4 text-slate-400" colSpan={9}>
                  No sales recorded yet.
                </td>
              </tr>
            ) : (
              sales.map((sale) => {
                const itemCount = (sale.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
                return (
                  <tr key={sale._id} className="hover:bg-slate-50/75">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">{sale.invoiceNumber}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{sale.customerName || "Walk-in"}</div>
                      {sale.customerPhone && <div className="text-[11px] text-slate-400">{sale.customerPhone}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{sale.cashierName}</div>
                      <div className="text-[11px] text-slate-400">
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-slate-500">{branchName(sale.branchId)}</td>
                    <td className="py-3 px-4 capitalize">{sale.paymentMethod.replace("_", " ")}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      {formatCurrency(sale.grandTotal)}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">{formatDateTime(sale.createdAt)}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={sale.status === "completed" ? "success" : "secondary"} size="sm">
                        {sale.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {sale.status === "completed" && (
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openPrint(sale._id, "80mm")} aria-label={`Print ${sale.invoiceNumber} as 80mm receipt`}>
                            <Printer className="mr-1 h-3 w-3" /> 80mm
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openPrint(sale._id, "A4")} aria-label={`Print ${sale.invoiceNumber} as A4 invoice`}>
                            A4
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
