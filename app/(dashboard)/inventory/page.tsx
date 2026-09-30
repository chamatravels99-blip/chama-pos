"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, RefreshCw, AlertTriangle, Plus, Minus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LowStockAlert, LowStockAlertItem } from "@/components/dashboard/LowStockAlert";

interface BranchOption { _id: string; name: string; code: string; }
interface InventoryRow {
  productId: string;
  variantId?: string | null;
  productName: string;
  sku: string;
  barcode?: string;
  branchId: string;
  branchName: string;
  stock: number;
  lowStockThreshold: number;
  costPrice: number;
  sellingPrice: number;
  isLowStock: boolean;
  hasVariants?: boolean;
  variantName?: string | null;
}
interface MovementRow {
  _id: string;
  businessId: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  variantId?: string;
  type: string;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  userId: string;
  userName: string;
  notes?: string;
  createdAt: string;
}
interface ProductOption {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  variants?: Array<{ _id?: string; name: string; sku: string; barcode?: string; stockByBranch?: Array<{ branchId: string; quantity: number; lowStockThreshold?: number }> }>;
  stockByBranch?: Array<{ branchId: string; quantity: number; lowStockThreshold?: number }>;
}

function hasBranchStock(
  stockByBranch: Array<{ branchId: string; quantity: number }> | undefined,
  branchId: string
) {
  return Boolean(branchId && stockByBranch?.some((stock) => stock.branchId === branchId));
}

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function InventoryPage() {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [canAdjust, setCanAdjust] = useState(false);

  const [form, setForm] = useState({
    branchId: "",
    productId: "",
    variantId: "",
    quantity: "",
    notes: "",
    type: "purchase_received",
  });

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [branchesRes, productsRes, inventoryRes, movementsRes] = await Promise.all([
        fetch("/api/branches", { cache: "no-store" }),
        fetch("/api/products?limit=500", { cache: "no-store" }),
        fetch(`/api/inventory${selectedBranch !== "ALL" ? `?branchId=${selectedBranch}` : ""}`, { cache: "no-store" }),
        fetch(`/api/inventory/movements${selectedBranch !== "ALL" ? `?branchId=${selectedBranch}` : ""}`, { cache: "no-store" }),
      ]);

      if (!branchesRes.ok || !productsRes.ok || !inventoryRes.ok || !movementsRes.ok) {
        const [branchesData, productsData, inventoryData, movementsData] = await Promise.all([
          branchesRes.json().catch(() => ({})),
          productsRes.json().catch(() => ({})),
          inventoryRes.json().catch(() => ({})),
          movementsRes.json().catch(() => ({})),
        ]);
        const message = inventoryData.error || productsData.error || branchesData.error || movementsData.error || "Failed to load inventory.";
        throw new Error(message);
      }

      const [branchesData, productsData, inventoryData, movementsData] = await Promise.all([
        branchesRes.json(),
        productsRes.json(),
        inventoryRes.json(),
        movementsRes.json(),
      ]);

      setBranches(branchesData.branches || []);
      setProducts(productsData.products || []);
      setRows(inventoryData.rows || []);
      setMovements(movementsData.movements || []);

      const currentUserRes = await fetch("/api/auth/me", { cache: "no-store" });
      if (currentUserRes.ok) {
        const currentUserData = await currentUserRes.json();
        const permissions = currentUserData.user?.permissions || [];
        setCanAdjust(permissions.includes("STOCK_ADJUST") || permissions.includes("inventory:adjust") || permissions.includes("STOCK_ADD"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedBranch]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const branchOptions = useMemo(() => {
    if (selectedBranch !== "ALL") {
      return branches;
    }
    return [{ _id: "ALL", name: "All Branches", code: "ALL" }, ...branches];
  }, [branches, selectedBranch]);

  const lowStockItems = useMemo<LowStockAlertItem[]>(() => { 
    return rows
      .filter((row) => row.isLowStock)
      .slice(0, 6)
      .map((row) => ({
        productId: row.productId,
        productName: row.productName,
        sku: row.sku,
        currentStock: row.stock,
        lowStockThreshold: row.lowStockThreshold,
        branchName: row.branchName,
      }));
  }, [rows]);

  const summary = useMemo(() => {
    const totalProducts = new Set(rows.map((row) => row.productId)).size;
    const totalStockUnits = rows.reduce((sum, row) => sum + Number(row.stock || 0), 0);
    const lowStockItemsCount = rows.filter((row) => row.isLowStock).length;
    const stockValue = rows.reduce((sum, row) => sum + (Number(row.stock || 0) * Number(row.costPrice || 0)), 0);
    return { totalProducts, totalStockUnits, lowStockItemsCount, stockValue };
  }, [rows]);

  const productOptions = useMemo(() => {
    return products.filter((product) =>
      hasBranchStock(product.stockByBranch, form.branchId) ||
      product.variants?.some((variant) => hasBranchStock(variant.stockByBranch, form.branchId))
    );
  }, [products, form.branchId]);

  const selectedProduct = productOptions.find((product) => product._id === form.productId) || null;
  const hasBaseProductStock = hasBranchStock(selectedProduct?.stockByBranch, form.branchId);
  const variantOptions = (selectedProduct?.variants || []).filter((variant) =>
    variant && variant.name && hasBranchStock(variant.stockByBranch, form.branchId)
  );

  useEffect(() => {
    if (!showReceiveModal && !showAdjustModal) {
      setForm({
        branchId: branches[0]?._id || "",
        productId: "",
        variantId: "",
        quantity: "",
        notes: "",
        type: "purchase_received",
      });
    }
  }, [showReceiveModal, showAdjustModal, branches]);

  async function submitInventoryAdjustment(mode: "receive" | "adjust") {
    if (!form.branchId || !form.productId || !form.quantity) {
      setToast({ type: "error", message: "Branch, product and quantity are required." });
      return;
    }

    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setToast({ type: "error", message: "Stock quantity must be greater than zero." });
      return;
    }

    const payload = {
      branchId: form.branchId,
      productId: form.productId,
      variantId: form.variantId || undefined,
      quantityChange: mode === "receive" ? quantity : Number(form.quantity) * (form.type === "increase" ? 1 : -1),
      type: mode === "receive" ? "purchase_received" : (form.type === "increase" ? "adjustment" : "adjustment"),
      notes: form.notes || (mode === "receive" ? "Supplier delivery" : "Manual stock correction"),
    };

    if (!canAdjust && mode === "adjust") {
      setToast({ type: "error", message: "Unauthorized." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update stock.");
      setToast({ type: "success", message: data.message || "Stock updated successfully." });
      setShowReceiveModal(false);
      setShowAdjustModal(false);
      setForm({ branchId: form.branchId, productId: "", variantId: "", quantity: "", notes: "", type: "purchase_received" });
      await fetchData();
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Stock update failed." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 rounded-xl border px-4 py-3 text-xs font-medium shadow-xl ${toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {toast.message}
        </div>
      )}

      <PageHeader title="Inventory & Stock Management" description="Track stock, inventory health, and movement history by branch.">
        <div className="flex items-center gap-2">
          <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700">
            <option value="ALL">All Branches</option>
            {branches.map((branch) => (
              <option key={branch._id} value={branch._id}>{branch.name}</option>
            ))}
          </select>
          {canAdjust && (
              <Button variant="outline" size="sm" onClick={() => { setShowAdjustModal(true); setForm((prev) => ({ ...prev, type: "increase", branchId: prev.branchId || branches[0]?._id || "" })); }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Adjust Stock
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => { setShowReceiveModal(true); setForm((prev) => ({ ...prev, branchId: prev.branchId || branches[0]?._id || "" })); }}>
            <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" />
            Receive Stock
          </Button>
        </div>
      </PageHeader>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader><CardTitle>Total Products</CardTitle></CardHeader>
          <CardDescription className="pt-2 text-2xl font-bold text-slate-900">{summary.totalProducts}</CardDescription>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Stock Units</CardTitle></CardHeader>
          <CardDescription className="pt-2 text-2xl font-bold text-slate-900">{summary.totalStockUnits}</CardDescription>
        </Card>
        <Card>
          <CardHeader><CardTitle>Low Stock Items</CardTitle></CardHeader>
          <CardDescription className="pt-2 text-2xl font-bold text-slate-900">{summary.lowStockItemsCount}</CardDescription>
        </Card>
        <Card>
          <CardHeader><CardTitle>Stock Value</CardTitle></CardHeader>
          <CardDescription className="pt-2 text-2xl font-bold text-slate-900">{currency.format(summary.stockValue)}</CardDescription>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Inventory</CardTitle>
                  <CardDescription>Live stock levels across authorized branches.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchData} disabled={isLoading}>
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-3 pr-4">Product</th>
                    <th className="py-3 pr-4">SKU</th>
                    <th className="py-3 pr-4">Branch</th>
                    <th className="py-3 pr-4">Stock</th>
                    <th className="py-3 pr-4">Threshold</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Cost</th>
                    <th className="py-3 pr-4">Selling</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-xs text-slate-500">
                        {isLoading ? "Loading inventory..." : "No inventory rows available for the selected branch."}
                      </td>
                    </tr>
                  ) : rows.map((row) => (
                    <tr key={`${row.productId}-${row.branchId}-${row.variantId || "base"}`} className="border-b border-slate-100">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-slate-900">{row.productName}</div>
                        {row.variantName && <div className="text-[11px] text-slate-500">{row.variantName}</div>}
                      </td>
                      <td className="py-3 pr-4 font-mono text-[11px] text-slate-500">{row.sku}</td>
                      <td className="py-3 pr-4 text-slate-600">{row.branchName}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-900">{row.stock}</td>
                      <td className="py-3 pr-4 text-slate-600">{row.lowStockThreshold}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={row.isLowStock ? "warning" : "success"} size="sm">
                          {row.isLowStock ? "Low stock" : "Healthy"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{currency.format(row.costPrice)}</td>
                      <td className="py-3 pr-4 text-slate-600">{currency.format(row.sellingPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="xl:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Active Low Stock Warnings</CardTitle>
              <CardDescription>Reorder triggers for the selected or all authorized branches.</CardDescription>
            </CardHeader>
            <div className="pt-4">
              <LowStockAlert items={lowStockItems} />
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Movement History</CardTitle>
          <CardDescription>Newest movements first, scoped to the current tenant and authorized branches.</CardDescription>
        </CardHeader>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Product</th>
                <th className="py-3 pr-4">Branch</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Change</th>
                <th className="py-3 pr-4">Previous</th>
                <th className="py-3 pr-4">New</th>
                <th className="py-3 pr-4">User</th>
                <th className="py-3 pr-4">Notes</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-xs text-slate-500">No inventory movements recorded.</td></tr>
              ) : movements.map((movement) => (
                <tr key={movement._id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 text-slate-600">{new Date(movement.createdAt).toLocaleString()}</td>
                  <td className="py-3 pr-4 text-slate-700">{movement.productName || "Unknown Product"}</td>
                  <td className="py-3 pr-4 text-slate-600">{movement.branchName || "Unknown Branch"}</td>
                  <td className="py-3 pr-4"><Badge variant={movement.type === "sale" ? "secondary" : "success"} size="sm">{movement.type}</Badge></td>
                  <td className={`py-3 pr-4 font-medium ${movement.quantityChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{movement.quantityChange > 0 ? "+" : ""}{movement.quantityChange}</td>
                  <td className="py-3 pr-4 text-slate-600">{movement.previousQuantity}</td>
                  <td className="py-3 pr-4 text-slate-600">{movement.newQuantity}</td>
                  <td className="py-3 pr-4 text-slate-600">{movement.userName || "Unknown User"}</td>
                  <td className="py-3 pr-4 text-slate-600">{movement.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Receive Stock</h3>
            <p className="mt-1 text-xs text-slate-500">Use a positive quantity to add stock to the selected branch.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">Branch</label>
                <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value, productId: "", variantId: "" })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  {branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">Product</label>
                <select value={form.productId} onChange={(e) => {
                  const product = productOptions.find((item) => item._id === e.target.value);
                  const initialVariant = product?.variants?.find((variant) => hasBranchStock(variant.stockByBranch, form.branchId));
                  setForm((previous) => ({ ...previous, productId: e.target.value, variantId: initialVariant?._id || "" }));
                }} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Select a product</option>
                  {productOptions.map((product) => <option key={product._id} value={product._id}>{product.name} ({product.sku})</option>)}
                </select>
                {productOptions.length === 0 && <p className="mt-1 text-xs text-slate-500">No products have a stock record at this branch. Missing branch stock records are not created automatically.</p>}
              </div>
              {(variantOptions.length > 0 || (selectedProduct?.variants?.length ?? 0) > 0) && (
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">Variant</label>
                  <select value={form.variantId} onChange={(e) => setForm({ ...form, variantId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    {hasBaseProductStock && <option value="">Base product</option>}
                    {variantOptions.map((variant) => <option key={variant._id} value={variant._id}>{variant.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">Quantity</label>
                <input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} type="number" min="1" step="1" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="10" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Supplier delivery" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowReceiveModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={() => submitInventoryAdjustment("receive")} isLoading={isSubmitting}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Manual Stock Adjustment</h3>
            <p className="mt-1 text-xs text-slate-500">Set a positive or negative quantity while keeping the final stock above zero.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">Branch</label>
                <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value, productId: "", variantId: "" })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  {branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">Product</label>
                <select value={form.productId} onChange={(e) => {
                  const product = productOptions.find((item) => item._id === e.target.value);
                  const initialVariant = product?.variants?.find((variant) => hasBranchStock(variant.stockByBranch, form.branchId));
                  setForm((previous) => ({ ...previous, productId: e.target.value, variantId: initialVariant?._id || "" }));
                }} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Select a product</option>
                  {productOptions.map((product) => <option key={product._id} value={product._id}>{product.name} ({product.sku})</option>)}
                </select>
                {productOptions.length === 0 && <p className="mt-1 text-xs text-slate-500">No products have a stock record at this branch. Missing branch stock records are not created automatically.</p>}
              </div>
              {(variantOptions.length > 0 || (selectedProduct?.variants?.length ?? 0) > 0) && (
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">Variant</label>
                  <select value={form.variantId} onChange={(e) => setForm({ ...form, variantId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    {hasBaseProductStock && <option value="">Base product</option>}
                    {variantOptions.map((variant) => <option key={variant._id} value={variant._id}>{variant.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">Direction</label>
                <div className="flex gap-2">
                  <Button variant={form.type === "increase" ? "primary" : "outline"} size="sm" onClick={() => setForm({ ...form, type: "increase" })}><Plus className="h-3.5 w-3.5 mr-1.5" />Add</Button>
                  <Button variant={form.type === "decrease" ? "primary" : "outline"} size="sm" onClick={() => setForm({ ...form, type: "decrease" })}><Minus className="h-3.5 w-3.5 mr-1.5" />Reduce</Button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">Quantity</label>
                <input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} type="number" min="1" step="1" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="10" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">Reason / Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Cycle count adjustment" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAdjustModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={() => submitInventoryAdjustment("adjust")} isLoading={isSubmitting}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
