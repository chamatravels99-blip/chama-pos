"use client";

import React, { useState, useEffect } from "react";
import { X, Package, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useBranch } from "@/components/context/BranchContext";

export interface ProductFormData {
  name: string;
  sku: string;
  barcode: string;
  categoryName: string;
  brand: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  status: "active" | "inactive";
  description: string;
}

interface ProductFormProps {
  mode: "create" | "edit";
  initialData?: Partial<ProductFormData> & { _id?: string };
  onSuccess: () => void;
  onCancel: () => void;
}

const EMPTY_FORM: ProductFormData = {
  name: "",
  sku: "",
  barcode: "",
  categoryName: "",
  brand: "",
  unit: "pcs",
  costPrice: "",
  sellingPrice: "",
  status: "active",
  description: "",
};

export function ProductForm({ mode, initialData, onSuccess, onCancel }: ProductFormProps) {
  const { branches, selectedBranchId: activeBranchId } = useBranch();
  const [form, setForm] = useState<ProductFormData>({ ...EMPTY_FORM });
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [openingQuantity, setOpeningQuantity] = useState("0");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || "",
        sku: initialData.sku || "",
        barcode: initialData.barcode || "",
        categoryName: initialData.categoryName || "",
        brand: initialData.brand || "",
        unit: initialData.unit || "pcs",
        costPrice: initialData.costPrice !== undefined ? String(initialData.costPrice) : "",
        sellingPrice: initialData.sellingPrice !== undefined ? String(initialData.sellingPrice) : "",
        status: initialData.status || "active",
        description: initialData.description || "",
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
    setErrorMsg("");
  }, [initialData, mode]);

  useEffect(() => {
    if (mode !== "create") return;
    const creationBranches = activeBranchId && activeBranchId !== "ALL"
      ? branches.filter((branch) => branch._id === activeBranchId)
      : branches;
    setSelectedBranchId(
      activeBranchId && activeBranchId !== "ALL"
        ? activeBranchId
        : creationBranches[0]?._id || ""
    );
    if (creationBranches.length === 0) {
      setErrorMsg("No accessible active branches are available for this business.");
    } else {
      setErrorMsg("");
    }
  }, [mode, branches, activeBranchId]);

  const creationBranches = activeBranchId && activeBranchId !== "ALL"
    ? branches.filter((branch) => branch._id === activeBranchId)
    : branches;

  function set(field: keyof ProductFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    // Client-side pre-validation
    if (!form.name.trim()) { setErrorMsg("Product name is required."); return; }
    if (!form.sku.trim()) { setErrorMsg("SKU is required."); return; }
    if (form.costPrice === "" || isNaN(Number(form.costPrice)) || Number(form.costPrice) < 0) {
      setErrorMsg("Cost price must be a valid non-negative number."); return;
    }
    if (form.sellingPrice === "" || isNaN(Number(form.sellingPrice)) || Number(form.sellingPrice) < 0) {
      setErrorMsg("Selling price must be a valid non-negative number."); return;
    }
    const openingQuantityValue = Number(openingQuantity);
    const lowStockThresholdValue = Number(lowStockThreshold);
    if (mode === "create" && !selectedBranchId) {
      setErrorMsg("Select an accessible branch."); return;
    }
    if (mode === "create" && (!openingQuantity.trim() || !Number.isFinite(openingQuantityValue) || openingQuantityValue < 0)) {
      setErrorMsg("Opening quantity must be a non-negative finite number."); return;
    }
    if (mode === "create" && (!lowStockThreshold.trim() || !Number.isFinite(lowStockThresholdValue) || lowStockThresholdValue < 0)) {
      setErrorMsg("Low stock threshold must be a non-negative finite number."); return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        barcode: form.barcode.trim() || undefined,
        categoryName: form.categoryName.trim() || undefined,
        brand: form.brand.trim() || undefined,
        unit: form.unit.trim() || "pcs",
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        status: form.status,
        description: form.description.trim() || undefined,
        ...(mode === "create" ? {
          branchId: selectedBranchId,
          openingQuantity: openingQuantityValue,
          lowStockThreshold: lowStockThresholdValue,
        } : {}),
      };

      const url = mode === "edit" && initialData?._id
        ? `/api/products/${initialData._id}`
        : "/api/products";
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to save product.");
        return;
      }

      onSuccess();
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Package className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              {mode === "create" ? "Add New Product" : "Edit Product"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[75vh]">
          <div className="p-6 space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {mode === "create" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="sm:col-span-3">
                  <label className={labelClass}>Branch <span className="text-rose-500">*</span></label>
                  <select
                    value={selectedBranchId}
                    onChange={(event) => {
                      setSelectedBranchId(event.target.value);
                      setOpeningQuantity("0");
                      setLowStockThreshold("5");
                    }}
                    className={inputClass}
                    disabled={branches.length === 0}
                    required
                  >
                    <option value="">{branches.length === 0 ? "Loading branches..." : "Select a branch"}</option>
                    {creationBranches.map((branch) => (
                      <option key={branch._id} value={branch._id}>{branch.name} ({branch.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Opening Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={openingQuantity}
                    onChange={(event) => setOpeningQuantity(event.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Low Stock Threshold</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={lowStockThreshold}
                    onChange={(event) => setLowStockThreshold(event.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
              </div>
            )}

            {/* Row 1: Name */}
            <div>
              <label className={labelClass}>Product Name <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
                placeholder="e.g. Compact Bluetooth Speaker"
                required
              />
            </div>

            {/* Row 2: SKU + Barcode */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>SKU <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => set("sku", e.target.value.toUpperCase())}
                  className={cn(inputClass, "font-mono")}
                  placeholder="e.g. SKU-001"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Barcode</label>
                <input
                  type="text"
                  value={form.barcode}
                  onChange={(e) => set("barcode", e.target.value)}
                  className={cn(inputClass, "font-mono")}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Row 3: Category + Brand */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Category</label>
                <input
                  type="text"
                  value={form.categoryName}
                  onChange={(e) => set("categoryName", e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Accessories"
                />
              </div>
              <div>
                <label className={labelClass}>Brand</label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => set("brand", e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Example brand"
                />
              </div>
            </div>

            {/* Row 4: Cost Price + Selling Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Cost Price <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.costPrice}
                    onChange={(e) => set("costPrice", e.target.value)}
                    className={cn(inputClass, "pl-6")}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Selling Price <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.sellingPrice}
                    onChange={(e) => set("sellingPrice", e.target.value)}
                    className={cn(inputClass, "pl-6")}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Row 5: Unit + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Unit</label>
                <select
                  value={form.unit}
                  onChange={(e) => set("unit", e.target.value)}
                  className={inputClass}
                >
                  <option value="pcs">pcs</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="liter">liter</option>
                  <option value="set">set</option>
                  <option value="box">box</option>
                  <option value="pair">pair</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as "active" | "inactive")}
                  className={inputClass}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Row 6: Description */}
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className={cn(inputClass, "resize-none h-20")}
                placeholder="Optional product description..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isLoading} disabled={mode === "create" && branches.length === 0}>
              {isLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {mode === "create" ? "Add Product" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelClass = "block text-xs font-semibold text-slate-700 mb-1";
const inputClass =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors";
