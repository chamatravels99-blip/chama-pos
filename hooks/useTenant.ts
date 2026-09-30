"use client";

import { useEffect, useState } from "react";
import { Business, Branch } from "@/types";

export interface UseTenantReturn {
  business: Business | null;
  branches: Branch[];
  currentBranch: Branch | null;
  switchBranch: (branchId: string) => void;
  isLoading: boolean;
}

/**
 * Hook for consuming the authenticated tenant and authorized branch context.
 */
export function useTenant(): UseTenantReturn {
  const [business, setBusiness] = useState<Business | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranchId, setCurrentBranchId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadTenant() {
      try {
        const [businessResponse, branchResponse] = await Promise.all([
          fetch("/api/businesses/me", { cache: "no-store" }),
          fetch("/api/branches", { cache: "no-store" }),
        ]);
        const [businessData, branchData] = await Promise.all([
          businessResponse.json(),
          branchResponse.json(),
        ]);
        if (cancelled) return;
        setBusiness(businessResponse.ok ? businessData.business || null : null);
        const authorizedBranches = branchResponse.ok && Array.isArray(branchData.branches)
          ? branchData.branches
          : [];
        setBranches(authorizedBranches);
        setCurrentBranchId((current) =>
          authorizedBranches.some((branch: Branch) => branch._id === current)
            ? current
            : authorizedBranches.find((branch: Branch) => branch.isMain)?._id || authorizedBranches[0]?._id || ""
        );
      } catch {
        if (!cancelled) {
          setBusiness(null);
          setBranches([]);
          setCurrentBranchId("");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadTenant();
    return () => { cancelled = true; };
  }, []);

  const currentBranch =
    branches.find((b) => b._id === currentBranchId) || null;

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
    isLoading,
  };
}
