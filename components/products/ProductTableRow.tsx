"use client";

import React from "react";
import { Package, Edit2, ToggleLeft, ToggleRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

export interface ProductRow {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  categoryName?: string;
  brand?: string;
  costPrice: number;
  price: number;
  sellingPrice?: number;
  status: "active" | "inactive";
  stockByBranch?: Array<{ branchId: string; quantity: number }>;
}

interface ProductTableRowProps {
  product: ProductRow;
  onEdit: (product: ProductRow) => void;
  onToggleStatus: (product: ProductRow) => void;
}

export function ProductTableRow({ product, onEdit, onToggleStatus }: ProductTableRowProps) {
  const totalStock = (product.stockByBranch || []).reduce(
    (sum, b) => sum + (b.quantity || 0),
    0
  );
  const sellingPrice = product.sellingPrice ?? product.price;

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors group">
      {/* Product Name + SKU */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
            <Package className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate max-w-[200px]">{product.name}</p>
            {product.brand && (
              <p className="text-[11px] text-slate-400 truncate">{product.brand}</p>
            )}
          </div>
        </div>
      </td>

      {/* SKU / Barcode */}
      <td className="px-4 py-3">
        <div className="space-y-0.5">
          <p className="text-xs font-mono font-medium text-slate-700">{product.sku}</p>
          {product.barcode && (
            <p className="text-[11px] font-mono text-slate-400">{product.barcode}</p>
          )}
        </div>
      </td>

      {/* Category */}
      <td className="px-4 py-3">
        <span className="text-xs text-slate-600">
          {product.categoryName || <span className="text-slate-300 italic">–</span>}
        </span>
      </td>

      {/* Cost Price */}
      <td className="px-4 py-3">
        <span className="text-xs text-slate-600 font-medium">
          {formatCurrency(product.costPrice)}
        </span>
      </td>

      {/* Selling Price */}
      <td className="px-4 py-3">
        <span className="text-xs font-semibold text-slate-900">
          {formatCurrency(sellingPrice)}
        </span>
      </td>

      {/* Stock */}
      <td className="px-4 py-3">
        <span className={`text-xs font-medium ${totalStock === 0 ? "text-rose-600" : totalStock <= 5 ? "text-amber-600" : "text-emerald-600"}`}>
          {totalStock}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <Badge
          variant={product.status === "active" ? "success" : "secondary"}
          size="sm"
        >
          {product.status === "active" ? "Active" : "Inactive"}
        </Badge>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-slate-600 hover:text-brand-600"
            onClick={() => onEdit(product)}
            title="Edit product"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 ${product.status === "active" ? "text-slate-600 hover:text-amber-600" : "text-slate-600 hover:text-emerald-600"}`}
            onClick={() => onToggleStatus(product)}
            title={product.status === "active" ? "Deactivate product" : "Activate product"}
          >
            {product.status === "active" ? (
              <ToggleRight className="h-4 w-4" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </td>
    </tr>
  );
}
