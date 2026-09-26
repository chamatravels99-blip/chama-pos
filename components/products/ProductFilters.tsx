"use client";

import React from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface ProductFiltersState {
  search: string;
  status: "" | "active" | "inactive";
  category: string;
}

interface ProductFiltersProps {
  filters: ProductFiltersState;
  onChange: (filters: ProductFiltersState) => void;
}

export function ProductFilters({ filters, onChange }: ProductFiltersProps) {
  function set(key: keyof ProductFiltersState, value: string) {
    onChange({ ...filters, [key]: value });
  }

  const hasActiveFilters = filters.search || filters.status || filters.category;

  return (
    <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
      {/* Search box */}
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Search name, SKU, barcode, brand…"
          className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => set("search", "")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-1.5">
        <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <select
          value={filters.status}
          onChange={(e) => set("status", e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Category filter */}
      <input
        type="text"
        value={filters.category}
        onChange={(e) => set("category", e.target.value)}
        placeholder="Filter by category…"
        className="w-full sm:w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
      />

      {/* Clear all */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ search: "", status: "", category: "" })}
          className="text-slate-500 hover:text-slate-700 whitespace-nowrap"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
