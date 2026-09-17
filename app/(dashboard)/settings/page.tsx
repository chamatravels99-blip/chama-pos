import React from "react";
import { Settings, Building, Store, CreditCard, Shield, Sliders } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { mockCurrentBusiness, mockBranches } from "@/services/mock-data";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Store & Business Settings"
        description="Configure your business profile, branches, tax rules, and subscription plan."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Business Profile */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-brand-600" />
                <CardTitle>Business Information</CardTitle>
              </div>
              <CardDescription>
                Tenant organization attributes and primary contact details.
              </CardDescription>
            </CardHeader>
            <div className="pt-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block mb-1 font-medium">Business Name</span>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-slate-800">
                    {mockCurrentBusiness.name}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1 font-medium">Tenant Slug (Identifier)</span>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 font-mono text-slate-800">
                    {mockCurrentBusiness.slug}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1 font-medium">Industry Classification</span>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 capitalize text-slate-800">
                    {mockCurrentBusiness.industry.replace("_", " ")}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1 font-medium">Primary Contact</span>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800">
                    {mockCurrentBusiness.email}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Branches Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-brand-600" />
                  <CardTitle>Configured Branches ({mockBranches.length})</CardTitle>
                </div>
                <Badge variant="default" size="sm">Multi-Branch Enabled</Badge>
              </div>
              <CardDescription>
                Physical store locations tied to your business tenant account.
              </CardDescription>
            </CardHeader>
            <div className="pt-4 divide-y divide-slate-100">
              {mockBranches.map((br) => (
                <div key={br._id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900 text-xs flex items-center gap-2">
                      {br.name}
                      {br.isMain && (
                        <Badge variant="success" size="sm">Main Flagship</Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Code: <span className="font-mono text-slate-600">{br.code}</span> &bull; {br.phone}
                    </div>
                  </div>
                  <Badge variant="outline" size="sm">Active</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Subscription & Security Overview */}
        <div className="space-y-6">
          <Card className="border-brand-200 bg-brand-50/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-brand-600" />
                  <CardTitle className="text-sm">Subscription Plan</CardTitle>
                </div>
                <Badge variant="success" size="sm">ACTIVE</Badge>
              </div>
              <CardDescription>Commercial SaaS subscription status.</CardDescription>
            </CardHeader>
            <div className="pt-4 space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Plan Tier</span>
                <span className="font-bold text-slate-900">BUSINESS</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Billing Cycle</span>
                <span className="text-slate-800">$79.00 / month</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Max Allowed Branches</span>
                <span className="font-semibold text-slate-800">3 Branches</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Multi-Tenancy Guard</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" /> Enforced
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
