"use client";

import React, { useState, useEffect } from "react";
import { X, UserPlus, UserCheck, AlertCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { UserRole, UserStatus, BranchAccess } from "@/types";

export interface BranchOption {
  _id: string;
  name: string;
  code: string;
  isMain?: boolean;
}

export interface UserFormData {
  _id?: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  branchAccess: BranchAccess;
  branchIds: string[];
  status: UserStatus;
  password?: string;
  confirmPassword?: string;
}

interface UserFormModalProps {
  mode: "create" | "edit";
  initialData?: UserFormData;
  branches: BranchOption[];
  onSuccess: () => void;
  onClose: () => void;
}

const EMPTY_FORM: UserFormData = {
  name: "",
  username: "",
  email: "",
  phone: "",
  role: "CASHIER",
  branchAccess: "SELECTED_BRANCHES",
  branchIds: [],
  status: "ACTIVE",
  password: "",
  confirmPassword: "",
};

export function UserFormModal({
  mode,
  initialData,
  branches,
  onSuccess,
  onClose,
}: UserFormModalProps) {
  const [form, setForm] = useState<UserFormData>(initialData || EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    } else {
      setForm({
        ...EMPTY_FORM,
        branchIds: branches.length > 0 ? [branches[0]._id] : [],
      });
    }
  }, [initialData, branches]);

  const updateField = (field: keyof UserFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleBranch = (branchId: string) => {
    setForm((prev) => {
      const exists = prev.branchIds.includes(branchId);
      const updated = exists
        ? prev.branchIds.filter((id) => id !== branchId)
        : [...prev.branchIds, branchId];
      return { ...prev, branchIds: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!form.name.trim()) {
      setErrorMsg("Full name is required.");
      return;
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      setErrorMsg("A valid email address is required.");
      return;
    }

    if (mode === "create") {
      if (!form.password || form.password.length < 6) {
        setErrorMsg("Password must be at least 6 characters.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setErrorMsg("Passwords do not match.");
        return;
      }
    }

    if (form.branchAccess === "SELECTED_BRANCHES" && form.branchIds.length === 0) {
      setErrorMsg("Please select at least one branch for this user.");
      return;
    }

    setIsLoading(true);
    try {
      const url = mode === "create" ? "/api/users" : `/api/users/${form._id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const payload = {
        name: form.name.trim(),
        username: form.username ? form.username.trim().toLowerCase() : undefined,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        role: form.role,
        branchAccess: form.role === "BUSINESS_OWNER" ? "ALL_BRANCHES" : form.branchAccess,
        branchIds: form.branchAccess === "ALL_BRANCHES" ? [] : form.branchIds,
        status: form.status,
        ...(mode === "create" ? { password: form.password, confirmPassword: form.confirmPassword } : {}),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to save user account.");
        return;
      }

      onSuccess();
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              {mode === "create" ? <UserPlus className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {mode === "create" ? "Add New User Account" : "Edit User Account"}
              </h2>
              <p className="text-xs text-slate-500">
                {mode === "create"
                  ? "Provision credentials, role permissions, and branch assignments."
                  : `Updating profile for ${form.name}.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Name & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g. Kasun Fernando"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => updateField("username", e.target.value)}
                placeholder="e.g. kasun.f (optional)"
                className={inputClass}
              />
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="user@business.com"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+94 77 123 4567"
                className={inputClass}
              />
            </div>
          </div>

          {/* Password (only on create) */}
          {mode === "create" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
              <div>
                <label className={labelClass}>
                  Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="At least 6 characters"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  placeholder="Re-enter password"
                  className={inputClass}
                  required
                />
              </div>
            </div>
          )}

          {/* Role & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                User Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.role}
                onChange={(e) => {
                  const newRole = e.target.value as UserRole;
                  updateField("role", newRole);
                  if (newRole === "BUSINESS_OWNER") {
                    updateField("branchAccess", "ALL_BRANCHES");
                  }
                }}
                className={inputClass}
              >
                <option value="CASHIER">CASHIER (POS & Sales checkout)</option>
                <option value="MANAGER">MANAGER (Store & Branch Management)</option>
                <option value="BUSINESS_OWNER">BUSINESS OWNER (Full Store Authority)</option>
                <option value="STOCK_MANAGER">STOCK MANAGER (Inventory & Transfers)</option>
                <option value="ACCOUNTANT">ACCOUNTANT (Financials & Invoices)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Account Status</label>
              <select
                value={form.status}
                onChange={(e) => updateField("status", e.target.value as UserStatus)}
                className={inputClass}
              >
                <option value="ACTIVE">ACTIVE (Authorized to login)</option>
                <option value="INACTIVE">INACTIVE (Disabled)</option>
                <option value="SUSPENDED">SUSPENDED (Temporarily locked)</option>
              </select>
            </div>
          </div>

          {/* Branch Access Section */}
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Branch Access Control
              </span>
            </div>

            {form.role === "BUSINESS_OWNER" ? (
              <p className="text-xs text-slate-500">
                Business Owners automatically have access to <span className="font-semibold text-slate-700">All Branches</span>.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="branchAccess"
                      checked={form.branchAccess === "ALL_BRANCHES"}
                      onChange={() => updateField("branchAccess", "ALL_BRANCHES")}
                      className="text-brand-600 focus:ring-brand-500"
                    />
                    <span>All Branches</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="branchAccess"
                      checked={form.branchAccess === "SELECTED_BRANCHES"}
                      onChange={() => updateField("branchAccess", "SELECTED_BRANCHES")}
                      className="text-brand-600 focus:ring-brand-500"
                    />
                    <span>Selected Branches Only</span>
                  </label>
                </div>

                {form.branchAccess === "SELECTED_BRANCHES" && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <p className="text-[11px] text-slate-500 mb-2">
                      Assign which store locations this user can access:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {branches.map((b) => {
                        const isAssigned = form.branchIds.includes(b._id);
                        return (
                          <label
                            key={b._id}
                            className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isAssigned
                                ? "bg-brand-50 border-brand-200 text-brand-900 font-medium"
                                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => toggleBranch(b._id)}
                              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            />
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-800">{b.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono ml-1.5">({b.code})</span>
                              {b.isMain && (
                                <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-bold">
                                  HQ
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            {mode === "create" ? "Create Account" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

const labelClass = "block text-xs font-semibold text-slate-700 mb-1";
const inputClass =
  "block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors";
