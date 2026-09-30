export interface PrintAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface PrintSaleData {
  _id: string;
  invoiceNumber: string;
  cashierName: string;
  customerName?: string;
  items: Array<{
    name: string;
    sku?: string;
    barcode?: string;
    unitPrice: number;
    quantity: number;
    discountAmount: number;
    taxAmount: number;
    subtotal: number;
    total: number;
  }>;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  notes?: string;
  createdAt: string;
}

export interface PrintBusinessData {
  name: string;
  email?: string;
  phone?: string;
  address?: PrintAddress;
  logoUrl?: string;
  settings?: {
    currency?: string;
    currencySymbol?: string;
    receiptHeader?: string;
    receiptFooter?: string;
  };
}

export interface PrintBranchData {
  name: string;
  email?: string;
  phone?: string;
  address?: PrintAddress;
}

export function formatPrintMoney(value: number, business: PrintBusinessData): string {
  const symbol = business.settings?.currencySymbol || business.settings?.currency || "";
  return `${symbol}${new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0)}`;
}

export function formatPrintDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function paymentMethodLabel(value: string): string {
  const labels: Record<string, string> = {
    cash: "Cash",
    card: "Card",
    bank_transfer: "Bank Transfer",
    mobile_wallet: "Mobile Wallet",
    store_credit: "Store Credit",
    split: "Split Payment",
  };
  return labels[value.toLowerCase()] || value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function paymentStatusLabel(value: string): string {
  return value.toLowerCase() === "paid"
    ? "PAID"
    : value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function addressLines(address?: PrintAddress): string[] {
  if (!address) return [];
  return [
    address.street,
    [address.city, address.state, address.postalCode].filter(Boolean).join(", "),
    address.country,
  ].filter((line): line is string => Boolean(line));
}

export function printAddressLines(business: PrintBusinessData, branch: PrintBranchData): string[] {
  const branchLines = addressLines(branch.address);
  return branchLines.length > 0 ? branchLines : addressLines(business.address);
}