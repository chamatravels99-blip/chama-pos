export type ProductStatus = "active" | "inactive";

// Industry-specific attribute extensions
export interface PhoneAttributes {
  imei?: string;
  serialNumber?: string;
  storage?: string;
  color?: string;
  condition?: "new" | "open_box" | "refurbished" | "used";
  batteryHealth?: number;
  warrantyMonths?: number;
}

export interface ClothingAttributes {
  size?: string;
  color?: string;
  material?: string;
  season?: string;
  gender?: "unisex" | "men" | "women" | "kids";
}

export interface CarAccessoryAttributes {
  brand?: string;
  partNumber?: string;
  oemNumber?: string;
  compatibleVehicleMake?: string[];
  compatibleVehicleModels?: string[];
  warrantyMonths?: number;
}

export type IndustryAttributes =
  | PhoneAttributes
  | ClothingAttributes
  | CarAccessoryAttributes
  | Record<string, string | number | boolean | string[] | undefined>;

export interface ProductVariant {
  _id?: string;
  sku: string;
  barcode?: string;
  name: string;
  costPrice: number;
  price: number;
  sellingPrice?: number; // Backward compatibility alias
  stockByBranch?: Array<{
    branchId: string;
    quantity: number;
    lowStockThreshold?: number;
  }>;
  attributes?: Record<string, string | number | boolean>;
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
  categoryId?: string;
  categoryName?: string;
  price: number; // Retail / Selling price
  sellingPrice?: number; // Alias for price
  costPrice: number;
  status: ProductStatus;
  isActive?: boolean;
  description?: string;
  brand?: string;
  unit?: string;
  taxExempt?: boolean;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  industryAttributes?: IndustryAttributes;
  stockByBranch?: Array<{
    branchId: string;
    quantity: number;
    lowStockThreshold: number;
  }>;
  createdAt: Date | string;
  updatedAt: Date | string;
}
