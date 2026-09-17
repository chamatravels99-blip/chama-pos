/**
 * Supported business industries.
 * Flexible enough to support phone shops, clothing, car accessories, electronics, grocery, and general retail.
 */
export type IndustryType =
  | "phones_electronics"
  | "clothing_fashion"
  | "car_accessories"
  | "grocery"
  | "electronics"
  | "general_retail";

export type SubscriptionTier = "TRIAL" | "STARTER" | "BUSINESS" | "PRO";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "suspended";

export interface BusinessSettings {
  currency: string;
  currencySymbol: string;
  taxRate: number; // Percentage, e.g. 15 for 15%
  enableTaxes: boolean;
  receiptHeader?: string;
  receiptFooter?: string;
  lowStockThresholdDefault: number;
}

export interface Business {
  _id: string;
  name: string;
  slug: string; // Unique URL identifier / tenant key
  industry: IndustryType;
  ownerUserId: string;
  email: string;
  phone: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndsAt?: Date | string;
  settings: BusinessSettings;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Branch {
  _id: string;
  businessId: string; // Tenant reference
  name: string;
  code: string; // e.g. "CMB-01", "KND-01"
  phone?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  isMain: boolean; // Main branch flag
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Server-side validated tenant context passed into services/queries.
 * Never constructed directly from untrusted client input.
 */
export interface TenantContext {
  businessId: string;
  currentBranchId?: string;
  userId: string;
  userRole: string;
  businessSlug?: string;
}
