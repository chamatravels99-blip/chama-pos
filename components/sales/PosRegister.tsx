"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { useBranch } from "@/components/context/BranchContext";

interface CatalogProduct {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  price?: number;
  sellingPrice?: number;
  status?: string;
  brand?: string;
}

interface CartLine {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "mobile_wallet", label: "Mobile Wallet" },
] as const;

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function PosRegister({ onSaleCompleted }: { onSaleCompleted?: () => void }) {
  const { branches, selectedBranchId, selectedBranchName, setSelectedBranch, canSelectAllBranches } =
    useBranch();

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]["value"]>("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const branchLockedToAll = selectedBranchId === "ALL" || !selectedBranchId;

  const fetchProducts = useCallback(async (term: string) => {
    setIsSearching(true);
    try {
      const params = new URLSearchParams({
        status: "active",
        limit: "30",
      });
      if (term.trim()) params.set("search", term.trim());
      const res = await fetch(`/api/products?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load products.");
      }
      setProducts(data.products || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products.");
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      fetchProducts(search);
    }, 250);
    return () => clearTimeout(handle);
  }, [search, fetchProducts]);

  const subtotal = useMemo(
    () => money(cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)),
    [cart]
  );
  const discountValue = Math.max(0, Number(discount) || 0);
  const safeDiscount = money(Math.min(discountValue, subtotal));
  const total = money(Math.max(0, subtotal - safeDiscount));
  const paid = Number(paidAmount);
  const change =
    paymentMethod === "cash" && Number.isFinite(paid) ? money(Math.max(0, paid - total)) : 0;

  useEffect(() => {
    if (paymentMethod !== "cash") {
      setPaidAmount(total > 0 ? String(total) : "");
    }
  }, [paymentMethod, total]);

  function productPrice(product: CatalogProduct): number {
    return Number(product.sellingPrice ?? product.price ?? 0);
  }

  function addToCart(product: CatalogProduct) {
    setError("");
    setSuccess("");
    setCart((prev) => {
      const existing = prev.find((line) => line.productId === product._id);
      if (existing) {
        return prev.map((line) =>
          line.productId === product._id ? { ...line, quantity: money(line.quantity + 1) } : line
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          sku: product.sku,
          unitPrice: productPrice(product),
          quantity: 1,
        },
      ];
    });
  }

  function updateQty(productId: string, nextQty: number) {
    setCart((prev) => {
      if (nextQty <= 0) return prev.filter((line) => line.productId !== productId);
      return prev.map((line) =>
        line.productId === productId ? { ...line, quantity: money(nextQty) } : line
      );
    });
  }

  async function completeSale() {
    setError("");
    setSuccess("");

    if (branchLockedToAll) {
      setError('Select a specific branch before completing a sale. "All Branches" cannot be used.');
      return;
    }
    if (cart.length === 0) {
      setError("Add at least one product to the cart.");
      return;
    }
    if (!Number.isFinite(paid) || paid < total) {
      setError("Paid amount must cover the sale total.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: selectedBranchId,
          items: cart.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
          })),
          discountAmount: safeDiscount,
          paymentMethod,
          paidAmount: paid,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete sale.");
      }

      setSuccess(`Sale ${data.sale.invoiceNumber} completed.`);
      setCart([]);
      setDiscount("0");
      setPaidAmount("");
      onSaleCompleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete sale.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <Card className="xl:col-span-3 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">POS Register</h3>
            <p className="text-xs text-slate-500">Search catalog, add items, and complete checkout.</p>
          </div>
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-slate-400" />
            <select
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              {canSelectAllBranches && <option value="ALL">All Branches</option>}
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {branchLockedToAll && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            Select a specific branch to create a sale. Checkout is disabled while &quot;All Branches&quot; is selected.
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name, SKU, or barcode"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400"
          />
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
          {isSearching && products.length === 0 ? (
            <p className="p-4 text-xs text-slate-500">Searching products…</p>
          ) : products.length === 0 ? (
            <p className="p-4 text-xs text-slate-500">No products found.</p>
          ) : (
            products.map((product) => (
              <div key={product._id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {product.sku}
                    {product.barcode ? ` · ${product.barcode}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-slate-900">
                    {formatCurrency(productPrice(product))}
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => addToCart(product)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="xl:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-brand-600" />
            <h3 className="text-base font-semibold text-slate-900">Cart</h3>
          </div>
          <Badge variant="secondary">{cart.length} items</Badge>
        </div>

        <div className="max-h-56 overflow-y-auto space-y-2">
          {cart.length === 0 ? (
            <p className="text-xs text-slate-500">Cart is empty.</p>
          ) : (
            cart.map((line) => (
              <div key={line.productId} className="rounded-lg border border-slate-100 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{line.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{line.sku}</p>
                  </div>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-rose-600"
                    onClick={() => updateQty(line.productId, 0)}
                    aria-label={`Remove ${line.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => updateQty(line.productId, line.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-semibold">{line.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => updateQty(line.productId, line.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatCurrency(money(line.unitPrice * line.quantity))}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2 text-sm border-t border-slate-100 pt-3">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <label className="flex items-center justify-between gap-3">
            <span className="text-slate-600">Discount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="h-8 w-28 rounded-md border border-slate-300 px-2 text-right text-sm"
            />
          </label>
          <div className="flex justify-between font-semibold text-slate-900">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-600">Payment method</label>
          <select
            value={paymentMethod}
            onChange={(e) =>
              setPaymentMethod(e.target.value as (typeof PAYMENT_METHODS)[number]["value"])
            }
            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
          <label className="block text-xs font-medium text-slate-600">Paid amount</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm"
          />
          <div className="flex justify-between text-sm text-slate-600">
            <span>Change</span>
            <span className="font-medium text-slate-900">{formatCurrency(change)}</span>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            {success}
          </div>
        )}

        <Button
          className="w-full"
          onClick={completeSale}
          disabled={isSubmitting || branchLockedToAll || cart.length === 0}
          isLoading={isSubmitting}
        >
          Complete Sale
        </Button>
        <p className="text-[11px] text-slate-400">
          Checkout branch: {selectedBranchName}. Prices shown in the cart are estimates; the server
          finalizes amounts from the product catalog.
        </p>
      </Card>
    </div>
  );
}
