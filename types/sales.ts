export type PaymentMethod =
  | "cash"
  | "card"
  | "bank_transfer"
  | "mobile_wallet"
  | "store_credit"
  | "split";

export type SaleStatus = "completed" | "parked" | "voided" | "refunded";

export interface SaleItem {
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  barcode?: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  discountAmount: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  // For serial/IMEI tracked items
  serialOrImei?: string;
}

export interface Sale {
  _id: string;
  businessId: string;
  branchId: string;
  invoiceNumber: string; // e.g. "INV-2026-0001"
  cashierUserId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: "paid" | "partial" | "unpaid";
  status: SaleStatus;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
