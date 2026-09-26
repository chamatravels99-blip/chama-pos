"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { tenantNavigation } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { Shield, Sparkles, Layers } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { SessionUser } from "@/types";
import { hasPermission, isPlatformRole } from "@/lib/auth/permissions";

export interface SidebarProps {
  className?: string;
  onItemClick?: () => void;
}

export function Sidebar({ className, onItemClick }: SidebarProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      } catch (err) {
        console.error("Failed to fetch session in Sidebar:", err);
      }
    }
    fetchSession();
  }, []);

  const isPlatformAdmin = currentUser && isPlatformRole(currentUser.role);

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r border-slate-200 bg-slate-900 text-slate-200",
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-800 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white font-black shadow-md">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white text-base tracking-tight">CHAMA</span>
            <span className="font-semibold text-brand-400 text-base tracking-tight">POS</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
            Commercial SaaS Edition
          </p>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {tenantNavigation.map((section, idx) => {
          // Filter items based on permissions
          const visibleItems = section.items.filter((item) => {
            if (!currentUser) return true; // Show initial shell during loading
            if (item.requiresPermission) {
              return hasPermission(currentUser, item.requiresPermission);
            }
            if (item.requiresRole && item.requiresRole.length > 0) {
              return item.requiresRole.includes(currentUser.role);
            }
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              {section.sectionTitle && (
                <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {section.sectionTitle}
                </h4>
              )}
              <div className="space-y-0.5 pt-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onItemClick}
                      className={cn(
                        "group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all",
                        isActive
                          ? "bg-brand-600 text-white shadow-sm font-semibold"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                          )}
                        />
                        <span>{item.title}</span>
                      </div>
                      {item.badge && (
                        <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-brand-300">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Platform Admin Portal Switcher */}
        {isPlatformAdmin && (
          <div className="pt-2 border-t border-slate-800">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              SaaS Platform Admin
            </div>
            <Link
              href="/admin"
              onClick={onItemClick}
              className={cn(
                "group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all text-amber-300 hover:bg-slate-800",
                pathname.startsWith("/admin") && "bg-slate-800 text-amber-200 border border-amber-500/30"
              )}
            >
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Platform Owner Admin</span>
              </div>
              <Badge variant="warning" size="sm" className="bg-amber-400/10 text-amber-300 border-amber-400/20 text-[10px]">
                Root
              </Badge>
            </Link>
          </div>
        )}
      </div>

      {/* Subscription Tier Card */}
      <div className="p-3 border-t border-slate-800">
        <div className="rounded-lg bg-slate-800/80 p-3 border border-slate-700/60">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-brand-400" />
              BUSINESS TIER
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">Active</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Multi-branch enabled. Tenant database isolated.
          </p>
          <div className="mt-2 text-right">
            <Link
              href="/settings"
              className="text-[11px] text-brand-400 hover:text-brand-300 font-medium inline-block"
            >
              Manage Plan &rarr;
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
