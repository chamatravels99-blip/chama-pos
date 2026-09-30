"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SessionUser } from "@/types";
import { isPlatformRole } from "@/lib/auth/permissions";

export interface BranchItem {
  _id: string;
  name: string;
  code: string;
  isMain?: boolean;
}

interface BranchContextType {
  businesses: { _id: string; name: string; slug: string }[];
  selectedBusinessId: string;
  selectedBusinessName: string;
  setSelectedBusiness: (businessId: string) => Promise<void>;
  branches: BranchItem[];
  selectedBranchId: string; // "ALL" or specific branch _id
  selectedBranchName: string; // "All Branches" or specific branch name
  canSelectAllBranches: boolean;
  setSelectedBranch: (branchId: string) => Promise<void>;
  isLoading: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [businesses, setBusinesses] = useState<{ _id: string; name: string; slug: string }[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [branchesLoadedForBusiness, setBranchesLoadedForBusiness] = useState("");
  const isPlatformUser = currentUser ? isPlatformRole(currentUser.role) : false;

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!cancelled && data.authenticated && data.user) {
          setCurrentUser(data.user);
        } else if (!cancelled) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("BranchProvider user load error:", err);
        if (!cancelled) setIsLoading(false);
      }
    }
    loadUser();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (!isPlatformUser) {
      setBusinesses([]);
      setSelectedBusinessId(currentUser.businessId || "");
      fetch("/api/context/selection", { cache: "no-store" })
        .then((response) => response.json())
        .then((selection) => {
          if (typeof selection.branchId === "string") setSelectedBranchId(selection.branchId);
        })
        .catch((err) => console.error("BranchProvider selection load error:", err));
      return;
    }

    let cancelled = false;
    async function loadBusinesses() {
      try {
        const [businessResponse, selectionResponse] = await Promise.all([
          fetch("/api/businesses", { cache: "no-store" }),
          fetch("/api/context/selection", { cache: "no-store" }),
        ]);
        const [businessData, selection] = await Promise.all([
          businessResponse.json(),
          selectionResponse.json(),
        ]);
        const choices = businessResponse.ok && Array.isArray(businessData.businesses)
          ? businessData.businesses
          : [];
        if (cancelled) return;
        setBusinesses(choices);
        const activeBusinessId = selectionResponse.ok && typeof selection.businessId === "string"
          ? selection.businessId
          : "";
        setSelectedBusinessId(choices.some((business: { _id: string }) => business._id === activeBusinessId)
          ? activeBusinessId
          : "");
        setSelectedBranchId(typeof selection.branchId === "string" ? selection.branchId : "");
        setIsLoading(false);
      } catch (err) {
        console.error("BranchProvider businesses load error:", err);
        if (!cancelled) setIsLoading(false);
      }
    }
    loadBusinesses();
    return () => { cancelled = true; };
  }, [currentUser, isPlatformUser]);

  useEffect(() => {
    if (!currentUser) return;
    const businessId = isPlatformUser ? selectedBusinessId : currentUser.businessId || "";
    setBranches([]);

    if (isPlatformUser && !businessId) {
      setIsLoading(false);
      setBranchesLoadedForBusiness("");
      return;
    }

    const controller = new AbortController();
    setBranchesLoadedForBusiness("");
    async function loadBranches() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/branches", { cache: "no-store", signal: controller.signal });
        const data = await res.json();
        if (!controller.signal.aborted && data.success && Array.isArray(data.branches)) {
          setBranches(data.branches);
        }
      } catch (err) {
        if (!controller.signal.aborted) console.error("BranchProvider branches load error:", err);
      } finally {
        if (!controller.signal.aborted) {
          setBranchesLoadedForBusiness(businessId);
          setIsLoading(false);
        }
      }
    }
    loadBranches();
    return () => controller.abort();
  }, [currentUser, isPlatformUser, selectedBusinessId]);

  const canSelectAllBranches =
    (isPlatformUser && Boolean(selectedBusinessId)) ||
    currentUser?.role === "BUSINESS_OWNER" ||
    currentUser?.branchAccess === "ALL_BRANCHES";

  const permittedBranches = branches.filter((b) => {
    if (canSelectAllBranches) return true;
    return (currentUser?.branchIds || []).includes(b._id);
  });

  useEffect(() => {
    if (!currentUser) return;
    if (isPlatformUser && !selectedBusinessId) {
      setSelectedBranchId("");
      return;
    }
    const activeBusinessId = isPlatformUser ? selectedBusinessId : currentUser.businessId || "";
    if (branchesLoadedForBusiness !== activeBusinessId) return;
    if (isLoading) return;

    const availableBranches = branches.filter((branch) =>
      canSelectAllBranches || (currentUser.branchIds || []).includes(branch._id)
    );
    const selectedIsAvailable = selectedBranchId === "ALL"
      ? canSelectAllBranches
      : availableBranches.some((branch) => branch._id === selectedBranchId);
    const nextBranchId = selectedIsAvailable
      ? selectedBranchId
      : canSelectAllBranches
        ? "ALL"
        : availableBranches[0]?._id || "";
    setSelectedBranchId(nextBranchId);
  }, [currentUser, isPlatformUser, selectedBusinessId, branches, branchesLoadedForBusiness, canSelectAllBranches, isLoading, selectedBranchId]);

  const setSelectedBusiness = async (businessId: string) => {
    if (!isPlatformUser || !businesses.some((business) => business._id === businessId)) return;
    setBranches([]);
    setSelectedBranchId("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/context/selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const selection = await response.json();
      if (!response.ok) throw new Error(selection.error || "Failed to select business.");
      setSelectedBusinessId(selection.businessId);
      setSelectedBranchId(selection.branchId || "ALL");
      window.location.reload();
    } catch (err) {
      console.error("BranchProvider business selection error:", err);
      setIsLoading(false);
      window.location.reload();
    }
  };

  const setSelectedBranch = async (branchId: string) => {
    if (branchId === "ALL" && !canSelectAllBranches) return;
    if (branchId !== "ALL" && !permittedBranches.some((branch) => branch._id === branchId)) return;
    try {
      const response = await fetch("/api/context/selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId }),
      });
      const selection = await response.json();
      if (!response.ok) throw new Error(selection.error || "Failed to select branch.");
      setSelectedBranchId(selection.branchId || "");
      router.refresh();
    } catch (err) {
      console.error("BranchProvider branch selection error:", err);
    }
  };

  const selectedBusinessName = businesses.find((business) => business._id === selectedBusinessId)?.name || "";
  const selectedBranchName =
    isPlatformUser && !selectedBusinessId
      ? "Select Business"
      :
    selectedBranchId === "ALL"
      ? "All Branches"
      : permittedBranches.find((b) => b._id === selectedBranchId)?.name || "Select Branch";

  return (
    <BranchContext.Provider
      value={{
        businesses,
        selectedBusinessId,
        selectedBusinessName,
        setSelectedBusiness,
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
