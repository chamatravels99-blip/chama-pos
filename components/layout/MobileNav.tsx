"use client";

import React from "react";
import { X } from "lucide-react";
import { Sidebar } from "./Sidebar";

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 flex w-72 max-w-full flex-col bg-slate-900 shadow-2xl animate-in slide-in-from-left duration-200">
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Sidebar onItemClick={onClose} className="w-full border-r-0" />
      </div>
    </div>
  );
}
