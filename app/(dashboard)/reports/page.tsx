import React from "react";
import { BarChart3, Download, TrendingUp, DollarSign, Calendar, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function ReportsPage() {
  const reportCards = [
    {
      title: "Sales & Revenue Summary",
      description: "Daily, weekly, and monthly gross sales, discounts, and net income breakdown.",
      icon: TrendingUp,
      status: "Ready",
    },
    {
      title: "Product Profitability & Margins",
      description: "Cost of Goods Sold (COGS), gross margin percentage, and top contributing SKUs.",
      icon: DollarSign,
      status: "Ready",
    },
    {
      title: "Inventory Stock Valuation",
      description: "Total stock value calculated by FIFO cost price and selling price across branches.",
      icon: BarChart3,
      status: "Ready",
    },
    {
      title: "Cashier Shift & Register Audits",
      description: "End-of-day register closing totals, cash drawer discrepancies, and void logs.",
      icon: FileSpreadsheet,
      status: "Ready",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Financial Reports"
        description="Comprehensive store intelligence, profit & loss statements, and tax summaries."
      >
        <Button variant="outline" size="sm" disabled>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export All (CSV/PDF)
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reportCards.map((rep) => {
          const Icon = rep.icon;
          return (
            <Card key={rep.title} className="p-5 hover:border-slate-300 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 border border-brand-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{rep.title}</h3>
                    <Badge variant="secondary" size="sm" className="mt-1">
                      {rep.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                {rep.description}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Multi-branch aggregated</span>
                <Button variant="ghost" size="sm" className="text-brand-600 text-xs">
                  Generate Report &rarr;
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
