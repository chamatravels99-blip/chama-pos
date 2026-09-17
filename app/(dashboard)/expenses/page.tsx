import React from "react";
import { Receipt, Plus, Filter, DollarSign, Calendar } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

export default function ExpensesPage() {
  const mockExpenses = [
    {
      id: "exp_01",
      category: "Store Rent & Lease",
      description: "Colombo Flagship Showroom Monthly Rent",
      branch: "Colombo Main Flagship",
      amount: 1200.0,
      paymentMethod: "Bank Transfer",
      date: "2026-03-01",
      status: "Approved",
    },
    {
      id: "exp_02",
      category: "Electricity & Utilities",
      description: "CEB Commercial Power Bill - Negombo",
      branch: "Negombo Auto Center",
      amount: 185.5,
      paymentMethod: "Card",
      date: "2026-03-05",
      status: "Approved",
    },
    {
      id: "exp_03",
      category: "Freight & Logistics",
      description: "DHL Import Customs & Delivery Clearing",
      branch: "Colombo Main Flagship",
      amount: 226.5,
      paymentMethod: "Cash",
      date: "2026-03-12",
      status: "Approved",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operating Expenses"
        description="Record shop overheads, utility bills, rent, and miscellaneous branch expenses."
      >
        <Button variant="primary" size="md">
          <Plus className="h-4 w-4 mr-1.5" />
          Record New Expense
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-slate-500 font-medium">This Month Total</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">$1,612.00</div>
          <div className="text-[11px] text-slate-400 mt-1">Across 3 branches</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500 font-medium">Top Category</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">Rent & Lease</div>
          <div className="text-[11px] text-slate-400 mt-1">74.4% of total expenses</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500 font-medium">Pending Approvals</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">0 Pending</div>
          <div className="text-[11px] text-slate-400 mt-1">All vouchers cleared</div>
        </Card>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <CardTitle>Expense Voucher Log</CardTitle>
          <Button variant="outline" size="sm" disabled>
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Filter Period
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/75">
                  <td className="py-3 px-4 font-medium text-slate-900">{exp.category}</td>
                  <td className="py-3 px-4 text-slate-600">{exp.description}</td>
                  <td className="py-3 px-4 text-slate-500">{exp.branch}</td>
                  <td className="py-3 px-4">{exp.paymentMethod}</td>
                  <td className="py-3 px-4 text-right font-semibold text-rose-600">
                    -{formatCurrency(exp.amount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="success" size="sm">
                      {exp.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
