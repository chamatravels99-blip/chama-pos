import React from "react";
import { mockLowStockProducts } from "@/services/mock-data";
import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

export function LowStockAlert() {
  return (
    <div className="space-y-3">
      {mockLowStockProducts.map((item) => {
        const isOutOfStock = item.currentStock === 0;

        return (
          <div
            key={item.productId}
            className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                  isOutOfStock
                    ? "bg-rose-50 text-rose-600 border-rose-200"
                    : "bg-amber-50 text-amber-600 border-amber-200"
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 leading-snug line-clamp-1">
                  {item.productName}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-mono text-slate-500">
                    SKU: {item.sku}
                  </span>
                  <span className="text-[10px] text-slate-300">&bull;</span>
                  <span className="text-[11px] text-slate-500">{item.branchName}</span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0 pl-3">
              <Badge variant={isOutOfStock ? "danger" : "warning"} size="sm">
                {isOutOfStock ? "Out of Stock" : `${item.currentStock} left`}
              </Badge>
              <div className="text-[10px] text-slate-400 mt-1">
                Min: {item.lowStockThreshold}
              </div>
            </div>
          </div>
        );
      })}

      <div className="pt-2 text-center">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          View all inventory stock alerts
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
