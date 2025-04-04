import PDFDocument from 'pdfkit';
// stream-buffers doesn't have a default export, let's create our own import pattern
import * as sb from 'stream-buffers';
const StreamBuffers = sb;
import { Invoice, Quote, PurchaseOrder, Customer, Project } from '@shared/schema';

// Define extended types with nested related data
interface QuoteWithItems extends Quote {
  items: any[];
}

interface InvoiceWithRelations extends Invoice {
  items: any[];
  customer?: Customer | null;
  project?: Project | null;
}

interface PurchaseOrderWithItems extends PurchaseOrder {
  items: any[];
}

// Configuration constants for PDF generation
const PDF_MARGIN = 50;
const PDF_FONT = 'Helvetica';
const PDF_FONT_SIZE_HEADER = 20;
const PDF_FONT_SIZE_BODY = 12;
const PDF_PAPER_SIZE = 'letter';
const DEFAULT_CURRENCY = 'USD';

// Column widths for the invoice items table
const INVOICE_TABLE_COL_WIDTHS = {
  description: 250,
  quantity: 70,
  unitPrice: 100,
  total: 100,
};

interface InvoicePDFData extends InvoiceWithRelations {
  // You might add additional data specific to PDF generation here if needed
}

export default class PDFService {
  static async generateQuotePDF(quote: Quote & { items: any[] }): Promise<Buffer> {
    // Ensure items is not undefined
    if (!quote.items) {
      console.warn(`Warning: Quote ${quote.quoteNumber} has no items array`);
      quote.items = [];
    }
    
    // Log quote data including items
    console.log(`Preparing quote PDF for ${quote.quoteNumber} with ${quote.items.length} items`);
    
    const htmlContent = await this.renderQuoteTemplate(quote);
    return this.generatePDFFromHTML(htmlContent, `Quote_${quote.quoteNumber}`, quote);
  }

  static async generateInvoicePDF(invoice: InvoiceWithRelations): Promise<Buffer> {
    // Ensure items is not undefined
    if (!invoice.items) {
      console.warn(`Warning: Invoice ${invoice.invoiceNumber} has no items array`);
      invoice.items = [];
    }

    // Log invoice data including items
    console.log(`Preparing invoice PDF for ${invoice.invoiceNumber} with ${invoice.items.length} items`);

    let htmlContent: string;
    try {
      htmlContent = await this.renderInvoiceTemplate(invoice);
    } catch (error) {
      console.error('Error rendering invoice template:', error);
      throw error; // Re-throw to be caught by the caller
    }
    return this.generatePDFFromHTML(htmlContent, `Invoice_${invoice.invoiceNumber}`, invoice);
  }

  static async generatePurchaseOrderPDF(purchaseOrder: PurchaseOrder & { items: any[] }): Promise<Buffer> {
    // Ensure items is not undefined
    if (!purchaseOrder.items) {
      console.warn(`Warning: PO ${purchaseOrder.poNumber} has no items array`);
      purchaseOrder.items = [];
    }
    
    // Log PO data including items
    console.log(`Preparing PO PDF for ${purchaseOrder.poNumber} with ${purchaseOrder.items.length} items`);
    
    const htmlContent = await this.renderPurchaseOrderTemplate(purchaseOrder);
    return this.generatePDFFromHTML(htmlContent, `PO_${purchaseOrder.poNumber}`, purchaseOrder);
  }

  private static async renderInvoiceTemplate(invoice: InvoiceWithRelations): Promise<string> {
    // Enhanced logging for debugging
    console.log("Invoice data in renderInvoiceTemplate:", JSON.stringify({
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customer ? {
        name: invoice.customer.name,
        email: invoice.customer.email
      } : null,
      project: invoice.project ? {
        name: invoice.project.name
      } : null,
      items: invoice.items ? invoice.items.length : 0
    }));
    
    // In a real application, this would involve using a templating engine
    // to generate HTML based on the invoice data.
    // For this example, we'll return a simple string.
    let html = `
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body { font-family: 'Helvetica'; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; }
          .customer-info, .project-info, .invoice-details { margin-bottom: 15px; }
          .underline { text-decoration: underline; }
          .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .items-table th, .items-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          .items-table th { background-color: #f0f0f0; }
          .text-right { text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Company Name</h1>
          <p>123 Business St, City, State, ZIP</p>
          <p>Phone: (123) 456-7890 | Email: info@company.com</p>
        </div>

        <div class="customer-info">
          <h3 class="underline">CUSTOMER</h3>
          <p>${invoice.customer?.name || 'N/A'}</p>
          <p>${invoice.customer?.email || 'N/A'}</p>
          <p>${invoice.customer?.phone || 'N/A'}</p>
          <p>${invoice.customer?.address || 'N/A'}</p>
          <p>${invoice.customer?.city || 'N/A'}, ${invoice.customer?.state || 'N/A'} ${invoice.customer?.zipCode || 'N/A'}</p>
          <p>${invoice.customer?.country || 'N/A'}</p>
        </div>

        <div class="project-info">
          <h3 class="underline">PROJECT</h3>
          <p>Project: ${invoice.project?.name || 'N/A'}</p>
          <p>Description: ${invoice.project?.description || 'N/A'}</p>
        </div>

        <div class="invoice-details">
          <h2 class="underline">INVOICE DETAILS</h2>
          <p>Reference: ${invoice.reference || 'N/A'}</p>
          <p>Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}</p>
          <p>Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}</p>
          <p>Status: ${invoice.status?.toUpperCase() || 'N/A'}</p>
        </div>

        <div>
          <h3 class="underline">Invoice Items</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (invoice.items && invoice.items.length > 0) {
      const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value);
      };

      invoice.items.forEach((item) => {
        html += `
              <tr>
                <td>${item.description || 'No description provided'}</td>
                <td>${item.quantity || '0'}</td>
                <td>${formatCurrency(Number(item.unitPrice) || 0)}</td>
                <td class="text-right">${formatCurrency(Number(item.total) || 0)}</td>
              </tr>
        `;
      });
    } else {
      html += `
              <tr><td colspan="4">No items found.</td></tr>
      `;
    }

    html += `
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;
    
    // Log snippet of the generated HTML for debugging
    console.log("Generated HTML template (first 150 chars):", html.substring(0, 150) + "...");
    console.log("Template includes items table:", html.includes("items-table"));
    console.log("Number of table rows:", (html.match(/<tr>/g) || []).length);
    
    return html;
  }

  private static async renderQuoteTemplate(quote: QuoteWithItems): Promise<string> {
    // Similar to invoice template but for quotes
    let html = `
      <html>
      <head>
        <title>Quote ${quote.quoteNumber}</title>
        <style>
          body { font-family: 'Helvetica'; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; }
          .underline { text-decoration: underline; }
          .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .items-table th, .items-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          .items-table th { background-color: #f0f0f0; }
          .text-right { text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Company Name</h1>
          <p>123 Business St, City, State, ZIP</p>
          <p>Phone: (123) 456-7890 | Email: info@company.com</p>
        </div>

        <div>
          <h2 class="underline">QUOTATION</h2>
          <p>Quote Number: ${quote.quoteNumber}</p>
          <p>Reference: ${quote.reference || 'N/A'}</p>
          <p>Issue Date: ${new Date(quote.issueDate).toLocaleDateString()}</p>
          <p>Expiry Date: ${quote.expiryDate ? new Date(quote.expiryDate).toLocaleDateString() : 'N/A'}</p>
          <p>Status: ${quote.status?.toUpperCase() || 'N/A'}</p>
        </div>

        <div>
          <h3 class="underline">Quote Items</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (quote.items && quote.items.length > 0) {
      const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value);
      };

      quote.items.forEach((item) => {
        html += `
              <tr>
                <td>${item.description || 'No description provided'}</td>
                <td>${item.quantity || '0'}</td>
                <td>${formatCurrency(Number(item.unitPrice) || 0)}</td>
                <td class="text-right">${formatCurrency(Number(item.total) || 0)}</td>
              </tr>
        `;
      });
    } else {
      html += `
              <tr><td colspan="4">No items found.</td></tr>
      `;
    }

    html += `
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;
    
    // Log snippet of the generated HTML for debugging
    console.log("Quote template HTML (first 150 chars):", html.substring(0, 150) + "...");
    console.log("Template includes items table:", html.includes("items-table"));
    console.log("Number of table rows:", (html.match(/<tr>/g) || []).length);
    
    return html;
  }

  private static async renderPurchaseOrderTemplate(po: PurchaseOrderWithItems): Promise<string> {
    // Similar to invoice template but for purchase orders
    let html = `
      <html>
      <head>
        <title>Purchase Order ${po.poNumber}</title>
        <style>
          body { font-family: 'Helvetica'; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; }
          .underline { text-decoration: underline; }
          .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .items-table th, .items-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          .items-table th { background-color: #f0f0f0; }
          .text-right { text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Company Name</h1>
          <p>123 Business St, City, State, ZIP</p>
          <p>Phone: (123) 456-7890 | Email: info@company.com</p>
        </div>

        <div>
          <h2 class="underline">PURCHASE ORDER</h2>
          <p>PO Number: ${po.poNumber}</p>
          <p>Issue Date: ${new Date(po.issueDate).toLocaleDateString()}</p>
          <p>Expected Delivery: ${po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'N/A'}</p>
          <p>Status: ${po.status?.toUpperCase() || 'N/A'}</p>
        </div>

        <div>
          <h3 class="underline">PO Items</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (po.items && po.items.length > 0) {
      const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value);
      };

      po.items.forEach((item) => {
        html += `
              <tr>
                <td>${item.description || 'No description provided'}</td>
                <td>${item.quantity || '0'}</td>
                <td>${formatCurrency(Number(item.unitPrice) || 0)}</td>
                <td class="text-right">${formatCurrency(Number(item.total) || 0)}</td>
              </tr>
        `;
      });
    } else {
      html += `
              <tr><td colspan="4">No items found.</td></tr>
      `;
    }

    html += `
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;
    
    // Log snippet of the generated HTML for debugging
    console.log("Purchase Order template HTML (first 150 chars):", html.substring(0, 150) + "...");
    console.log("Template includes items table:", html.includes("items-table"));
    console.log("Number of table rows:", (html.match(/<tr>/g) || []).length);
    
    return html;
  }

  private static async generatePDFFromHTML(html: string, filename: string, originalDoc?: any): Promise<Buffer> {
    console.log(`Generating PDF for ${filename}`);
    
    try {
      return this.generatePDFWithPDFKit({
        title: filename,
        content: html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(), // Strip HTML for text-only PDF
        originalDoc: originalDoc // Pass the original document for proper rendering
      }, filename);
    } catch (error) {
      console.error(`Error generating PDF for ${filename}:`, error);
      throw error;
    }
  }

  private static generatePDFWithPDFKit(data: any, filename: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`Creating PDF using PDFKit for ${filename}`);
        console.log('PDF Data:', JSON.stringify({
          title: data.title,
          has_original_doc: !!data.originalDoc,
          original_doc_type: data.originalDoc ? typeof data.originalDoc : 'none',
          has_items: data.originalDoc && data.originalDoc.items ? true : false,
          items_count: data.originalDoc && data.originalDoc.items ? data.originalDoc.items.length : 0
        }));

        // Create a PDF document with better settings for text rendering
        const doc = new PDFDocument({
          margin: PDF_MARGIN,
          bufferPages: true,
          font: PDF_FONT,
          size: PDF_PAPER_SIZE,
          info: {
            Title: filename,
            Author: 'System Generated',
            Subject: 'Business Document',
          },
        });

        // Create a writable stream buffer
        const writableStreamBuffer = new StreamBuffers.WritableStreamBuffer({
          initialSize: (100 * 1024),
          incrementAmount: (10 * 1024),
        });

        // Pipe the document to the buffer
        doc.pipe(writableStreamBuffer);

        // Format currency
        const formatCurrency = (value: number) => {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: DEFAULT_CURRENCY,
          }).format(value);
        };

        // Add company header
        doc.fontSize(PDF_FONT_SIZE_HEADER).text('Company Name', { align: 'center' });
        doc.moveDown();
        doc.fontSize(PDF_FONT_SIZE_BODY).text('123 Business St, City, State, ZIP', { align: 'center' });
        doc.text('Phone: (123) 456-7890 | Email: info@company.com', { align: 'center' });
        doc.moveDown();

        // Add document title
        doc.fontSize(16).text(data.title || filename, { align: 'center' });
        doc.moveDown();
        
        // Add basic content details
        doc.fontSize(12);

        // Invoice-specific PDF content generation
        if (filename.includes('Invoice') && data.originalDoc) {
          // It's an invoice
          const invoice = data.originalDoc;

          console.log(`Invoice PDF data:`, JSON.stringify(invoice));

          // Add customer information if available
          if (invoice.customer) {
            doc.text('CUSTOMER', { align: 'left', underline: true });
            doc.moveDown(0.5);
            doc.text(`${invoice.customer.name}`);
            doc.text(`${invoice.customer.email}`);
            doc.text(`${invoice.customer.phone}`);
            doc.text(`${invoice.customer.address}`);
            doc.text(`${invoice.customer.city}, ${invoice.customer.state} ${invoice.customer.zipCode}`);
            doc.text(`${invoice.customer.country}`);
            doc.moveDown();
          }

          // Add project information if available
          if (invoice.project) {
            doc.text('PROJECT', { align: 'left', underline: true });
            doc.moveDown(0.5);
            doc.text(`Project: ${invoice.project.name}`);
            doc.text(`Description: ${invoice.project.description}`);
            doc.moveDown();
          }

          doc.text('INVOICE DETAILS', { align: 'center', underline: true });
          doc.moveDown();

          // Invoice reference and dates
          doc.text(`Reference: ${invoice.reference || 'N/A'}`);
          doc.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`);
          doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`);
          doc.text(`Status: ${invoice.status?.toUpperCase() || 'N/A'}`);
          doc.moveDown();

          // Line items table
          doc.text('Invoice Items', { underline: true });
          doc.moveDown();

          // Table headers for items
          const tableTop = doc.y;
          const colWidths = INVOICE_TABLE_COL_WIDTHS;
          let currentY = doc.y;

          // Draw table headers
          doc.font('Helvetica-Bold');
          doc.text('Description', doc.x + 5, currentY);
          doc.text('Quantity', doc.x + colWidths.description + 5, currentY, { align: 'center' });
          doc.text('Unit Price', doc.x + colWidths.description + colWidths.quantity + 5, currentY);
          doc.text('Total', doc.x + colWidths.description + colWidths.quantity + colWidths.unitPrice + 5, currentY);
          doc.font('Helvetica');
          currentY += 15;
          doc.moveTo(doc.x, currentY - 5).lineTo(doc.x + 520, currentY - 5).stroke();

          // Process each item
          if (invoice.items && invoice.items.length > 0) {
            invoice.items.forEach((item: any) => {
              currentY += 5; // Add some spacing between rows
              const startY = currentY;

              // Extract values with defaults to prevent errors
              const description = String(item.description || 'No description provided');
              const quantity = String(item.quantity || '0');
              const unitPrice = Number(item.unitPrice) || 0;
              const totalPrice = Number(item.total) || 0;

              // Draw description text (multiline supported)
              const descriptionOptions = {
                width: colWidths.description - 10,
                align: 'left' as const,
              };

              // Draw description starting at current position
              doc.text(description, doc.x + 5, currentY, descriptionOptions);

              // Calculate y after description to align other columns.
              const descriptionEndY = doc.y;
              currentY = Math.max(startY, descriptionEndY);

              // Draw the other columns aligned with top of description
              doc.text(quantity, doc.x + colWidths.description + 5, startY, { align: 'center' });
              doc.text(formatCurrency(unitPrice), doc.x + colWidths.description + colWidths.quantity + 5, startY);
              doc.text(formatCurrency(totalPrice), doc.x + colWidths.description + colWidths.quantity + colWidths.unitPrice + 5, startY);

              currentY += 10; // Add more spacing after each item
              doc.moveTo(doc.x, currentY - 5).lineTo(doc.x + 520, currentY - 5).stroke();
            });
          } else {
            doc.text('No items in this invoice', doc.x, currentY, { width: colWidths.description + colWidths.quantity + colWidths.unitPrice + colWidths.total });
            currentY = doc.y + 15;
          }

          // Add a divider
          doc.moveTo(doc.x, currentY).lineTo(doc.x + 520, currentY).stroke();
          doc.y = currentY;
          doc.moveDown();

          // Invoice totals
          const totalsX = doc.x + 350;
          doc.text(`Subtotal:`, totalsX);
          doc.text(formatCurrency(invoice.subtotal || 0), totalsX + 100);
          doc.moveDown(0.5);

          doc.text(`Tax:`, totalsX);
          doc.text(formatCurrency(invoice.tax || 0), totalsX + 100);
          doc.moveDown(0.5);

          if (invoice.discount) {
            doc.text(`Discount:`, totalsX);
            doc.text(formatCurrency(invoice.discount || 0), totalsX + 100);
            doc.moveDown(0.5);
          }

          // Use font directly for bold text
          doc.font('Helvetica-Bold');
          doc.text(`Total:`, totalsX);
          doc.text(formatCurrency(invoice.total || 0), totalsX + 100);
          doc.font('Helvetica');
        } else if (filename.includes('Quote') && data.originalDoc) {
          // It's a quote
          const quote = data.originalDoc;
          
          // Quote reference and dates
          doc.text(`Reference: ${quote.reference || 'N/A'}`);
          doc.text(`Issue Date: ${new Date(quote.issueDate).toLocaleDateString()}`);
          if (quote.expiryDate) {
            doc.text(`Expiry Date: ${new Date(quote.expiryDate).toLocaleDateString()}`);
          }
          doc.text(`Status: ${quote.status?.toUpperCase() || 'N/A'}`);
          doc.moveDown();
          
          // Line items table
          doc.text('Quote Items', { underline: true });
          doc.moveDown();
          
          // Create a simple table for items
          const tableTop = doc.y;
          const colWidths = INVOICE_TABLE_COL_WIDTHS;
          let currentY = doc.y;
          
          // Draw table headers
          doc.font('Helvetica-Bold');
          doc.text('Description', doc.x + 5, currentY);
          doc.text('Quantity', doc.x + colWidths.description + 5, currentY, { align: 'center' });
          doc.text('Unit Price', doc.x + colWidths.description + colWidths.quantity + 5, currentY);
          doc.text('Total', doc.x + colWidths.description + colWidths.quantity + colWidths.unitPrice + 5, currentY);
          doc.font('Helvetica');
          currentY += 15;
          doc.moveTo(doc.x, currentY - 5).lineTo(doc.x + 520, currentY - 5).stroke();
          
          // Process each item
          if (quote.items && quote.items.length > 0) {
            quote.items.forEach((item: any) => {
              currentY += 5; // Add some spacing between rows
              const startY = currentY;
              
              // Extract values with defaults to prevent errors
              const description = String(item.description || 'No description provided');
              const quantity = String(item.quantity || '0');
              const unitPrice = Number(item.unitPrice) || 0;
              const totalPrice = Number(item.total) || 0;
              
              // Draw description text (multiline supported)
              const descriptionOptions = {
                width: colWidths.description - 10,
                align: 'left' as const,
              };
              
              // Draw description starting at current position
              doc.text(description, doc.x + 5, currentY, descriptionOptions);
              
              // Calculate y after description to align other columns
              const descriptionEndY = doc.y;
              currentY = Math.max(startY, descriptionEndY);
              
              // Draw the other columns aligned with top of description
              doc.text(quantity, doc.x + colWidths.description + 5, startY, { align: 'center' });
              doc.text(formatCurrency(unitPrice), doc.x + colWidths.description + colWidths.quantity + 5, startY);
              doc.text(formatCurrency(totalPrice), doc.x + colWidths.description + colWidths.quantity + colWidths.unitPrice + 5, startY);
              
              currentY += 10; // Add more spacing after each item
              doc.moveTo(doc.x, currentY - 5).lineTo(doc.x + 520, currentY - 5).stroke();
            });
          } else {
            doc.text('No items in this quote', doc.x, currentY, { width: colWidths.description + colWidths.quantity + colWidths.unitPrice + colWidths.total });
            currentY = doc.y + 15;
          }
          
          // Add a divider
          doc.moveTo(doc.x, currentY).lineTo(doc.x + 520, currentY).stroke();
          doc.y = currentY;
          doc.moveDown();
          
          // Quote totals
          const totalsX = doc.x + 350;
          doc.text(`Subtotal:`, totalsX);
          doc.text(formatCurrency(quote.subtotal || 0), totalsX + 100);
          doc.moveDown(0.5);
          
          doc.text(`Tax:`, totalsX);
          doc.text(formatCurrency(quote.tax || 0), totalsX + 100);
          doc.moveDown(0.5);
          
          if (quote.discount) {
            doc.text(`Discount:`, totalsX);
            doc.text(formatCurrency(quote.discount || 0), totalsX + 100);
            doc.moveDown(0.5);
          }
          
          // Use font directly for bold text
          doc.font('Helvetica-Bold');
          doc.text(`Total:`, totalsX);
          doc.text(formatCurrency(quote.total || 0), totalsX + 100);
          doc.font('Helvetica');
        } else if (filename.includes('PO') && data.originalDoc) {
          // It's a purchase order
          const po = data.originalDoc;
          
          // Purchase order details
          doc.text(`PO Number: ${po.poNumber || 'N/A'}`);
          doc.text(`Issue Date: ${new Date(po.issueDate).toLocaleDateString()}`);
          doc.text(`Expected Delivery: ${po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'N/A'}`);
          doc.text(`Status: ${po.status?.toUpperCase() || 'N/A'}`);
          doc.moveDown();
          
          // Line items table
          doc.text('Purchase Order Items', { underline: true });
          doc.moveDown();
          
          // Create a simple table for items
          const tableTop = doc.y;
          const colWidths = INVOICE_TABLE_COL_WIDTHS;
          let currentY = doc.y;
          
          // Draw table headers
          doc.font('Helvetica-Bold');
          doc.text('Description', doc.x + 5, currentY);
          doc.text('Quantity', doc.x + colWidths.description + 5, currentY, { align: 'center' });
          doc.text('Unit Price', doc.x + colWidths.description + colWidths.quantity + 5, currentY);
          doc.text('Total', doc.x + colWidths.description + colWidths.quantity + colWidths.unitPrice + 5, currentY);
          doc.font('Helvetica');
          currentY += 15;
          doc.moveTo(doc.x, currentY - 5).lineTo(doc.x + 520, currentY - 5).stroke();
          
          // Process each item
          if (po.items && po.items.length > 0) {
            po.items.forEach((item: any) => {
              currentY += 5; // Add some spacing between rows
              const startY = currentY;
              
              // Extract values with defaults to prevent errors
              const description = String(item.description || 'No description provided');
              const quantity = String(item.quantity || '0');
              const unitPrice = Number(item.unitPrice) || 0;
              const totalPrice = Number(item.total) || 0;
              
              // Draw description text (multiline supported)
              const descriptionOptions = {
                width: colWidths.description - 10,
                align: 'left' as const,
              };
              
              // Draw description starting at current position
              doc.text(description, doc.x + 5, currentY, descriptionOptions);
              
              // Calculate y after description to align other columns
              const descriptionEndY = doc.y;
              currentY = Math.max(startY, descriptionEndY);
              
              // Draw the other columns aligned with top of description
              doc.text(quantity, doc.x + colWidths.description + 5, startY, { align: 'center' });
              doc.text(formatCurrency(unitPrice), doc.x + colWidths.description + colWidths.quantity + 5, startY);
              doc.text(formatCurrency(totalPrice), doc.x + colWidths.description + colWidths.quantity + colWidths.unitPrice + 5, startY);
              
              currentY += 10; // Add more spacing after each item
              doc.moveTo(doc.x, currentY - 5).lineTo(doc.x + 520, currentY - 5).stroke();
            });
          } else {
            doc.text('No items in this purchase order', doc.x, currentY, { width: colWidths.description + colWidths.quantity + colWidths.unitPrice + colWidths.total });
            currentY = doc.y + 15;
          }
          
          // Add a divider
          doc.moveTo(doc.x, currentY).lineTo(doc.x + 520, currentY).stroke();
          doc.y = currentY;
          doc.moveDown();
          
          // PO totals
          const totalsX = doc.x + 350;
          doc.text(`Subtotal:`, totalsX);
          doc.text(formatCurrency(po.subtotal || 0), totalsX + 100);
          doc.moveDown(0.5);
          
          doc.text(`Tax:`, totalsX);
          doc.text(formatCurrency(po.tax || 0), totalsX + 100);
          doc.moveDown(0.5);
          
          // Use font directly for bold text
          doc.font('Helvetica-Bold');
          doc.text(`Total:`, totalsX);
          doc.text(formatCurrency(po.total || 0), totalsX + 100);
          doc.font('Helvetica');
        }

        // Finalize the PDF
        doc.end();

        // Resolve the promise with the PDF buffer when the stream is finished
        writableStreamBuffer.on('finish', () => {
          try {
            // Extract the PDF content as a Buffer
            const pdfBuffer = writableStreamBuffer.getContents();
            
            if (pdfBuffer && pdfBuffer.length > 0) {
              console.log(`PDF generated successfully with PDFKit for ${filename}, size: ${pdfBuffer.length} bytes`);
              
              // Calculate rough page count based on PDF size
              const estimatedPageCount = Math.ceil(pdfBuffer.length / 40000); // Rough estimate
              console.log(`Estimated PDF page count: ${estimatedPageCount}`);
              
              // Check PDF header to verify it's a valid PDF
              const pdfHeader = pdfBuffer.slice(0, 8).toString('utf8');
              const isPdfValid = pdfHeader.startsWith('%PDF-');
              console.log(`PDF validity check: ${isPdfValid ? 'VALID' : 'INVALID'}`);
              
              if (isPdfValid) {
                resolve(pdfBuffer as Buffer);
              } else {
                const error = new Error(`Generated PDF appears to be invalid for ${filename}: Header check failed.`);
                console.error(error);
                reject(error);
              }
            } else {
              const error = new Error(`Failed to generate PDF for ${filename}: No content available or zero size.`);
              console.error(error);
              reject(error);
            }
          } catch (bufferError) {
            console.error(`Error processing buffer content for ${filename}:`, bufferError);
            reject(bufferError);
          }
        });
        
        // Handle errors
        writableStreamBuffer.on('error', (err: Error) => {
          console.error(`Error in PDF stream for ${filename}:`, err);
          reject(err);
        });
      } catch (error) {
        console.error(`Error generating PDF with PDFKit for ${filename}:`, error);
        reject(error);
      }
    });
  }
}