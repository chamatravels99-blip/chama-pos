"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface CustomerPurchase {
  _id: string;
  invoiceNumber: string;
  createdAt: string;
  grandTotal: number;
  paymentStatus: string;
  paymentMethod: string;
}

export function CustomerPurchaseHistory({ customerId, canViewSales }: { customerId: string; canViewSales: boolean }) {
  const [sales, setSales] = useState<CustomerPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canViewSales) return;
    let isActive = true;
    async function loadHistory() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/customers/${encodeURIComponent(customerId)}/sales?limit=50`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load purchase history.");
        if (isActive) setSales(data.sales || []);
      } catch (loadError) {
        if (isActive) setError(loadError instanceof Error ? loadError.message : "Failed to load purchase history.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    }
    void loadHistory();
    return () => { isActive = false; };
  }, [canViewSales, customerId]);

  if (!canViewSales) {
    return <p className="mt-2 text-xs text-slate-500">Sales permission is required to view purchase history.</p>;
  }
  if (isLoading) return <p className="mt-2 text-xs text-slate-500">Loading purchase history...</p>;
  if (error) return <p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>;
  if (sales.length === 0) return <p className="mt-2 text-xs text-slate-500">No sales recorded for this customer.</p>;

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[600px] text-left text-xs text-slate-600">
        <thead className="border-b border-slate-200 text-[10px] font-semibold uppercase text-slate-500">
          <tr>
            <th className="py-2 pr-3">Invoice</th>
            <th className="py-2 pr-3">Date</th>
            <th className="py-2 pr-3 text-right">Total</th>
            <th className="py-2 pr-3">Payment Status</th>
            <th className="py-2">Method</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sales.map((sale) => (
            <tr key={sale._id}>
              <td className="py-2 pr-3 font-mono">{sale.invoiceNumber}</td>
              <td className="py-2 pr-3">{formatDateTime(sale.createdAt)}</td>
              <td className="py-2 pr-3 text-right">{formatCurrency(sale.grandTotal)}</td>
              <td className="py-2 pr-3 capitalize">{sale.paymentStatus}</td>
              <td className="py-2 capitalize">{sale.paymentMethod.replace(/_/g, " ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
