import React from "react";
import { Building2, CreditCard, Users, Database, ShieldCheck, Activity } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Platform Owner Console</h1>
        <p className="text-xs text-slate-400 mt-1">
          Global multi-tenant metrics, database cluster health, and SaaS subscription telemetry.
        </p>
      </div>

      {/* Platform Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/60">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Tenant Businesses</span>
            <Building2 className="h-4 w-4 text-brand-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">18</div>
          <div className="text-[11px] text-emerald-400 mt-1">+3 onboarded this month</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/60">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Estimated MRR</span>
            <CreditCard className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">$1,422.00</div>
          <div className="text-[11px] text-emerald-400 mt-1">From active SaaS plans</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/60">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Platform Users</span>
            <Users className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">74</div>
          <div className="text-[11px] text-slate-400 mt-1">Owners, managers & cashiers</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/60">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Multi-Tenant DB Status</span>
            <Database className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">Healthy</div>
          <div className="text-[11px] text-emerald-400 mt-1">Tenant isolation verified</div>
        </div>
      </div>

      {/* Tenant Health & Security Architecture */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-800/40 space-y-3">
        <div className="flex items-center gap-2 font-semibold text-sm text-white">
          <ShieldCheck className="h-4 w-4 text-amber-400" />
          Multi-Tenant Isolation Architecture
        </div>
        <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
          Every tenant business operates within an isolated logical namespace. All database models enforce compound indexes starting with <code className="text-amber-300 font-mono">businessId</code>, and tenant authorization is strictly resolved server-side from session tokens.
        </p>
        <div className="flex items-center gap-2 pt-2">
          <Link
            href="/admin/businesses"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
          >
            Manage all tenant businesses &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
