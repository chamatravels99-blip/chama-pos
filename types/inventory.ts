export type StockMovementType =
  | "opening_stock"
  | "purchase_received"
  | "sale"
  | "sale_return"
  | "damaged"
  | "transfer_in"
  | "transfer_out"
  | "adjustment"
  | "audit";

export interface StockMovement {
  _id: string;
  businessId: string;
  branchId: string;
  productId: string;
  variantId?: string;
  type: StockMovementType;
  quantityChange: number; // positive or negative
  previousQuantity: number;
  newQuantity: number;
  referenceId?: string; // saleId, purchaseOrderId, transferId
  userId: string;
  notes?: string;
  createdAt: Date | string;
}

export interface InventoryItemSummary {
  productId: string;
  productName: string;
  sku: string;
  categoryName?: string;
  currentStock: number;
  lowStockThreshold: number;
  costPrice: number;
  sellingPrice: number;
  branchId: string;
  branchName: string;
  isLowStock: boolean;
}
