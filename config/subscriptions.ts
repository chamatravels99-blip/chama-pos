import { SubscriptionTier } from "@/types";

export interface SubscriptionPlanConfig {
  tier: SubscriptionTier;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  description: string;
  limits: {
    maxBranches: number; // e.g. 1 for starter, 5 for business, unlimited (-1) for pro
    maxUsers: number;
    maxProducts: number;
    maxSalesPerMonth: number;
  };
  features: {
    multiBranch: boolean;
    advancedReports: boolean;
    inventoryAlerts: boolean;
    customAttributes: boolean;
    barcodeScanning: boolean;
    exportReports: boolean;
    prioritySupport: boolean;
  };
}

export const subscriptionPlans: Record<SubscriptionTier, SubscriptionPlanConfig> = {
  TRIAL: {
    tier: "TRIAL",
    name: "14-Day Free Trial",
    priceMonthly: 0,
    priceAnnual: 0,
    description: "Experience the full power of Chama POS with no commitment.",
    limits: {
      maxBranches: 1,
      maxUsers: 2,
      maxProducts: 100,
      maxSalesPerMonth: 300,
    },
    features: {
      multiBranch: false,
      advancedReports: false,
      inventoryAlerts: true,
      customAttributes: true,
      barcodeScanning: true,
      exportReports: false,
      prioritySupport: false,
    },
  },
  STARTER: {
    tier: "STARTER",
    name: "Starter",
    priceMonthly: 29,
    priceAnnual: 290,
    description: "Ideal for single-store retail, boutiques, and emerging phone shops.",
    limits: {
      maxBranches: 1,
      maxUsers: 3,
      maxProducts: 1000,
      maxSalesPerMonth: 2000,
    },
    features: {
      multiBranch: false,
      advancedReports: false,
      inventoryAlerts: true,
      customAttributes: true,
      barcodeScanning: true,
      exportReports: true,
      prioritySupport: false,
    },
  },
  BUSINESS: {
    tier: "BUSINESS",
    name: "Business",
    priceMonthly: 79,
    priceAnnual: 790,
    description: "Designed for growing multi-branch businesses with high sales volume.",
    limits: {
      maxBranches: 3,
      maxUsers: 10,
      maxProducts: 10000,
      maxSalesPerMonth: 15000,
    },
    features: {
      multiBranch: true,
      advancedReports: true,
      inventoryAlerts: true,
      customAttributes: true,
      barcodeScanning: true,
      exportReports: true,
      prioritySupport: false,
    },
  },
  PRO: {
    tier: "PRO",
    name: "Enterprise Pro",
    priceMonthly: 199,
    priceAnnual: 1990,
    description: "Unlimited scale for multi-chain brands, franchises, and enterprise retailers.",
    limits: {
      maxBranches: -1, // Unlimited
      maxUsers: -1, // Unlimited
      maxProducts: -1, // Unlimited
      maxSalesPerMonth: -1, // Unlimited
    },
    features: {
      multiBranch: true,
      advancedReports: true,
      inventoryAlerts: true,
      customAttributes: true,
      barcodeScanning: true,
      exportReports: true,
      prioritySupport: true,
    },
  },
};
