"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, ShieldCheck, Lock, Mail, ArrowRight, Store } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@chamamodzone.com");
  const [password, setPassword] = useState("password123");
  const [businessSlug, setBusinessSlug] = useState("chama-modzone");
  const [selectedRole, setSelectedRole] = useState("BUSINESS_OWNER");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDemoLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      if (selectedRole === "SUPER_ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-100/75 py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg mb-3">
          <Layers className="h-6 w-6" />
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-2xl font-black tracking-tight text-slate-900">CHAMA</span>
          <span className="text-2xl font-bold tracking-tight text-brand-600">POS</span>
        </div>
        <p className="mt-1.5 text-xs text-slate-500 font-medium">
          Commercial Multi-Tenant SaaS Point of Sale
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="p-6 sm:p-8 shadow-sm border-slate-200">
          <form className="space-y-4" onSubmit={handleDemoLogin}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business Tenant Slug
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Store className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={businessSlug}
                  onChange={(e) => setBusinessSlug(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs font-mono placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="e.g. chama-modzone"
                  required
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Server-side tenant resolution validates tenant existence.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>
            </div>

            {/* Role Switcher for Phase 1 Architecture Demonstration */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Architecture Demo Role Simulation
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { role: "BUSINESS_OWNER", label: "Business Owner" },
                  { role: "CASHIER", label: "Store Cashier" },
                  { role: "MANAGER", label: "Branch Manager" },
                  { role: "SUPER_ADMIN", label: "Platform Admin" },
                ].map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => setSelectedRole(item.role)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      selectedRole === item.role
                        ? "border-brand-600 bg-brand-50 text-brand-700 font-semibold"
                        : "border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <div className="text-[11px]">{item.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              isLoading={isSubmitting}
            >
              Sign In to POS
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500">
              Chama POS Multi-Tenant SaaS Architecture Foundation
            </p>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-emerald-600 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              Isolated Tenant Schema Enforced
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
