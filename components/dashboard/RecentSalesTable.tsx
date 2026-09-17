import React from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { mockRecentSales } from "@/services/mock-data";
import { CreditCard, Banknote, Landmark, Smartphone, Eye } from "lucide-react";
import Link from "next/link";

export function RecentSalesTable() {
  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "card":
        return <CreditCard className="h-3.5 w-3.5 text-blue-600" />;
      case "cash":
        return <Banknote className="h-3.5 w-3.5 text-emerald-600" />;
      case "bank_transfer":
        return <Landmark className="h-3.5 w-3.5 text-purple-600" />;
      case "mobile_wallet":
        return <Smartphone className="h-3.5 w-3.5 text-amber-600" />;
      default:
        return <CreditCard className="h-3.5 w-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-slate-600">
        <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="py-3 px-4">Invoice</th>
            <th className="py-3 px-4">Customer</th>
            <th className="py-3 px-4 hidden md:table-cell">Branch</th>
            <th className="py-3 px-4">Method</th>
            <th className="py-3 px-4 text-right">Amount</th>
            <th className="py-3 px-4 hidden sm:table-cell">Time</th>
            <th className="py-3 px-4 text-center">Status</th>
            <th className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {mockRecentSales.map((sale) => (
            <tr key={sale._id} className="hover:bg-slate-50/75 transition-colors">
              <td className="py-3 px-4 font-mono font-medium text-slate-900">
                {sale.invoiceNumber}
              </td>
              <td className="py-3 px-4">
                <div className="font-medium text-slate-800">{sale.customerName}</div>
                <div className="text-[11px] text-slate-400">
                  {sale.itemCount} {sale.itemCount === 1 ? "item" : "items"}
                </div>
              </td>
              <td className="py-3 px-4 hidden md:table-cell text-slate-500">
                {sale.branchName}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1.5 capitalize text-slate-700">
                  {getPaymentIcon(sale.paymentMethod)}
                  <span>{sale.paymentMethod.replace("_", " ")}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-right font-semibold text-slate-900">
                {formatCurrency(sale.grandTotal)}
              </td>
              <td className="py-3 px-4 hidden sm:table-cell text-slate-400">
                {formatDateTime(sale.createdAt)}
              </td>
              <td className="py-3 px-4 text-center">
                <Badge variant="success" size="sm">
                  {sale.status}
                </Badge>
              </td>
              <td className="py-3 px-4 text-right">
                <Link
                  href="/sales"
                  className="inline-flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="View Sale Details"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
