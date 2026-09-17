import React from "react";
import { subscriptionPlans } from "@/config/subscriptions";
import { Check, CreditCard, Sparkles, Shield, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export default function AdminSubscriptionsPage() {
  const tiers = Object.values(subscriptionPlans);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">SaaS Subscription Plans</h1>
        <p className="text-xs text-slate-400 mt-1">
          Feature matrices and tenant limits governing access across Chama POS.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiers.map((plan) => (
          <div
            key={plan.tier}
            className="p-5 rounded-xl border border-slate-800 bg-slate-950 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-white">{plan.name}</span>
                <Badge variant="outline" size="sm" className="border-slate-700 text-slate-300">
                  {plan.tier}
                </Badge>
              </div>

              <div className="mt-2 mb-4">
                <span className="text-2xl font-black text-white">
                  ${plan.priceMonthly}
                </span>
                <span className="text-xs text-slate-400"> / month</span>
              </div>

              <p className="text-xs text-slate-400 mb-4">{plan.description}</p>

              <div className="space-y-2 pt-3 border-t border-slate-800/80 text-xs">
                <div className="text-slate-300 flex items-center justify-between">
                  <span className="text-slate-400">Max Branches:</span>
                  <span className="font-semibold text-white">
                    {plan.limits.maxBranches === -1 ? "Unlimited" : plan.limits.maxBranches}
                  </span>
                </div>
                <div className="text-slate-300 flex items-center justify-between">
                  <span className="text-slate-400">Max Users:</span>
                  <span className="font-semibold text-white">
                    {plan.limits.maxUsers === -1 ? "Unlimited" : plan.limits.maxUsers}
                  </span>
                </div>
                <div className="text-slate-300 flex items-center justify-between">
                  <span className="text-slate-400">Max Products:</span>
                  <span className="font-semibold text-white">
                    {plan.limits.maxProducts === -1 ? "Unlimited" : plan.limits.maxProducts.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Multi-Tenant DB Isolation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className={`h-3.5 w-3.5 shrink-0 ${plan.features.multiBranch ? "text-emerald-400" : "text-slate-600"}`} />
                  <span className={plan.features.multiBranch ? "text-slate-300" : "text-slate-500 line-through"}>
                    Multi-Branch Synchronized
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className={`h-3.5 w-3.5 shrink-0 ${plan.features.advancedReports ? "text-emerald-400" : "text-slate-600"}`} />
                  <span className={plan.features.advancedReports ? "text-slate-300" : "text-slate-500 line-through"}>
                    Advanced Analytics & COGS
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800 text-center">
              <span className="text-[11px] font-mono text-slate-500">
                Tier Code: {plan.tier}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
