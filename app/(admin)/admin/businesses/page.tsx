import React from "react";
import { Building2, Plus, Search, ExternalLink, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminBusinessesPage() {
  const exampleTenants = [
    {
      id: "biz_001",
      name: "Chama Modzone",
      slug: "chama-modzone",
      industry: "Car accessories / car audio",
      ownerEmail: "owner@chamamodzone.com",
      plan: "BUSINESS",
      branchesCount: 3,
      status: "Active",
      createdAt: "2026-01-10",
    },
    {
      id: "biz_002",
      name: "ABC Phone Shop & Repairs",
      slug: "abc-phone-shop",
      industry: "Mobile phones / accessories / repairs",
      ownerEmail: "admin@abcphones.lk",
      plan: "BUSINESS",
      branchesCount: 3, // Colombo, Negombo, Kandy
      status: "Active",
      createdAt: "2026-02-01",
    },
    {
      id: "biz_003",
      name: "XYZ Clothing & Apparel",
      slug: "xyz-clothing",
      industry: "Clothing / fashion",
      ownerEmail: "contact@xyzclothing.com",
      plan: "STARTER",
      branchesCount: 1,
      status: "Active",
      createdAt: "2026-02-18",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Tenant Businesses</h1>
          <p className="text-xs text-slate-400 mt-1">
            Independent businesses registered on the Chama POS multi-tenant SaaS platform.
          </p>
        </div>
        <Button variant="primary" size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold border-none">
          <Plus className="h-4 w-4 mr-1.5" />
          Onboard New Business
        </Button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Business Name & Slug</th>
                <th className="py-3 px-4">Industry Vertical</th>
                <th className="py-3 px-4">Owner Email</th>
                <th className="py-3 px-4 text-center">Branches</th>
                <th className="py-3 px-4 text-center">Plan Tier</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {exampleTenants.map((biz) => (
                <tr key={biz.id} className="hover:bg-slate-900/50">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{biz.name}</div>
                    <div className="font-mono text-[11px] text-amber-400/80">{biz.slug}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{biz.industry}</td>
                  <td className="py-3 px-4 text-slate-400">{biz.ownerEmail}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="rounded bg-slate-800 px-2 py-0.5 font-semibold text-slate-300">
                      {biz.branchesCount}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="default" size="sm" className="bg-brand-900/60 text-brand-300 border-brand-700/60">
                      {biz.plan}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="success" size="sm" className="bg-emerald-900/60 text-emerald-300 border-emerald-700/60">
                      {biz.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
