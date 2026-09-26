"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { SessionUser } from "@/types";

export interface BranchItem {
  _id: string;
  name: string;
  code: string;
  isMain?: boolean;
}

interface BranchContextType {
  branches: BranchItem[];
  selectedBranchId: string; // "ALL" or specific branch _id
  selectedBranchName: string; // "All Branches" or specific branch name
  canSelectAllBranches: boolean;
  setSelectedBranch: (branchId: string) => void;
  isLoading: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Load session user
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      } catch (err) {
        console.error("BranchProvider user load error:", err);
      }
    }
    loadUser();
  }, []);

  // Load branches
  const loadBranches = useCallback(async () => {
    try {
      const res = await fetch("/api/branches");
      const data = await res.json();
      if (data.success && Array.isArray(data.branches)) {
        setBranches(data.branches);
      }
    } catch (err) {
      console.error("BranchProvider branches load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const canSelectAllBranches =
    currentUser?.role === "BUSINESS_OWNER" ||
    currentUser?.role === "PLATFORM_OWNER" ||
    currentUser?.role === "PLATFORM_ADMIN" ||
    currentUser?.role === "SUPER_ADMIN" ||
    currentUser?.branchAccess === "ALL_BRANCHES";

  // Filter branches visible to current user
  const permittedBranches = branches.filter((b) => {
    if (canSelectAllBranches) return true;
    return (currentUser?.branchIds || []).includes(b._id);
  });

  // Initialize or enforce branch selection when user / branches change
  useEffect(() => {
    if (!currentUser || branches.length === 0) return;

    if (!canSelectAllBranches) {
      // User is restricted to assigned branches: cannot select "ALL"
      const userAssigned = currentUser.branchIds || [];
      if (!userAssigned.includes(selectedBranchId)) {
        // Default to first assigned branch
        setSelectedBranchId(userAssigned[0] || "");
      }
    } else {
      // User can view All Branches, restore saved preference if valid
      const saved = typeof window !== "undefined" ? localStorage.getItem("chama_active_branch") : null;
      if (saved && (saved === "ALL" || branches.some((b) => b._id === saved))) {
        setSelectedBranchId(saved);
      } else {
        setSelectedBranchId("ALL");
      }
    }
  }, [currentUser, branches, canSelectAllBranches]);

  const setSelectedBranch = (branchId: string) => {
    if (!canSelectAllBranches && branchId === "ALL") return;
    setSelectedBranchId(branchId);
    if (typeof window !== "undefined") {
      localStorage.setItem("chama_active_branch", branchId);
    }
  };

  const selectedBranchName =
    selectedBranchId === "ALL"
      ? "All Branches"
      : branches.find((b) => b._id === selectedBranchId)?.name || "Select Branch";

  return (
    <BranchContext.Provider
      value={{
        branches: permittedBranches,
        selectedBranchId,
        selectedBranchName,
        canSelectAllBranches,
        setSelectedBranch,
        isLoading,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error("useBranch must be used within a BranchProvider");
  }
  return context;
}
