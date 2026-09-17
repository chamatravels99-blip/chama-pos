import React from "react";
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  changePercent?: number;
  changeLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  changePercent,
  changeLabel = "vs. yesterday",
  icon: Icon,
  iconColor = "text-brand-600 bg-brand-50 border-brand-200",
  className,
}: StatCardProps) {
  const isPositive = changePercent !== undefined && changePercent >= 0;

  return (
    <Card className={cn("relative overflow-hidden p-5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{title}</span>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-slate-900">{value}</div>

        {changePercent !== undefined && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "inline-flex items-center font-semibold",
                isPositive ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {Math.abs(changePercent)}%
            </span>
            <span className="text-slate-400">{changeLabel}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
