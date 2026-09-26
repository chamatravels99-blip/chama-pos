"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Package, ChevronLeft, ChevronRight, AlertCircle,
  RefreshCw, CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProductFilters, ProductFiltersState } from "@/components/products/ProductFilters";
import { ProductTableRow, ProductRow } from "@/components/products/ProductTableRow";
import { ProductForm } from "@/components/products/ProductForm";

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filters (client-side applied for responsiveness)
  const [filters, setFilters] = useState<ProductFiltersState>({
    search: "",
    status: "",
    category: "",
  });

  // Pagination
  const [page, setPage] = useState(1);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<ProductRow | null>(null);

  // Confirm-deactivate state
  const [deactivateTarget, setDeactivateTarget] = useState<ProductRow | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // ── Fetch products from API ─────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/products?limit=500", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load products.");
      }
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Auto-hide toast after 3.5 s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Client-side filtering ───────────────────────────────────────────
  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (filters.status && p.status !== filters.status) return false;
      if (filters.category) {
        const cat = (p.categoryName || "").toLowerCase();
        if (!cat.includes(filters.category.toLowerCase())) return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode || "").toLowerCase().includes(q) ||
          (p.brand || "").toLowerCase().includes(q) ||
          (p.categoryName || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, filters]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [filters]);

  // ── Pagination ──────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── Summary counts ──────────────────────────────────────────────────
  const totalActive = products.filter((p) => p.status === "active").length;
  const totalInactive = products.filter((p) => p.status === "inactive").length;

  // ── Handlers ────────────────────────────────────────────────────────
  function openCreate() {
    setEditTarget(null);
    setFormMode("create");
    setShowForm(true);
  }

  function openEdit(product: ProductRow) {
    setEditTarget(product);
    setFormMode("edit");
    setShowForm(true);
  }

  function handleFormSuccess() {
    setShowForm(false);
    setToast({ type: "success", message: formMode === "create" ? "Product added successfully." : "Product updated successfully." });
    fetchProducts();
  }

  function handleToggleStatus(product: ProductRow) {
    if (product.status === "active") {
      // Need confirmation before deactivating
      setDeactivateTarget(product);
    } else {
      // Activate directly
      handleActivate(product);
    }
  }

  async function handleActivate(product: ProductRow) {
    try {
      const res = await fetch(`/api/products/${product._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to activate.");
      setToast({ type: "success", message: `"${product.name}" reactivated.` });
      fetchProducts();
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to activate product." });
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    try {
      const res = await fetch(`/api/products/${deactivateTarget._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to deactivate.");
      setToast({ type: "success", message: `"${deactivateTarget.name}" deactivated.` });
      setDeactivateTarget(null);
      fetchProducts();
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to deactivate product." });
    } finally {
      setIsDeactivating(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl border text-xs font-medium transition-all animate-in slide-in-from-bottom-2 ${
          toast.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          {toast.message}
        </div>
      )}

      {/* Deactivate confirmation dialog */}
      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 mb-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Deactivate Product?</h3>
            <p className="text-xs text-slate-500 mb-4">
              <strong className="text-slate-700">{deactivateTarget.name}</strong> will be marked as inactive.
              It will not appear in active catalogs but sales history is preserved.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeactivateTarget(null)} disabled={isDeactivating}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={confirmDeactivate} isLoading={isDeactivating}>
                Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Product form modal */}
      {showForm && (
        <ProductForm
          mode={formMode}
          initialData={editTarget ? {
            _id: editTarget._id,
            name: editTarget.name,
            sku: editTarget.sku,
            barcode: editTarget.barcode,
            categoryName: editTarget.categoryName,
            brand: editTarget.brand,
            costPrice: String(editTarget.costPrice),
            sellingPrice: String(editTarget.sellingPrice ?? editTarget.price),
            status: editTarget.status,
          } : undefined}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Page header */}
      <PageHeader
        title="Products & Catalog"
        description="Manage your product catalog with tenant-isolated records."
      >
        <Button variant="outline" size="sm" onClick={fetchProducts} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <Button variant="primary" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Product
        </Button>
      </PageHeader>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700">
          <Package className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-semibold text-slate-900">{products.length}</span> total products
        </div>
        <Badge variant="success" size="sm">{totalActive} active</Badge>
        {totalInactive > 0 && <Badge variant="secondary" size="sm">{totalInactive} inactive</Badge>}
        {filtered.length !== products.length && (
          <Badge variant="default" size="sm">{filtered.length} matching filters</Badge>
        )}
      </div>

      {/* Filters */}
      <ProductFilters filters={filters} onChange={setFilters} />

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchProducts} className="ml-auto text-rose-600">Retry</Button>
        </div>
      )}

      {/* Products table */}
      <Card noPadding className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className={thClass}>Product</th>
                <th className={thClass}>SKU / Barcode</th>
                <th className={thClass}>Category</th>
                <th className={thClass}>Cost</th>
                <th className={thClass}>Sell Price</th>
                <th className={thClass}>Stock</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 animate-pulse">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-3 bg-slate-100 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                        <Package className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-xs font-medium text-slate-500">
                        {filters.search || filters.status || filters.category
                          ? "No products match your filters."
                          : "No products yet. Click \"Add Product\" to get started."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((product) => (
                  <ProductTableRow
                    key={product._id}
                    product={product}
                    onEdit={openEdit}
                    onToggleStatus={handleToggleStatus}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {!isLoading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-[11px] text-slate-500">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length} products
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-slate-600 px-2 font-medium">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

const thClass = "px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500";
