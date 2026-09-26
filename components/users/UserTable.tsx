"use client";

import React from "react";
import { Edit2, Lock, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { UserRole, UserStatus, BranchAccess } from "@/types";
import { BranchOption } from "./UserFormModal";

export interface ManagedUser {
  _id: string;
  name: string;
  username?: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  branchAccess?: BranchAccess;
  branchIds: string[];
  permissions?: string[];
  lastLoginAt?: string;
  createdAt: string;
}

interface UserTableProps {
  users: ManagedUser[];
  branches: BranchOption[];
  currentUserId?: string;
  onEdit: (user: ManagedUser) => void;
  onChangePassword: (user: ManagedUser) => void;
  onPermissions: (user: ManagedUser) => void;
  onToggleStatus: (user: ManagedUser) => void;
}

export function UserTable({
  users,
  branches,
  currentUserId,
  onEdit,
  onChangePassword,
  onPermissions,
  onToggleStatus,
}: UserTableProps) {
  const branchMap = new Map(branches.map((b) => [b._id, b.name]));

  const getBranchDisplay = (user: ManagedUser) => {
    if (user.role === "BUSINESS_OWNER" || user.branchAccess === "ALL_BRANCHES") {
      return (
        <span className="inline-flex items-center gap-1 font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded text-[11px]">
          All Branches
        </span>
      );
    }

    if (!user.branchIds || user.branchIds.length === 0) {
      return <span className="text-slate-400 italic text-xs">No branch assigned</span>;
    }

    const branchNames = user.branchIds
      .map((id) => branchMap.get(id))
      .filter(Boolean) as string[];

    if (branchNames.length === 0) {
      return <span className="text-slate-500 text-xs">{user.branchIds.length} branch(es)</span>;
    }

    return (
      <div className="flex flex-wrap gap-1 max-w-[200px]">
        {branchNames.map((name, i) => (
          <span
            key={i}
            className="inline-block bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium"
          >
            {name}
          </span>
        ))}
      </div>
    );
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case "PLATFORM_OWNER":
      case "PLATFORM_ADMIN":
      case "SUPER_ADMIN":
        return "warning";
      case "BUSINESS_OWNER":
        return "default";
      case "MANAGER":
        return "secondary";
      case "STOCK_MANAGER":
        return "outline";
      case "ACCOUNTANT":
        return "secondary";
      case "CASHIER":
      default:
        return "outline";
    }
  };

  const isUserActive = (status: UserStatus) => {
    return status === "ACTIVE" || status === "active";
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className={thClass}>Staff User</th>
              <th className={thClass}>Username</th>
              <th className={thClass}>Role</th>
              <th className={thClass}>Branch Access</th>
              <th className={thClass}>Permissions</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-xs text-slate-500">
                  No staff accounts found. Click &quot;Add User&quot; to provision an account.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const active = isUserActive(user.status);
                const isSelf = user._id === currentUserId;

                return (
                  <tr key={user._id} className="hover:bg-slate-50/60 transition-colors group">
                    {/* Name & Email */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white font-semibold text-xs">
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                            {user.name}
                            {isSelf && (
                              <span className="text-[10px] text-brand-600 bg-brand-50 px-1.5 rounded font-normal">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Username */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-mono text-slate-600">
                        {user.username || <span className="text-slate-300 italic">–</span>}
                      </span>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3.5">
                      <Badge variant={getRoleBadgeVariant(user.role)} size="sm" className="capitalize">
                        {user.role.replace("_", " ").toLowerCase()}
                      </Badge>
                    </td>

                    {/* Branch Access */}
                    <td className="px-4 py-3.5">{getBranchDisplay(user)}</td>

                    {/* Permissions summary */}
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => onPermissions(user)}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-brand-600 font-medium px-2 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-200 transition-colors"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
                        <span>{user.permissions?.length || 0} active</span>
                      </button>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <Badge variant={active ? "success" : "danger"} size="sm">
                        {active ? "Active" : user.status === "SUSPENDED" ? "Suspended" : "Inactive"}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-slate-600 hover:text-brand-600"
                          onClick={() => onEdit(user)}
                          title="Edit user profile"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-slate-600 hover:text-amber-600"
                          onClick={() => onChangePassword(user)}
                          title="Change password"
                        >
                          <Lock className="h-3.5 w-3.5" />
                        </Button>
                        {!isSelf && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 px-2 ${active ? "text-slate-600 hover:text-rose-600" : "text-slate-600 hover:text-emerald-600"}`}
                            onClick={() => onToggleStatus(user)}
                            title={active ? "Deactivate user" : "Activate user"}
                          >
                            {active ? (
                              <UserX className="h-3.5 w-3.5" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thClass = "px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500";
