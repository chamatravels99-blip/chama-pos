import React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 pb-6 border-b border-slate-200 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-xs sm:text-sm text-slate-500">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2.5">{children}</div>}
    </div>
  );
}
