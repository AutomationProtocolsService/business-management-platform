import { User, Customer, Quote, QuoteItem, Invoice, InvoiceItem } from "@shared/schema";
import { storage } from "../storage";

// PDF generation utility
// In a production environment, this would use a library like PDFKit
export async function generatePdf(
  type: 'quote' | 'invoice',
  data: {
    quote?: Quote;
    invoice?: Invoice;
    items: QuoteItem[] | InvoiceItem[];
    customer?: Customer | null;
  }
): Promise<Buffer> {
  // This is a placeholder implementation
  // In a real app, we would generate a proper PDF using PDFKit
  
  // Get company settings for currency symbol
  const companySettings = await storage.getCompanySettings();
  const currencySymbol = companySettings?.currencySymbol || "$";
  
  // For demo purposes, we'll just generate a simple text representation
  let content = '';
  
  if (type === 'quote') {
    if (!data.quote) throw new Error('Quote data is required');
    
    content = generateQuotePdfContent(data.quote, data.items as QuoteItem[], data.customer, currencySymbol);
  } else {
    if (!data.invoice) throw new Error('Invoice data is required');
    
    content = generateInvoicePdfContent(data.invoice, data.items as InvoiceItem[], data.customer, currencySymbol);
  }
  
  // Convert the text content to a buffer
  return Buffer.from(content, 'utf-8');
}

function generateQuotePdfContent(
  quote: Quote,
  items: QuoteItem[],
  customer: Customer | null | undefined,
  currencySymbol: string = "$"
): string {
  let content = `QUOTE #${quote.quoteNumber}\n\n`;
  content += `Date: ${formatDate(quote.issueDate)}\n`;
  
  if (quote.expiryDate) {
    content += `Expiry Date: ${formatDate(quote.expiryDate)}\n`;
  }
  
  content += '\n';
  
  if (customer) {
    content += `CUSTOMER\n`;
    content += `${customer.name}\n`;
    if (customer.address) content += `${customer.address}\n`;
    if (customer.city && customer.state && customer.zipCode) {
      content += `${customer.city}, ${customer.state} ${customer.zipCode}\n`;
    }
    if (customer.email) content += `Email: ${customer.email}\n`;
    if (customer.phone) content += `Phone: ${customer.phone}\n`;
    content += '\n';
  }
  
  content += `ITEMS\n`;
  content += `Description\tQty\tUnit Price\tTotal\n`;
  content += `---------------------------------------------------\n`;
  
  for (const item of items) {
    content += `${item.description}\t${item.quantity}\t${currencySymbol}${item.unitPrice.toFixed(2)}\t${currencySymbol}${item.total.toFixed(2)}\n`;
  }
  
  content += `---------------------------------------------------\n`;
  content += `Subtotal:\t\t\t${currencySymbol}${quote.subtotal.toFixed(2)}\n`;
  
  if (quote.discount) {
    content += `Discount:\t\t\t${currencySymbol}${quote.discount.toFixed(2)}\n`;
  }
  
  if (quote.tax) {
    content += `Tax:\t\t\t${currencySymbol}${quote.tax.toFixed(2)}\n`;
  }
  
  content += `Total:\t\t\t${currencySymbol}${quote.total.toFixed(2)}\n\n`;
  
  if (quote.notes) {
    content += `NOTES\n${quote.notes}\n\n`;
  }
  
  if (quote.terms) {
    content += `TERMS AND CONDITIONS\n${quote.terms}\n\n`;
  }
  
  content += `Thank you for your business!`;
  
  return content;
}

function generateInvoicePdfContent(
  invoice: Invoice,
  items: InvoiceItem[],
  customer: Customer | null | undefined,
  currencySymbol: string = "$"
): string {
  let content = `INVOICE #${invoice.invoiceNumber}\n\n`;
  content += `Date: ${formatDate(invoice.issueDate)}\n`;
  content += `Due Date: ${formatDate(invoice.dueDate)}\n`;
  content += '\n';
  
  if (customer) {
    content += `BILL TO\n`;
    content += `${customer.name}\n`;
    if (customer.address) content += `${customer.address}\n`;
    if (customer.city && customer.state && customer.zipCode) {
      content += `${customer.city}, ${customer.state} ${customer.zipCode}\n`;
    }
    if (customer.email) content += `Email: ${customer.email}\n`;
    if (customer.phone) content += `Phone: ${customer.phone}\n`;
    content += '\n';
  }
  
  content += `ITEMS\n`;
  content += `Description\tQty\tUnit Price\tTotal\n`;
  content += `---------------------------------------------------\n`;
  
  for (const item of items) {
    content += `${item.description}\t${item.quantity}\t${currencySymbol}${item.unitPrice.toFixed(2)}\t${currencySymbol}${item.total.toFixed(2)}\n`;
  }
  
  content += `---------------------------------------------------\n`;
  content += `Subtotal:\t\t\t${currencySymbol}${invoice.subtotal.toFixed(2)}\n`;
  
  if (invoice.discount) {
    content += `Discount:\t\t\t${currencySymbol}${invoice.discount.toFixed(2)}\n`;
  }
  
  if (invoice.tax) {
    content += `Tax:\t\t\t${currencySymbol}${invoice.tax.toFixed(2)}\n`;
  }
  
  content += `Total:\t\t\t${currencySymbol}${invoice.total.toFixed(2)}\n\n`;
  
  if (invoice.notes) {
    content += `NOTES\n${invoice.notes}\n\n`;
  }
  
  if (invoice.terms) {
    content += `TERMS AND CONDITIONS\n${invoice.terms}\n\n`;
  }
  
  content += `Thank you for your business!`;
  
  return content;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
