import {
  formatPrintDate,
  formatPrintMoney,
  paymentMethodLabel,
  paymentStatusLabel,
  printAddressLines,
  PrintBranchData,
  PrintBusinessData,
  PrintSaleData,
} from "@/components/print/print-utils";
import { InvoiceBarcode } from "@/components/print/InvoiceBarcode";

export function ThermalReceipt({
  sale,
  business,
  branch,
}: {
  sale: PrintSaleData;
  business: PrintBusinessData;
  branch: PrintBranchData;
}) {
  const address = printAddressLines(business, branch);
  const contactNumber = branch.phone || business.phone;

  return (
    <article className="thermal-paper print-thermal">
      <header className="thermal-center">
        <h1 className="thermal-business-name">{business.name}</h1>
        <p className="thermal-branch-name">{branch.name}</p>
        {address.map((line) => <p key={line}>{line}</p>)}
        {contactNumber && <p>{contactNumber}</p>}
        <div className="thermal-rule" />
        <h2>RECEIPT</h2>
      </header>

      <section className="thermal-meta">
        <div><span>Date</span><strong>{formatPrintDate(sale.createdAt)}</strong></div>
        <div><span>Cashier</span><strong>{sale.cashierName}</strong></div>
      </section>

      {sale.customer && (
        <section className="thermal-meta">
          <div><span>Customer</span><strong>{sale.customer.name}</strong></div>
          {sale.customer.phone && <div><span>Phone</span><strong>{sale.customer.phone}</strong></div>}
        </section>
      )}

      <section className="thermal-items">
        <h3>PRODUCTS</h3>
        {sale.items.map((item, index) => (
          <div className="thermal-item" key={`${item.sku || item.name}-${index}`}>
            <strong className="thermal-item-name">{item.name}</strong>
            <div className="thermal-item-detail">
              <span>{item.quantity} × {formatPrintMoney(item.unitPrice, business)}</span>
              <strong>{formatPrintMoney(item.total, business)}</strong>
            </div>
          </div>
        ))}
      </section>

      <section className="thermal-totals">
        <div><span>Subtotal</span><span>{formatPrintMoney(sale.subtotal, business)}</span></div>
        <div><span>Discount</span><span>{formatPrintMoney(sale.discountTotal, business)}</span></div>
        <div><span>Tax</span><span>{formatPrintMoney(sale.taxTotal, business)}</span></div>
        <div className="thermal-grand-total"><strong>Total</strong><strong>{formatPrintMoney(sale.grandTotal, business)}</strong></div>
        <div><span>Paid</span><span>{formatPrintMoney(sale.paidAmount, business)}</span></div>
        <div><span>Change</span><span>{formatPrintMoney(sale.changeAmount, business)}</span></div>
        <div><span>Payment</span><span>{paymentMethodLabel(sale.paymentMethod)}</span></div>
        <div><span>Status</span><strong>{paymentStatusLabel(sale.paymentStatus)}</strong></div>
      </section>

      <footer className="thermal-center thermal-footer">
        <InvoiceBarcode value={sale.invoiceNumber} maxWidthMm={64} />
        {business.settings?.receiptFooter && <p>{business.settings.receiptFooter}</p>}
        <p className="thermal-thank-you">THANK YOU</p>
      </footer>
    </article>
  );
}