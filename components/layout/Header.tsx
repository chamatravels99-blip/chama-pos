"use client";

import React, { useState, useEffect } from "react";
import {
  Menu,
  Building,
  Store,
  CheckCircle2,
  Bell,
  ChevronDown,
  LogOut,
  Sliders,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SessionUser } from "@/types";

export interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [activeBranch, setActiveBranch] = useState("Main Flagship");

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

  const businessDisplayName = currentUser?.businessName || "Chama POS";
  const userDisplayName = currentUser?.name || "Store User";
  const userRole = currentUser?.role || "BUSINESS_OWNER";
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
                {userRole.replace("_", " ")}
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
        {/* Branch Context Indicator */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setBranchDropdownOpen(!branchDropdownOpen);
              setProfileDropdownOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors"
          >
            <Building className="h-3.5 w-3.5 text-slate-500" />
            <div className="text-left">
              <span className="hidden sm:inline text-slate-400 font-normal">Branch: </span>
              <span className="font-semibold text-slate-800">{activeBranch}</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {branchDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Assigned Branch Locations
              </div>
              {["Main Flagship", "City Express", "Secondary Hub"].map((branchName, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveBranch(branchName);
                    setBranchDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                    activeBranch === branchName
                      ? "bg-brand-50 text-brand-700 font-medium"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-medium text-slate-900">{branchName}</div>
                  {activeBranch === branchName && (
                    <CheckCircle2 className="h-4 w-4 text-brand-600 shrink-0" />
                  )}
                </button>
              ))}
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
                {userRole.replace("_", " ")}
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
                {(userRole === "PLATFORM_ADMIN" || userRole === "SUPER_ADMIN") && (
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
