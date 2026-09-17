/**
 * Specific industry custom attributes contracts.
 * These illustrate how the extensible schema accommodates diverse verticals cleanly.
 */

// Phone shop attributes
export interface PhoneAttributes {
  imei?: string;
  serialNumber?: string;
  storage?: string; // e.g. "128GB", "256GB"
  color?: string;
  condition?: "new" | "open_box" | "refurbished" | "used";
  batteryHealth?: number;
  warrantyMonths?: number;
}

// Clothing & Fashion attributes
export interface ClothingAttributes {
  size?: string; // "XS", "S", "M", "L", "XL", "XXL", "32x30"
  color?: string;
  material?: string; // "Cotton", "Polyester", "Denim"
  season?: string;
  gender?: "unisex" | "men" | "women" | "kids";
}

// Car accessories & auto parts attributes
export interface CarAccessoryAttributes {
  brand?: string;
  partNumber?: string;
  oemNumber?: string;
  compatibleVehicleMake?: string[]; // ["Toyota", "Honda", "Nissan"]
  compatibleVehicleModels?: string[]; // ["Corolla 2018-2022", "Civic 2016-2021"]
  warrantyMonths?: number;
}

// Generic attributes map
export type IndustryAttributes =
  | PhoneAttributes
  | ClothingAttributes
  | CarAccessoryAttributes
  | Record<string, string | number | boolean | string[] | undefined>;

export interface ProductVariant {
  _id?: string;
  sku: string;
  barcode?: string;
  name: string; // e.g. "iPhone 15 Pro - 256GB Blue Titanium" or "Cotton T-Shirt - Black / XL"
  costPrice: number;
  sellingPrice: number;
  stockByBranch: Array<{
    branchId: string;
    quantity: number;
    lowStockThreshold?: number;
  }>;
  attributes: Record<string, string | number | boolean>;
}

export interface Category {
  _id: string;
  businessId: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
}

export interface Product {
  _id: string;
  businessId: string; // Tenant isolation key
  name: string;
  sku: string; // Base SKU
  barcode?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  brand?: string;
  unit: string; // "pcs", "kg", "meter", "pair", etc.
  costPrice: number;
  sellingPrice: number;
  taxExempt?: boolean;
  hasVariants: boolean;
  variants: ProductVariant[];
  // Industry-specific flexible payload
  industryAttributes?: IndustryAttributes;
  // Multi-branch aggregated stock or branch breakdown
  stockByBranch: Array<{
    branchId: string;
    quantity: number;
    lowStockThreshold: number;
  }>;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}
