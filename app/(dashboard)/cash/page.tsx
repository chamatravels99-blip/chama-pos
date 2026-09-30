"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Banknote, Plus, Receipt, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useBranch } from "@/components/context/BranchContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { hasPermission } from "@/lib/auth/permissions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { CashTransactionType } from "@/models/CashTransaction";
import { SessionUser } from "@/types";

type CashSummary = {
  openingCash: number;
  cashSales: number;
  cashIn: number;
  cashOut: number;
  expenses: number;
  currentExpectedCash: number;
};

type CashRecord = {
  _id: string;
  type: CashTransactionType;
  amount: number;
  description: string;
  branchName: string;
  userName: string;
  createdAt: string;
};

type ActionType = "OPENING_CASH" | "CASH_IN" | "CASH_OUT" | "EXPENSE";

const today = () => new Date().toISOString().slice(0, 10);

const actionDetails: Record<ActionType, { title: string; description: string }> = {
  OPENING_CASH: { title: "Opening Cash", description: "Record the starting cash for this branch today." },
  CASH_IN: { title: "Cash In", description: "Record additional cash received by the branch." },
  CASH_OUT: { title: "Cash Out", description: "Record cash withdrawn or transferred out." },
  EXPENSE: { title: "Daily Expense", description: "Record an operating expense paid from branch cash." },
};

const typeLabels: Record<CashTransactionType, string> = {
  OPENING_CASH: "Opening Cash",
  CASH_IN: "Cash In",
  CASH_OUT: "Cash Out",
  EXPENSE: "Expense",
};

export default function CashPage() {
  const {
    branches,
    selectedBranchId,
    selectedBranchName,
    selectedBusinessId,
    canSelectAllBranches,
    isLoading: branchLoading,
  } = useBranch();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [records, setRecords] = useState<CashRecord[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [action, setAction] = useState<ActionType | null>(null);
  const [targetBranchId, setTargetBranchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setUser(data.authenticated ? data.user : null))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!selectedBranchId || (canSelectAllBranches && !selectedBusinessId)) return;
    let cancelled = false;
    async function loadCash() {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        branchId: selectedBranchId,
        dateFrom,
        dateTo,
      });
      try {
        const [historyResponse, summaryResponse] = await Promise.all([
          fetch(`/api/cash?${params}`, { cache: "no-store" }),
          fetch(`/api/cash/summary?${params}`, { cache: "no-store" }),
        ]);
        const [history, totals] = await Promise.all([historyResponse.json(), summaryResponse.json()]);
        if (!historyResponse.ok) throw new Error(history.error || "Cash history could not be loaded.");
        if (!summaryResponse.ok) throw new Error(totals.error || "Cash summary could not be loaded.");
        if (!cancelled) {
          setRecords(history.transactions || []);
          setCurrency(history.currency || "USD");
          setSummary(totals.summary || null);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Cash data could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadCash();
    return () => { cancelled = true; };
  }, [selectedBranchId, selectedBusinessId, canSelectAllBranches, dateFrom, dateTo]);

  useEffect(() => {
    setTargetBranchId(selectedBranchId !== "ALL" ? selectedBranchId : "");
  }, [selectedBranchId]);

  const canRecordCashIn = user ? hasPermission(user, "CASH_IN") : false;
  const canRecordCashOut = user ? hasPermission(user, "CASH_OUT") : false;
  const canRecordExpense = user ? hasPermission(user, "EXPENSE_CREATE") : false;
  const needsTargetBranch = canSelectAllBranches && selectedBranchId === "ALL";

  async function submitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const branchId = needsTargetBranch ? targetBranchId : selectedBranchId;
    if (!branchId || branchId === "ALL") {
      setError("Select a specific branch before recording a transaction.");
      return;
    }
    const payload: Record<string, unknown> = {
      type: action,
      branchId,
      amount: Number(formData.get("amount")),
      description: String(formData.get("description") || ""),
      reference: String(formData.get("reference") || ""),
    };
    if (action === "EXPENSE") payload.category = String(formData.get("category") || "");

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Transaction could not be recorded.");
      setNotice(`${actionDetails[action].title} recorded.`);
      setAction(null);
      form.reset();
      const params = new URLSearchParams({ branchId: selectedBranchId, dateFrom, dateTo });
      const [historyResponse, summaryResponse] = await Promise.all([
        fetch(`/api/cash?${params}`, { cache: "no-store" }),
        fetch(`/api/cash/summary?${params}`, { cache: "no-store" }),
      ]);
      const [history, totals] = await Promise.all([historyResponse.json(), summaryResponse.json()]);
      if (historyResponse.ok) setRecords(history.transactions || []);
      if (summaryResponse.ok) setSummary(totals.summary || null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Transaction could not be recorded.");
    } finally {
      setSaving(false);
    }
  }

  const summaryCards = [
    { label: "Opening Cash", value: summary?.openingCash },
    { label: "Cash Sales", value: summary?.cashSales },
    { label: "Cash In", value: summary?.cashIn },
    { label: "Cash Out", value: summary?.cashOut },
    { label: "Expenses", value: summary?.expenses },
    { label: "Expected Cash", value: summary?.currentExpectedCash, emphasized: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Cash Management" description="Daily cash position and branch transactions.">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-slate-600" htmlFor="date-from">From</label>
          <input id="date-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700" />
          <label className="text-xs font-medium text-slate-600" htmlFor="date-to">To</label>
          <input id="date-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700" />
        </div>
      </PageHeader>

      {!selectedBusinessId && canSelectAllBranches && (
        <div role="status" className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">Select a business to view cash management.</div>
      )}
      {error && <div role="alert" className="border-l-4 border-rose-500 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      {notice && <div role="status" className="border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

      <section aria-label="Cash summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((item) => (
          <Card key={item.label} className={item.emphasized ? "border-emerald-300 bg-emerald-50" : ""}>
            <p className="text-xs font-medium text-slate-500">{item.label}</p>
            <p className={`mt-2 text-lg font-bold tabular-nums ${item.emphasized ? "text-emerald-800" : "text-slate-900"}`}>
              {summary ? formatCurrency(item.value || 0, currency) : loading ? "..." : "--"}
            </p>
          </Card>
        ))}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Record transaction</h2>
          <p className="mt-1 text-xs text-slate-500">Current branch: {selectedBranchName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRecordCashIn && <Button size="sm" onClick={() => setAction("OPENING_CASH")}><Banknote className="mr-1.5 h-4 w-4" />Opening Cash</Button>}
          {canRecordCashIn && <Button size="sm" variant="outline" onClick={() => setAction("CASH_IN")}><Plus className="mr-1.5 h-4 w-4" />Cash In</Button>}
          {canRecordCashOut && <Button size="sm" variant="outline" onClick={() => setAction("CASH_OUT")}><ArrowUpFromLine className="mr-1.5 h-4 w-4" />Cash Out</Button>}
          {canRecordExpense && <Button size="sm" variant="outline" onClick={() => setAction("EXPENSE")}><Receipt className="mr-1.5 h-4 w-4" />Expense</Button>}
        </div>
      </section>

      {action && (
        <Card>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{actionDetails[action].title}</h2>
              <p className="mt-1 text-xs text-slate-500">{actionDetails[action].description}</p>
            </div>
            <button type="button" title="Close form" aria-label="Close form" onClick={() => setAction(null)} className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={submitTransaction} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(needsTargetBranch || action === "OPENING_CASH") && (
              <label className="grid gap-1 text-xs font-medium text-slate-700">
                Branch
                <select
                  required
                  disabled={!needsTargetBranch}
                  value={needsTargetBranch ? targetBranchId : selectedBranchId}
                  onChange={(event) => setTargetBranchId(event.target.value)}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-100"
                >
                  <option value="">Select branch</option>
                  {branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
                </select>
              </label>
            )}
            <label className="grid gap-1 text-xs font-medium text-slate-700">
              Amount
              <input name="amount" type="number" min="0.01" step="0.01" required className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
            </label>
            {action === "EXPENSE" && (
              <label className="grid gap-1 text-xs font-medium text-slate-700">
                Category <span className="font-normal text-slate-400">Optional</span>
                <input name="category" maxLength={100} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
              </label>
            )}
            <label className="grid gap-1 text-xs font-medium text-slate-700 sm:col-span-2">
              Description
              <input name="description" required maxLength={500} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-700">
              Reference <span className="font-normal text-slate-400">Optional</span>
              <input name="reference" maxLength={150} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
            </label>
            <div className="flex items-end gap-2">
              <Button type="submit" isLoading={saving}><ArrowDownToLine className="mr-1.5 h-4 w-4" />Save transaction</Button>
              <Button type="button" variant="ghost" onClick={() => setAction(null)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Transaction history</h2>
            <p className="mt-1 text-xs text-slate-500">{dateFrom} to {dateTo}</p>
          </div>
          {loading && <span className="text-xs text-slate-500">Loading...</span>}
        </div>
        <Card noPadding className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Branch</th>
                  <th className="px-4 py-3 font-semibold">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {records.map((record) => (
                  <tr key={record._id}>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(record.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">{typeLabels[record.type]}</td>
                    <td className="min-w-48 px-4 py-3 text-slate-700">{record.description}</td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${record.type === "CASH_OUT" || record.type === "EXPENSE" ? "text-rose-700" : "text-slate-900"}`}>
                      {record.type === "CASH_OUT" || record.type === "EXPENSE" ? "-" : "+"}{formatCurrency(record.amount, currency)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.branchName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.userName}</td>
                  </tr>
                ))}
                {!loading && records.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">No cash transactions for this date range.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}