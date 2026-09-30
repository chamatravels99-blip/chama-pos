"use client";

import React, { useEffect, useState } from "react";
import { Building2, FileText, Mail, Phone, Plus, Search, Truck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

interface SupplierRow {
  _id: string;
  companyName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  category?: string;
  status: "active" | "inactive";
}

type SupplierForm = Omit<SupplierRow, "_id">;

const emptyForm: SupplierForm = {
  companyName: "",
  contactPerson: "",
  phone: "",
  email: "",
  category: "",
  status: "active",
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SupplierRow | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  async function loadSuppliers() {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/suppliers", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load suppliers.");
      setSuppliers(data.suppliers || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load suppliers.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void loadSuppliers(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  }

  function openEdit(supplier: SupplierRow) {
    setEditing(supplier);
    setShowForm(true);
    setForm({
      companyName: supplier.companyName,
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      category: supplier.category || "",
      status: supplier.status,
    });
  }

  async function saveSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch(editing ? `/api/suppliers/${editing._id}` : "/api/suppliers", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save supplier.");
      setEditing(null);
      setShowForm(false);
      await loadSuppliers();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save supplier.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSupplier(supplier: SupplierRow) {
    if (!window.confirm(`Delete ${supplier.companyName}?`)) return;
    try {
      const response = await fetch(`/api/suppliers/${supplier._id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delete supplier.");
      await loadSuppliers();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete supplier.");
    }
  }

  const filteredSuppliers = suppliers.filter((supplier) =>
    `${supplier.companyName} ${supplier.contactPerson || ""} ${supplier.category || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier & Vendor Directory"
        description="Manage product suppliers, wholesale vendor terms, and procurement orders."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Purchase Orders
          </Button>
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Supplier
          </Button>
        </div>
      </PageHeader>

      <Card noPadding className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <CardTitle>Wholesale Vendors</CardTitle>
            <CardDescription>Suppliers registered for this business.</CardDescription>
          </div>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-xs" placeholder="Search suppliers" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Supplier Company</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!isLoading && filteredSuppliers.map((supplier) => (
                <tr key={supplier._id} className="hover:bg-slate-50/75">
                  <td className="py-3 px-4 font-semibold text-slate-900">{supplier.companyName}</td>
                  <td className="py-3 px-4">{supplier.contactPerson || "—"}</td>
                  <td className="py-3 px-4 text-slate-500">{supplier.category || "—"}</td>
                  <td className="py-3 px-4 font-mono">{supplier.phone || supplier.email || "—"}</td>
                  <td className="py-3 px-4 text-center"><Badge variant={supplier.status === "active" ? "success" : "secondary"} size="sm">{supplier.status}</Badge></td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(supplier)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => void deleteSupplier(supplier)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error && <p role="alert" className="px-4 py-3 text-xs text-rose-700">{error}</p>}
        {isLoading && <p className="px-4 py-6 text-center text-xs text-slate-500">Loading suppliers...</p>}
        {!isLoading && filteredSuppliers.length === 0 && (
          <EmptyState icon={Truck} title={search ? "No matching suppliers" : "No suppliers yet"} description="Suppliers added here are visible only within this business." />
        )}
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveSupplier} className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-bold text-slate-900">{editing ? "Edit Supplier" : "Add Supplier"}</h2>
            {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
            <label className="block text-xs font-medium">Company name<input required value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium">Contact person<input value={form.contactPerson} onChange={(event) => setForm({ ...form, contactPerson: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
              <label className="block text-xs font-medium">Category<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
              <label className="block text-xs font-medium">Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
              <label className="block text-xs font-medium">Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
            </div>
            <label className="block text-xs font-medium">Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as SupplierForm["status"] })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); setEditing(null); setForm({ ...emptyForm }); }}>Cancel</Button><Button type="submit" size="sm" isLoading={isSaving}>{editing ? "Save Changes" : "Add Supplier"}</Button></div>
          </form>
        </div>
      )}
    </div>
  );
}
