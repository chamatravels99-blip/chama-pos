"use client";

import { useEffect, useState } from "react";
import { Eye, Pencil, Plus, Search, UserRoundX, Users, X } from "lucide-react";
import { Customer } from "@/types/customer";
import { SessionUser } from "@/types";
import { CustomerForm, customerFormValues, CustomerFormValues } from "@/components/customers/CustomerForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { hasPermission } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

interface CustomerListResponse {
  customers: Customer[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

type ModalState = "create" | "edit" | null;

function formatDate(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleDateString();
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<CustomerListResponse["pagination"]>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [error, setError] = useState("");
  const canCreateCustomer = permissionsLoaded && currentUser !== null && hasPermission(currentUser, "CUSTOMER_CREATE");
  const canEditCustomer = permissionsLoaded && currentUser !== null && hasPermission(currentUser, "CUSTOMER_EDIT");
  const canDeactivateCustomer = permissionsLoaded && currentUser !== null && hasPermission(currentUser, "CUSTOMER_DELETE");

  async function loadCustomers() {
    setIsLoading(true);
    setError("");
    const query = new URLSearchParams({ search, status, page: String(page), limit: "50" });
    try {
      const response = await fetch(`/api/customers?${query}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load customers.");
      setCustomers(data.customers || []);
      setPagination(data.pagination);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load customers.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadCustomers(); }, 250);
    return () => window.clearTimeout(timer);
  }, [search, status, page]);

  useEffect(() => {
    let isMounted = true;
    async function loadCurrentUser() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await response.json();
        if (isMounted && data.authenticated && data.user) setCurrentUser(data.user);
      } catch {
        if (isMounted) setCurrentUser(null);
      } finally {
        if (isMounted) setPermissionsLoaded(true);
      }
    }
    void loadCurrentUser();
    return () => { isMounted = false; };
  }, []);

  function openCreate() {
    setError("");
    setSelectedCustomer(null);
    setModal("create");
  }

  function openEdit(customer: Customer) {
    setError("");
    setSelectedCustomer(customer);
    setModal("edit");
  }

  async function viewCustomer(customerId: string) {
    setError("");
    try {
      const response = await fetch(`/api/customers/${customerId}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load customer.");
      setDetailCustomer(data.customer);
    } catch (viewError) {
      setError(viewError instanceof Error ? viewError.message : "Failed to load customer.");
    }
  }

  async function saveCustomer(values: CustomerFormValues) {
    setIsSaving(true);
    setError("");
    try {
      const editing = modal === "edit" && selectedCustomer;
      const response = await fetch(editing ? `/api/customers/${selectedCustomer._id}` : "/api/customers", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save customer.");
      setModal(null);
      setSelectedCustomer(null);
      await loadCustomers();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save customer.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deactivate(customer: Customer) {
    if (!window.confirm(`Deactivate ${customer.name}?`)) return;
    setError("");
    try {
      const response = await fetch(`/api/customers/${customer._id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to deactivate customer.");
      await loadCustomers();
    } catch (deactivateError) {
      setError(deactivateError instanceof Error ? deactivateError.message : "Failed to deactivate customer.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Customers">
        {canCreateCustomer && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Customer
          </Button>
        )}
      </PageHeader>

      <Card noPadding className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Customer Directory</CardTitle>
            <p className="mt-1 text-xs text-slate-500">{pagination.total} customer{pagination.total === 1 ? "" : "s"}</p>
          </div>
          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                placeholder="Search name or phone..."
                className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </label>
            <select
              aria-label="Customer status"
              value={status}
              onChange={(event) => { setStatus(event.target.value); setPage(1); }}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All statuses</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!isLoading && customers.map((customer) => (
                <tr key={customer._id} className="hover:bg-slate-50/75">
                  <td className="px-4 py-3 font-semibold text-slate-900">{customer.name}</td>
                  <td className="px-4 py-3">{customer.phone || "Not provided"}</td>
                  <td className="px-4 py-3">{customer.email || "Not provided"}</td>
                  <td className="px-4 py-3">{customer.customerType === "BUSINESS" ? "Business" : "Regular"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={customer.isActive ? "success" : "secondary"} size="sm">
                      {customer.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{formatDate(customer.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => void viewCustomer(customer._id)} aria-label={`View ${customer.name}`}>
                      <Eye className="mr-1 h-3.5 w-3.5" />View
                    </Button>
                    {canEditCustomer && (
                      <Button variant="ghost" size="sm" onClick={() => openEdit(customer)} aria-label={`Edit ${customer.name}`}>
                        <Pencil className="mr-1 h-3.5 w-3.5" />Edit
                      </Button>
                    )}
                    {canDeactivateCustomer && customer.isActive && (
                      <Button variant="ghost" size="sm" onClick={() => void deactivate(customer)} aria-label={`Deactivate ${customer.name}`}>
                        <UserRoundX className="mr-1 h-3.5 w-3.5" />Deactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && !modal && <p role="alert" className="px-4 py-3 text-sm text-rose-700">{error}</p>}
        {isLoading && <p className="px-4 py-8 text-center text-sm text-slate-500">Loading customers...</p>}
        {!isLoading && customers.length === 0 && (
          <EmptyState icon={Users} title={search ? "No matching customers" : "No customers yet"} description="Customer records are shared across branches of this business." />
        )}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="customer-form-title" className="my-auto w-full max-w-xl rounded-lg bg-white p-5 shadow-xl sm:p-6">
            <div className="mb-5 flex items-start justify-between">
              <h2 id="customer-form-title" className="text-lg font-semibold text-slate-900">{modal === "edit" ? "Edit Customer" : "Add Customer"}</h2>
              <button type="button" onClick={() => setModal(null)} aria-label="Close" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            {error && <p role="alert" className="mb-3 text-sm text-rose-700">{error}</p>}
            <CustomerForm
              key={selectedCustomer?._id || "new-customer"}
              initialValues={customerFormValues(selectedCustomer)}
              isSaving={isSaving}
              onCancel={() => { setModal(null); setSelectedCustomer(null); }}
              onSubmit={saveCustomer}
            />
          </section>
        </div>
      )}

      {detailCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailCustomer(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="customer-detail-title" className="my-auto w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl sm:p-6">
            <div className="mb-5 flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 id="customer-detail-title" className="text-lg font-semibold text-slate-900">{detailCustomer.name}</h2>
                <p className="mt-1 text-xs text-slate-500">Customer details</p>
              </div>
              <button type="button" onClick={() => setDetailCustomer(null)} aria-label="Close" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <Detail label="Phone" value={detailCustomer.phone} />
              <Detail label="Email" value={detailCustomer.email} />
              <Detail label="Address" value={detailCustomer.address} />
              <Detail label="Type" value={detailCustomer.customerType === "BUSINESS" ? "Business" : "Regular"} />
              <Detail label="Status" value={detailCustomer.isActive ? "Active" : "Inactive"} />
              <Detail label="Created" value={formatDate(detailCustomer.createdAt)} />
              <Detail label="Notes" value={detailCustomer.notes} />
            </dl>
            <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
              <Placeholder title="Purchase History" />
              <Placeholder title="Invoice History" />
              <Placeholder title="Outstanding Due" />
            </div>
            <div className="mt-5 flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setDetailCustomer(null)}>Close</Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-slate-900">{value || "Not provided"}</dd>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="border-t-2 border-slate-200 pt-3">
      <h3 className="text-xs font-semibold text-slate-700">{title}</h3>
      <p className="mt-1 text-xs text-slate-400">Not available yet</p>
    </div>
  );
}