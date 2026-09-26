"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { UserTable, ManagedUser } from "@/components/users/UserTable";
import { UserFormModal, BranchOption, UserFormData } from "@/components/users/UserFormModal";
import { PermissionModal } from "@/components/users/PermissionModal";
import { ChangePasswordModal } from "@/components/users/ChangePasswordModal";

export default function UsersManagementPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [branchFilter, setBranchFilter] = useState<string>("");

  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalMode, setUserModalMode] = useState<"create" | "edit">("create");
  const [editUserData, setEditUserData] = useState<UserFormData | undefined>(undefined);

  const [passwordTarget, setPasswordTarget] = useState<ManagedUser | null>(null);
  const [permissionTarget, setPermissionTarget] = useState<ManagedUser | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ManagedUser | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Load current user profile
  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUserId(data.user.id);
        }
      } catch (err) {
        console.error("Failed to load me:", err);
      }
    }
    loadMe();
  }, []);

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch("/api/branches");
      const data = await res.json();
      if (data.success && Array.isArray(data.branches)) {
        setBranches(data.branches);
      }
    } catch (err) {
      console.error("Failed to fetch branches:", err);
    }
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load users.");
      }
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
    fetchUsers();
  }, [fetchBranches, fetchUsers]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (statusFilter) {
        const isActive = u.status === "ACTIVE" || u.status === "active";
        if (statusFilter === "ACTIVE" && !isActive) return false;
        if (statusFilter === "INACTIVE" && isActive) return false;
      }
      if (branchFilter) {
        if (u.branchAccess === "ALL_BRANCHES" || u.role === "BUSINESS_OWNER") {
          // Has access to all branches
        } else if (!u.branchIds || !u.branchIds.includes(branchFilter)) {
          return false;
        }
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.username && u.username.toLowerCase().includes(q)) ||
          (u.phone && u.phone.includes(q))
        );
      }
      return true;
    });
  }, [users, search, roleFilter, statusFilter, branchFilter]);

  // Modal openers
  const openCreate = () => {
    setEditUserData(undefined);
    setUserModalMode("create");
    setShowUserModal(true);
  };

  const openEdit = (user: ManagedUser) => {
    setEditUserData({
      _id: user._id,
      name: user.name,
      username: user.username || "",
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      branchAccess: user.branchAccess || (user.role === "BUSINESS_OWNER" ? "ALL_BRANCHES" : "SELECTED_BRANCHES"),
      branchIds: user.branchIds || [],
      status: user.status,
    });
    setUserModalMode("edit");
    setShowUserModal(true);
  };

  const handleUserSaved = () => {
    setShowUserModal(false);
    setToast({
      type: "success",
      message: userModalMode === "create" ? "User created successfully." : "User updated successfully.",
    });
    fetchUsers();
  };

  const handleSavePermissions = async (newPermissions: string[]) => {
    if (!permissionTarget) return;
    try {
      const res = await fetch(`/api/users/${permissionTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: newPermissions }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update permissions.");
      }
      setToast({ type: "success", message: `Updated permissions for ${permissionTarget.name}.` });
      setPermissionTarget(null);
      fetchUsers();
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to save permissions." });
    }
  };

  const handleToggleStatus = (user: ManagedUser) => {
    const isActive = user.status === "ACTIVE" || user.status === "active";
    if (isActive) {
      setDeactivateTarget(user);
    } else {
      handleReactivate(user);
    }
  };

  const handleReactivate = async (user: ManagedUser) => {
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reactivate user.");
      setToast({ type: "success", message: `${user.name} has been reactivated.` });
      fetchUsers();
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to reactivate." });
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    try {
      const res = await fetch(`/api/users/${deactivateTarget._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to deactivate user.");
      setToast({ type: "success", message: `${deactivateTarget.name} deactivated.` });
      setDeactivateTarget(null);
      fetchUsers();
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to deactivate user." });
    } finally {
      setIsDeactivating(false);
    }
  };

  const activeCount = users.filter((u) => u.status === "ACTIVE" || u.status === "active").length;
  const inactiveCount = users.length - activeCount;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl border text-xs font-medium animate-in slide-in-from-bottom-2 ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Staff & User Management"
        description="Provision accounts, assign role permissions, and control branch access across your organization."
      >
        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <Button variant="primary" size="sm" onClick={openCreate}>
          <UserPlus className="h-4 w-4 mr-1.5" />
          Add User
        </Button>
      </PageHeader>

      {/* Summary KPI Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-semibold text-slate-900">{users.length}</span> staff members
        </div>
        <Badge variant="success" size="sm">{activeCount} Active</Badge>
        {inactiveCount > 0 && <Badge variant="secondary" size="sm">{inactiveCount} Inactive</Badge>}
        {filteredUsers.length !== users.length && (
          <Badge variant="default" size="sm">{filteredUsers.length} matching filters</Badge>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, username…"
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Roles</option>
            <option value="BUSINESS_OWNER">Business Owner</option>
            <option value="MANAGER">Manager</option>
            <option value="CASHIER">Cashier</option>
            <option value="STOCK_MANAGER">Stock Manager</option>
            <option value="ACCOUNTANT">Accountant</option>
          </select>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active Only</option>
          <option value="INACTIVE">Inactive Only</option>
        </select>

        {/* Branch Filter */}
        {branches.length > 0 && (
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Branch Locations</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        )}

        {(search || roleFilter || statusFilter || branchFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setRoleFilter("");
              setStatusFilter("");
              setBranchFilter("");
            }}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchUsers} className="ml-auto text-rose-600">
            Retry
          </Button>
        </div>
      )}

      {/* Users Table */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
          Loading user directory…
        </div>
      ) : (
        <UserTable
          users={filteredUsers}
          branches={branches}
          currentUserId={currentUserId}
          onEdit={openEdit}
          onChangePassword={(user) => setPasswordTarget(user)}
          onPermissions={(user) => setPermissionTarget(user)}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {/* Add / Edit User Modal */}
      {showUserModal && (
        <UserFormModal
          mode={userModalMode}
          initialData={editUserData}
          branches={branches}
          onSuccess={handleUserSaved}
          onClose={() => setShowUserModal(false)}
        />
      )}

      {/* Change Password Modal */}
      {passwordTarget && (
        <ChangePasswordModal
          userId={passwordTarget._id}
          userName={passwordTarget.name}
          onSuccess={() => {
            setPasswordTarget(null);
            setToast({ type: "success", message: `Password changed for ${passwordTarget.name}.` });
          }}
          onClose={() => setPasswordTarget(null)}
        />
      )}

      {/* Permission Editor Modal */}
      {permissionTarget && (
        <PermissionModal
          userName={permissionTarget.name}
          role={permissionTarget.role}
          initialPermissions={permissionTarget.permissions || []}
          onSave={handleSavePermissions}
          onClose={() => setPermissionTarget(null)}
        />
      )}

      {/* Deactivate User Confirmation Dialog */}
      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 mb-3">
              <AlertCircle className="h-5 w-5 text-rose-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Deactivate Staff Account?</h3>
            <p className="text-xs text-slate-500 mb-4">
              <strong className="text-slate-800">{deactivateTarget.name}</strong> ({deactivateTarget.email}) will immediately lose access to the system. Historical sales and audit records will remain preserved.
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
    </div>
  );
}
