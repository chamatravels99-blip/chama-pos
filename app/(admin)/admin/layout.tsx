import React from "react";
import Link from "next/link";
import { Shield, Building2, CreditCard, Users, ArrowLeft, Layers } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Platform Owner Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-950 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-black">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm">CHAMA POS</span>
              <span className="ml-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Platform Admin
              </span>
            </div>
          </div>
          <Badge variant="warning" size="sm" className="hidden sm:inline-flex bg-amber-500/10 text-amber-300 border-amber-500/20">
            Root Authority
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Store POS
          </Link>
        </div>
      </header>

      {/* Admin Subnav */}
      <nav className="border-b border-slate-800 bg-slate-900/60 px-4 sm:px-8">
        <div className="flex gap-6 text-xs font-medium overflow-x-auto py-3">
          <Link
            href="/admin"
            className="text-slate-300 hover:text-white flex items-center gap-1.5 py-1"
          >
            <Shield className="h-3.5 w-3.5 text-amber-400" />
            System Metrics
          </Link>
          <Link
            href="/admin/businesses"
            className="text-slate-300 hover:text-white flex items-center gap-1.5 py-1"
          >
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            Tenants / Businesses
          </Link>
          <Link
            href="/admin/subscriptions"
            className="text-slate-300 hover:text-white flex items-center gap-1.5 py-1"
          >
            <CreditCard className="h-3.5 w-3.5 text-slate-400" />
            Subscriptions & Plans
          </Link>
          <Link
            href="/admin/users"
            className="text-slate-300 hover:text-white flex items-center gap-1.5 py-1"
          >
            <Users className="h-3.5 w-3.5 text-slate-400" />
            Global Users
          </Link>
        </div>
      </nav>

      {/* Admin Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
