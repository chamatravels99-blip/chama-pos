import { UserRole, BranchAccess, Permission } from "./user";

export type IndustryType =
  | "phones_electronics"
  | "clothing_fashion"
  | "car_accessories"
  | "grocery"
  | "electronics"
  | "general_retail";

export type SubscriptionTier = "TRIAL" | "STARTER" | "BUSINESS" | "PRO";

export type BusinessStatus = "active" | "inactive" | "suspended";
export type BranchStatus = "active" | "inactive";

export interface BusinessSettings {
  currency: string;
  currencySymbol: string;
  taxRate: number; // Percentage, e.g. 15 for 15%
  enableTaxes: boolean;
  receiptHeader?: string;
  receiptFooter?: string;
  lowStockThresholdDefault: number;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface Business {
  _id: string;
  name: string;
  slug: string; // Unique URL identifier / tenant key
  businessType: string; // e.g. "Car Accessories", "Phone Shop", "Clothing"
  industry?: IndustryType; // Backward compatible mapped type
  status: BusinessStatus;
  isActive?: boolean;
  ownerUserId?: string;
  email?: string;
  phone?: string;
  address?: Address;
  subscriptionTier?: SubscriptionTier;
  subscriptionStatus?: string;
  settings?: BusinessSettings;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Branch {
  _id: string;
  businessId: string; // Tenant reference
  name: string;
  code: string; // e.g. "CMB-01", "NGB-01"
  address?: Address;
  phone?: string;
  email?: string;
  status: BranchStatus;
  isActive?: boolean;
  isMain?: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Reusable server-side validated tenant context.
 * Constructed ONLY from authenticated session.
 * Never trust a businessId supplied by the browser/client.
 */
export interface TenantContext {
  userId: string;
  username?: string;
  businessId: string | null; // Null for PLATFORM_ADMIN / PLATFORM_OWNER
  branchAccess?: BranchAccess;
  branchIds: string[];
  role: UserRole;
  permissions?: Permission[];
  businessSlug?: string;
  businessName?: string;
  activeBranchId?: string;
}
