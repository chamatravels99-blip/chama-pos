import React from "react";
import { Users, Shield, Building, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export default function AdminUsersPage() {
  const exampleUsers = [
    {
      id: "usr_root_001",
      name: "Chama Platform Superadmin",
      email: "admin@chamapos.com",
      role: "SUPER_ADMIN",
      businessName: "Platform System",
      tenantSlug: "system",
      status: "Active",
    },
    {
      id: "usr_owner_001",
      name: "Kasun Perera",
      email: "owner@chamamodzone.com",
      role: "BUSINESS_OWNER",
      businessName: "Chama Modzone",
      tenantSlug: "chama-modzone",
      status: "Active",
    },
    {
      id: "usr_cashier_001",
      name: "Dinesh Fernando",
      email: "dinesh@abcphones.lk",
      role: "CASHIER",
      businessName: "ABC Phone Shop",
      tenantSlug: "abc-phone-shop",
      status: "Active",
    },
    {
      id: "usr_mgr_001",
      name: "Sunil Bandara",
      email: "sunil@xyzclothing.com",
      role: "MANAGER",
      businessName: "XYZ Clothing",
      tenantSlug: "xyz-clothing",
      status: "Active",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Platform Global Users</h1>
        <p className="text-xs text-slate-400 mt-1">
          Directory of registered users across all tenant businesses and platform superadmins.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">User Name & Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Associated Business</th>
                <th className="py-3 px-4 font-mono">Tenant Slug</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {exampleUsers.map((usr) => (
                <tr key={usr.id} className="hover:bg-slate-900/50">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{usr.name}</div>
                    <div className="text-slate-400 text-[11px]">{usr.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={usr.role === "SUPER_ADMIN" ? "warning" : "default"}
                      size="sm"
                    >
                      {usr.role}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{usr.businessName}</td>
                  <td className="py-3 px-4 font-mono text-amber-400/80">{usr.tenantSlug}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="success" size="sm">
                      {usr.status}
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
