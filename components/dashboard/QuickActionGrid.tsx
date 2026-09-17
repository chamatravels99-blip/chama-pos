import React from "react";
import Link from "next/link";
import { ShoppingCart, PlusCircle, ArrowDownToLine, ReceiptText } from "lucide-react";

export function QuickActionGrid() {
  const actions = [
    {
      title: "New POS Sale",
      description: "Launch cashier checkout",
      href: "/sales",
      icon: ShoppingCart,
      color: "bg-brand-600 text-white hover:bg-brand-700",
    },
    {
      title: "Add Product",
      description: "Create catalog item or variant",
      href: "/products",
      icon: PlusCircle,
      color: "bg-emerald-600 text-white hover:bg-emerald-700",
    },
    {
      title: "Receive Stock",
      description: "Log supplier delivery & PO",
      href: "/inventory",
      icon: ArrowDownToLine,
      color: "bg-blue-600 text-white hover:bg-blue-700",
    },
    {
      title: "Record Expense",
      description: "Log shop operating costs",
      href: "/expenses",
      icon: ReceiptText,
      color: "bg-purple-600 text-white hover:bg-purple-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.title}
            href={action.href}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105 ${action.color}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
                {action.title}
              </h4>
              <p className="text-[11px] text-slate-500 leading-tight">
                {action.description}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
