"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layers, ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("owner@chamamodzone.com");
  const [password, setPassword] = useState("ChamaDev@2026!");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Quick fill helper for development demonstration
  const handleQuickFill = (fillEmail: string) => {
    setEmail(fillEmail);
    setPassword("ChamaDev@2026!");
    setErrorMessage("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Authentication failed. Please check your credentials.");
        setIsLoading(false);
        return;
      }

      // Route according to user role
      if (data.user?.role === "PLATFORM_ADMIN" || data.user?.role === "SUPER_ADMIN") {
        router.push("/admin");
      } else {
        router.push(redirectUrl);
      }
      router.refresh();
    } catch {
      setErrorMessage("Network error connecting to authentication service.");
      setIsLoading(false);
    }
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
          {errorMessage && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
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
                  placeholder="name@business.com"
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

            <Button
              type="submit"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Sign In to Store
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </form>

          {/* Development Seed Account Quick Selectors */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Dev Seed Accounts
              </span>
              <Badge variant="outline" size="sm" className="text-[10px]">Dev Only</Badge>
            </div>
            <p className="text-[11px] text-slate-500 mb-2.5">
              Click any account below to populate credentials and test tenant isolation:
            </p>

            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill("owner@chamamodzone.com")}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-left transition-colors"
              >
                <div>
                  <div className="font-semibold text-slate-800">Chama Modzone</div>
                  <div className="text-[11px] text-slate-500">owner@chamamodzone.com</div>
                </div>
                <Badge variant="default" size="sm">Car Audio</Badge>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill("owner@abcphones.lk")}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-left transition-colors"
              >
                <div>
                  <div className="font-semibold text-slate-800">ABC Phone Shop</div>
                  <div className="text-[11px] text-slate-500">owner@abcphones.lk</div>
                </div>
                <Badge variant="secondary" size="sm">Phones</Badge>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill("owner@xyzclothing.com")}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-left transition-colors"
              >
                <div>
                  <div className="font-semibold text-slate-800">XYZ Clothing</div>
                  <div className="text-[11px] text-slate-500">owner@xyzclothing.com</div>
                </div>
                <Badge variant="secondary" size="sm">Clothing</Badge>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill("admin@chamapos.com")}
                className="flex items-center justify-between p-2 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-left transition-colors"
              >
                <div>
                  <div className="font-semibold text-amber-900">Platform Admin</div>
                  <div className="text-[11px] text-amber-700">admin@chamapos.com</div>
                </div>
                <Badge variant="warning" size="sm">Root Admin</Badge>
              </button>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-600 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              HTTP-Only Encrypted Session Cookies Active
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-100/75">
        <div className="text-slate-500 text-sm">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
