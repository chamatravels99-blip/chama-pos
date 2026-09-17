"use client";

import { useState } from "react";
import { mockCurrentBusiness, mockBranches } from "@/services/mock-data";
import { Business, Branch } from "@/types";

export interface UseTenantReturn {
  business: Business;
  branches: Branch[];
  currentBranch: Branch;
  switchBranch: (branchId: string) => void;
  isLoading: boolean;
}

/**
 * Hook for consuming the active tenant & branch context in client UI components.
 * Currently backed by mock data for Phase 1; designed to seamlessly wire up to
 * real session/API state in Phase 2.
 */
export function useTenant(): UseTenantReturn {
  const [business] = useState<Business>(mockCurrentBusiness);
  const [branches] = useState<Branch[]>(mockBranches);
  const [currentBranchId, setCurrentBranchId] = useState<string>(
    mockBranches.find((b) => b.isMain)?._id || mockBranches[0]._id
  );

  const currentBranch =
    branches.find((b) => b._id === currentBranchId) || branches[0];

  const switchBranch = (branchId: string) => {
    const found = branches.find((b) => b._id === branchId);
    if (found) {
      setCurrentBranchId(branchId);
    }
  };

  return {
    business,
    branches,
    currentBranch,
    switchBranch,
    isLoading: false,
  };
}
