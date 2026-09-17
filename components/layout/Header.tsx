"use client";

import React, { useState } from "react";
import {
  Menu,
  Building,
  Store,
  CheckCircle2,
  Bell,
  ChevronDown,
  User as UserIcon,
  LogOut,
  Sliders,
} from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const { business, branches, currentBranch, switchBranch } = useTenant();
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

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
                {business.name}
              </span>
              <Badge variant="default" size="sm" className="hidden sm:inline-flex capitalize">
                {business.industry.replace("_", " ")}
              </Badge>
            </div>
            <div className="text-xs text-slate-500 hidden sm:block">
              Tenant ID: <span className="font-mono text-[11px] text-slate-600">{business.slug}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Center/Right: Branch Switcher & Context */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Multi-Branch Selector */}
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
              <span className="font-semibold text-slate-800">{currentBranch.name}</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {branchDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Switch Branch
              </div>
              {branches.map((branch) => (
                <button
                  key={branch._id}
                  onClick={() => {
                    switchBranch(branch._id);
                    setBranchDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                    branch._id === currentBranch._id
                      ? "bg-brand-50 text-brand-700 font-medium"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="font-medium text-slate-900">{branch.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{branch.code}</div>
                  </div>
                  {branch._id === currentBranch._id && (
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
          <span>Online</span>
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
              KP
            </div>
            <div className="hidden text-left lg:block">
              <div className="text-xs font-medium text-slate-900 leading-tight">Kasun Perera</div>
              <div className="text-[10px] text-slate-500">Business Owner</div>
            </div>
            <ChevronDown className="hidden h-3 w-3 text-slate-400 lg:block" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-medium text-slate-900">Kasun Perera</p>
                <p className="text-[11px] text-slate-500 truncate">kasun@chamamodzone.com</p>
              </div>
              <div className="p-1">
                <Link
                  href="/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Sliders className="h-3.5 w-3.5 text-slate-400" />
                  Store Settings
                </Link>
                <Link
                  href="/login"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
