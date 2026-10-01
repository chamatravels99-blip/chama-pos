"use client";

import React, { useState, useEffect } from "react";
import {
  Menu,
  Building,
  Building2,
  Store,
  CheckCircle2,
  Bell,
  ChevronDown,
  LogOut,
  Sliders,
  Shield,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SessionUser } from "@/types";
import { useBranch } from "@/components/context/BranchContext";
import { isPlatformRole } from "@/lib/auth/permissions";

export interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [businessDropdownOpen, setBusinessDropdownOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const {
    businesses,
    selectedBusinessId,
    selectedBusinessName,
    setSelectedBusiness,
    branches,
    selectedBranchId,
    selectedBranchName,
    canSelectAllBranches,
    setSelectedBranch,
  } = useBranch();

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      } catch (err) {
        console.error("Failed to fetch session in Header:", err);
      }
    }
    fetchSession();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  const userDisplayName = currentUser?.name || "Store User";
  const userRole = currentUser?.role || "BUSINESS_OWNER";
  const isPlatformAdmin = isPlatformRole(userRole);
  const businessDisplayName = isPlatformAdmin
    ? selectedBusinessName || "Select Business"
    : currentUser?.businessName || "Chama POS";

  const userInitials = userDisplayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur transition-all sm:px-6">
      {/* Left side: Mobile Toggle & Tenant / Branch Information */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
            <Store className="h-5 w-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-sm sm:text-base leading-tight">
                {businessDisplayName}
              </span>
              <Badge variant="default" size="sm" className="hidden sm:inline-flex capitalize">
                {userRole.replace("_", " ").toLowerCase()}
              </Badge>
            </div>
            {currentUser?.businessSlug && (
              <div className="text-xs text-slate-500 hidden sm:block">
                Tenant: <span className="font-mono text-[11px] text-slate-600">{currentUser.businessSlug}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center/Right: Branch Switcher & Context */}
      <div className="flex items-center gap-2 sm:gap-4">
        {isPlatformAdmin && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setBusinessDropdownOpen(!businessDropdownOpen);
                setBranchDropdownOpen(false);
                setProfileDropdownOpen(false);
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              aria-label="Select business"
            >
              <Building2 className="h-3.5 w-3.5 text-slate-500" />
              <span className="max-w-36 truncate">{selectedBusinessName || "Select Business"}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
            {businessDropdownOpen && (
              <div className="absolute right-0 z-50 mt-2 max-h-72 w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Business Context
                </div>
                {businesses.length === 0 ? (
                  <div className="px-2.5 py-2 text-xs text-slate-400">No active businesses</div>
                ) : businesses.map((business) => (
                  <button
                    key={business._id}
                    type="button"
                    onClick={() => {
                      setSelectedBusiness(business._id);
                      setBusinessDropdownOpen(false);
                    }}
                    className={`w-full rounded-lg px-2.5 py-2 text-left text-xs ${
                      selectedBusinessId === business._id
                        ? "bg-brand-50 font-semibold text-brand-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block truncate">{business.name}</span>
                    <span className="block truncate text-[10px] text-slate-400">{business.slug}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Branch Context Indicator */}
        <div className="relative">
          <button
            type="button"
            disabled={isPlatformAdmin && !selectedBusinessId}
            onClick={() => {
              setBranchDropdownOpen(!branchDropdownOpen);
              setBusinessDropdownOpen(false);
              setProfileDropdownOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Building className="h-3.5 w-3.5 text-slate-500" />
            <div className="text-left">
              <span className="hidden sm:inline text-slate-400 font-normal">Branch: </span>
              <span className="font-semibold text-slate-800">{selectedBranchName}</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {branchDropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Branch Location Context
              </div>

              {/* All Branches Option */}
              {canSelectAllBranches && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBranch("ALL");
                    setBranchDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors mb-1 ${
                    selectedBranchId === "ALL"
                      ? "bg-brand-50 text-brand-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-brand-600" />
                    <span>All Branches (Business-Wide)</span>
                  </div>
                  {selectedBranchId === "ALL" && (
                    <CheckCircle2 className="h-4 w-4 text-brand-600 shrink-0" />
                  )}
                </button>
              )}

              {/* Individual Branches */}
              <div className="border-t border-slate-100 pt-1 space-y-0.5 max-h-48 overflow-y-auto">
                {branches.length === 0 ? (
                  <div className="px-2.5 py-2 text-xs text-slate-400 italic">No assigned branches</div>
                ) : (
                  branches.map((b) => (
                    <button
                      key={b._id}
                      type="button"
                      onClick={() => {
                        setSelectedBranch(b._id);
                        setBranchDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                        selectedBranchId === b._id
                          ? "bg-brand-50 text-brand-700 font-semibold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span>{b.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({b.code})</span>
                        {b.isMain && (
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded">HQ</span>
                        )}
                      </div>
                      {selectedBranchId === b._id && (
                        <CheckCircle2 className="h-4 w-4 text-brand-600 shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Live POS Status */}
        <div className="hidden md:flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Tenant Isolated</span>
        </div>

        {/* Notifications */}
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          aria-label="View notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand-600"></span>
        </button>

        {/* User Profile */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileDropdownOpen(!profileDropdownOpen);
              setBranchDropdownOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-800 text-xs font-semibold text-white">
              {userInitials}
            </div>
            <div className="hidden text-left lg:block">
              <div className="text-xs font-medium text-slate-900 leading-tight">
                {userDisplayName}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {userRole.replace("_", " ").toLowerCase()}
              </div>
            </div>
            <ChevronDown className="hidden h-3 w-3 text-slate-400 lg:block" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{userDisplayName}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser?.email || "user@business.com"}</p>
                <Badge variant="secondary" size="sm" className="mt-1.5 text-[10px]">
                  {userRole}
                </Badge>
              </div>
              <div className="p-1">
                {isPlatformAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-amber-700 hover:bg-amber-50 font-medium"
                  >
                    <Shield className="h-3.5 w-3.5 text-amber-600" />
                    Platform Admin Console
                  </Link>
                )}
                <Link
                  href="/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Sliders className="h-3.5 w-3.5 text-slate-400" />
                  Store Settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 text-left"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
