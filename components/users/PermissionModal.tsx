"use client";

import React, { useState } from "react";
import { X, ShieldCheck, RotateCcw, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  PERMISSION_GROUPS,
  DEFAULT_ROLE_PERMISSIONS,
  UserRole,
  StandardPermission,
} from "@/types";

interface PermissionModalProps {
  userName: string;
  role: UserRole;
  initialPermissions: string[];
  onSave: (permissions: string[]) => Promise<void>;
  onClose: () => void;
}

export function PermissionModal({
  userName,
  role,
  initialPermissions,
  onSave,
  onClose,
}: PermissionModalProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    initialPermissions.length > 0
      ? initialPermissions
      : (DEFAULT_ROLE_PERMISSIONS[role] as string[]) || []
  );
  const [isSaving, setIsSaving] = useState(false);

  const togglePermission = (key: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const toggleCategory = (groupPermissions: { key: StandardPermission }[]) => {
    const keys = groupPermissions.map((p) => p.key as string);
    const allSelected = keys.every((k) => selectedPermissions.includes(k));

    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((p) => !keys.includes(p)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...keys])));
    }
  };

  const handleResetDefaults = () => {
    const defaults = (DEFAULT_ROLE_PERMISSIONS[role] as string[]) || [];
    setSelectedPermissions(defaults);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(selectedPermissions);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Customized Permissions</h2>
              <p className="text-xs text-slate-500">
                Editing permissions for <span className="font-semibold text-slate-800">{userName}</span> &bull; Role:{" "}
                <span className="font-semibold text-brand-600">{role}</span>
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

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-50 border-b border-slate-100 text-xs">
          <span className="text-slate-600 font-medium">
            <span className="font-bold text-slate-900">{selectedPermissions.length}</span> permissions granted
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetDefaults}
            className="text-xs text-brand-600 hover:text-brand-700"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset to Role Defaults
          </Button>
        </div>

        {/* Permissions Groups Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {PERMISSION_GROUPS.map((group) => {
            const allSelected = group.permissions.every((p) =>
              selectedPermissions.includes(p.key)
            );
            const someSelected = group.permissions.some((p) =>
              selectedPermissions.includes(p.key)
            );

            return (
              <div
                key={group.category}
                className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                    {group.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleCategory(group.permissions)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    {allSelected ? (
                      <>
                        <CheckSquare className="h-3.5 w-3.5" />
                        Deselect Category
                      </>
                    ) : (
                      <>
                        <Square className="h-3.5 w-3.5" />
                        Select Category
                      </>
                    )}
                  </button>
                </div>

                {/* Permissions Grid */}
                <div className="p-3.5 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {group.permissions.map((perm) => {
                    const isChecked = selectedPermissions.includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-brand-50/40 border-brand-200 text-slate-900"
                            : "border-slate-100 hover:bg-slate-50 text-slate-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(perm.key)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 leading-tight">{perm.label}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{perm.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={handleSave} isLoading={isSaving}>
            Save Permissions
          </Button>
        </div>
      </div>
    </div>
  );
}
