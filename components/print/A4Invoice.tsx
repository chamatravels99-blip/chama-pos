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

export function A4Invoice({
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
    <article className="invoice-paper print-invoice">
      <header className="invoice-header">
        <div className="invoice-company">
          {business.logoUrl && <img className="invoice-logo" src={business.logoUrl} alt={`${business.name} logo`} />}
          <h1>{business.name}</h1>
          <p className="invoice-branch-name">{branch.name}</p>
          {address.map((line) => <p key={line}>{line}</p>)}
          {contactNumber && <p>{contactNumber}</p>}
        </div>
        <div className="invoice-title">
          <h2>INVOICE</h2>
          <dl>
            <div><dt>Invoice No</dt><dd>{sale.invoiceNumber}</dd></div>
            <div><dt>Date</dt><dd>{formatPrintDate(sale.createdAt)}</dd></div>
            <div><dt>Cashier</dt><dd>{sale.cashierName}</dd></div>
            <div><dt>Payment</dt><dd>{paymentMethodLabel(sale.paymentMethod)}</dd></div>
            <div><dt>Status</dt><dd>{paymentStatusLabel(sale.paymentStatus)}</dd></div>
          </dl>
          <InvoiceBarcode value={sale.invoiceNumber} maxWidthMm={64} />
        </div>
      </header>

      <section className="invoice-parties">
        <div className="invoice-party">
          <h3>Bill To</h3>
          <p className="invoice-party-name">{sale.customer?.name || sale.customerName || "Walk-in Customer"}</p>
          {sale.customer?.phone && <p>{sale.customer.phone}</p>}
          {sale.customer?.email && <p>{sale.customer.email}</p>}
          {sale.customer?.address && <p>{sale.customer.address}</p>}
        </div>
        <div className="invoice-details">
          <h3>Invoice Details</h3>
          <p><span>Invoice No</span>{sale.invoiceNumber}</p>
          <p><span>Date</span>{formatPrintDate(sale.createdAt)}</p>
          <p><span>Cashier</span>{sale.cashierName}</p>
          <p><span>Payment</span>{paymentMethodLabel(sale.paymentMethod)}</p>
          <p><span>Status</span>{paymentStatusLabel(sale.paymentStatus)}</p>
        </div>
      </section>

      <table className="invoice-table">
        <thead>
          <tr><th>#</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Discount</th><th>Tax</th><th>Total</th></tr>
        </thead>
        <tbody>
          {sale.items.map((item, index) => (
            <tr key={`${item.sku || item.name}-${index}`}>
              <td>{index + 1}</td>
              <td>{item.name}</td>
              <td>{item.quantity}</td>
              <td>{formatPrintMoney(item.unitPrice, business)}</td>
              <td>{formatPrintMoney(item.discountAmount, business)}</td>
              <td>{formatPrintMoney(item.taxAmount, business)}</td>
              <td>{formatPrintMoney(item.total, business)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="invoice-bottom">
        <div className="invoice-notes">
          {sale.notes && <><h3>Notes / Terms</h3><p>{sale.notes}</p></>}
        </div>
        <div className="invoice-totals">
          <p><span>Subtotal</span><strong>{formatPrintMoney(sale.subtotal, business)}</strong></p>
          <p><span>Discount</span><strong>-{formatPrintMoney(sale.discountTotal, business)}</strong></p>
          <p><span>Tax</span><strong>{formatPrintMoney(sale.taxTotal, business)}</strong></p>
          <p className="invoice-grand-total"><span>Grand Total</span><strong>{formatPrintMoney(sale.grandTotal, business)}</strong></p>
          <p><span>Paid</span><strong>{formatPrintMoney(sale.paidAmount, business)}</strong></p>
          <p><span>Change</span><strong>{formatPrintMoney(sale.changeAmount, business)}</strong></p>
          <p><span>Payment Method</span><strong>{paymentMethodLabel(sale.paymentMethod)}</strong></p>
          <p><span>Payment Status</span><strong>{paymentStatusLabel(sale.paymentStatus)}</strong></p>
        </div>
      </section>

      <footer className="invoice-footer">
        <div className="invoice-signatures">
          <div><span>Customer Signature</span></div>
          <div><span>Authorized Signature</span></div>
        </div>
        <p className="invoice-thank-you">THANK YOU FOR YOUR BUSINESS</p>
        {business.settings?.receiptFooter && <p className="invoice-receipt-footer">{business.settings.receiptFooter}</p>}
      </footer>
    </article>
  );
}