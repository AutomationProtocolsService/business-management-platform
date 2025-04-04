import puppeteer from 'puppeteer';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import StreamBuffers from 'stream-buffers';
import { Quote, Invoice, PurchaseOrder, Customer, Project, insertCustomerSchema } from '@shared/schema';

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

/**
 * Service for generating PDF documents from various entity types
 */
export default class PDFService {
  /**
   * Generate a PDF file for a quote
   * @param quote The quote data including items
   * @returns Buffer containing the PDF file
   */
  static async generateQuotePDF(quote: Quote & { items: any[] }): Promise<Buffer> {
    const htmlContent = await this.renderQuoteTemplate(quote);
    return this.generatePDFFromHTML(htmlContent, `Quote_${quote.quoteNumber}`, quote);
  }

  /**
   * Generate a PDF file for an invoice
   * @param invoice The invoice data including items, customer, and project
   * @returns Buffer containing the PDF file
   */
  static async generateInvoicePDF(invoice: InvoiceWithRelations): Promise<Buffer> {
    const htmlContent = await this.renderInvoiceTemplate(invoice);
    return this.generatePDFFromHTML(htmlContent, `Invoice_${invoice.invoiceNumber}`, invoice);
  }

  /**
   * Generate a PDF file for a purchase order
   * @param purchaseOrder The PO data including items
   * @returns Buffer containing the PDF file
   */
  static async generatePurchaseOrderPDF(purchaseOrder: PurchaseOrder & { items: any[] }): Promise<Buffer> {
    const htmlContent = await this.renderPurchaseOrderTemplate(purchaseOrder);
    return this.generatePDFFromHTML(htmlContent, `PO_${purchaseOrder.poNumber}`, purchaseOrder);
  }

  /**
   * Generate a PDF from HTML content using Puppeteer
   * @param htmlContent The HTML content to render as PDF
   * @param filename The filename without extension
   * @returns Buffer containing the PDF file
   */
  private static async generatePDFFromHTML(htmlContent: string, filename: string, originalDoc?: any): Promise<Buffer> {
    console.log(`Generating PDF for ${filename}`);
    
    try {
      // Use the PDFKit method instead of Puppeteer since Chrome isn't available
      console.log(`Switching to PDFKit for ${filename} generation`);
      return this.generatePDFWithPDFKit({
        title: filename,
        content: htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(), // Strip HTML for text-only PDF
        originalDoc: originalDoc // Pass the original document for proper rendering
      }, filename);
    } catch (error) {
      console.error(`Error generating PDF for ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Alternative PDF generation using PDFKit
   * @param data The data to include in the PDF
   * @param filename The filename without extension
   * @returns Buffer containing the PDF file
   */
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
        
        // Ensure the originalDoc is accessible
        const originalDoc = data.originalDoc;
        if (!originalDoc) {
          console.warn(`Warning: No original document provided for ${filename}`);
        }
        
        // Create a PDF document with better settings for text rendering
        const doc = new PDFDocument({ 
          margin: 50,
          bufferPages: true,
          font: 'Helvetica',
          size: 'letter',
          info: {
            Title: filename,
            Author: 'System Generated',
            Subject: 'Business Document' 
          }
        });
        
        // Create a writable stream buffer
        const writableStreamBuffer = new StreamBuffers.WritableStreamBuffer({
          initialSize: (100 * 1024),
          incrementAmount: (10 * 1024)
        });
        
        // Pipe the document to the buffer
        doc.pipe(writableStreamBuffer);

        // Format currency
        const formatCurrency = (value: number) => {
          return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD'
          }).format(value);
        };

        // Add company header (this would be fetched from company settings in a real app)
        doc.fontSize(20).text('Company Name', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text('123 Business St, City, State, ZIP', { align: 'center' });
        doc.text('Phone: (123) 456-7890 | Email: info@company.com', { align: 'center' });
        doc.moveDown();
        
        // Add document title
        doc.fontSize(16).text(data.title || filename, { align: 'center' });
        doc.moveDown();
        
        // Add basic content details
        doc.fontSize(12);
        
        // Format the content better by extracting key information
        if (filename.includes('Quote') && originalDoc) {
          // It's a quote
          doc.text('QUOTE DETAILS', { align: 'center', underline: true });
          doc.moveDown();
          
          // Extract quote info
          const quote = originalDoc;
          
          // Quote reference and dates
          doc.text(`Reference: ${quote.reference || 'N/A'}`);
          doc.text(`Issue Date: ${new Date(quote.issueDate).toLocaleDateString()}`);
          if (quote.expiryDate) {
            doc.text(`Expiry Date: ${new Date(quote.expiryDate).toLocaleDateString()}`);
          }
          doc.text(`Status: ${quote.status.toUpperCase()}`);
          doc.moveDown();
          
          // Line items table
          doc.text('Quote Items', { underline: true });
          doc.moveDown();
          
          // Create a simple table for items
          const tableTop = doc.y;
          const colWidths = {
            description: 250,
            quantity: 70,
            unitPrice: 100,
            total: 100
          };
          
          // Table headers
          doc.text('Description', doc.x, tableTop);
          doc.text('Quantity', doc.x + colWidths.description, tableTop);
          doc.text('Unit Price', doc.x + colWidths.description + colWidths.quantity, tableTop);
          doc.text('Total', doc.x + colWidths.description + colWidths.quantity + colWidths.unitPrice, tableTop);
          
          doc.moveDown();
          let yPos = doc.y;
          
          // Check if items exist
          if (quote.items && quote.items.length > 0) {
            // Debug log the items
            console.log(`Quote items for PDF (${quote.items.length}):`, JSON.stringify(quote.items));
            
            // Try a completely different approach for rendering items
            let currentY = yPos;
            
            // Draw table header borders
            doc.moveTo(doc.x, currentY - 15).lineTo(doc.x + 520, currentY - 15).stroke();
            
            // Process each item
            quote.items.forEach((item, index) => {
              console.log(`Rendering quote item ${index} at position ${currentY}:`, JSON.stringify(item));
              
              // Extract values with defaults to prevent errors
              const description = String(item.description || 'No description provided');
              const quantity = String(item.quantity || '0');
              const unitPrice = Number(item.unitPrice) || 0;
              const totalPrice = Number(item.total) || 0;
              
              console.log(`Processing item description: "${description.substring(0, 50)}..." [${description.length} chars]`);
              
              // Draw description text (multiline supported)
              const descriptionOptions = { 
                width: colWidths.description - 10,
                align: 'left' as const
              };
              
              // Draw description starting at current position
              const descriptionStart = currentY;
              doc.text(description, doc.x + 5, currentY, descriptionOptions);
              
              // Store where description ended
              const descriptionEnd = doc.y;
              
              // Reset position to where this row started
              doc.y = currentY;
              
              // Draw the other columns aligned with top of description
              doc.text(quantity, doc.x + colWidths.description + 5, currentY, { align: 'center' });
              doc.text(formatCurrency(unitPrice), doc.x + colWidths.description + colWidths.quantity + 5, currentY);
              doc.text(formatCurrency(totalPrice), doc.x + colWidths.description + colWidths.quantity + colWidths.unitPrice + 5, currentY);
              
              // Move to position after description (which may be multiline)
              currentY = descriptionEnd + 10;
              doc.y = currentY;
              
              // Draw horizontal line separator
              doc.moveTo(doc.x, currentY - 5).lineTo(doc.x + 520, currentY - 5).stroke();
            });
          } else {
            doc.text('No items in this quote', doc.x, yPos, { width: colWidths.description + colWidths.quantity + colWidths.unitPrice + colWidths.total });
            yPos = doc.y + 15;
            doc.y = yPos;
          }
          
          // Add a divider
          doc.moveTo(doc.x, doc.y).lineTo(doc.x + 520, doc.y).stroke();
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
          
          doc.text(`Total:`, totalsX, null, { bold: true });
          doc.text(formatCurrency(quote.total || 0), totalsX + 100, null, { bold: true });
          
        } else if (filename.includes('Invoice') && originalDoc) {
          // It's an invoice - similar structure to quote
          const invoice = originalDoc;
          
          console.log(`Invoice PDF data:`, JSON.stringify(invoice));
          
          // Add customer information if available
          if (invoice.customer) {
            doc.text('CUSTOMER', { align: 'left', underline: true });
            doc.moveDown(0.5);
            doc.text(`${invoice.customer.name}`);
            doc.text(`${invoice.customer.email}`);
            doc.text(`${invoice.customer.phone}`);
            doc.text(`${invoice.customer.address}`);
            doc.text(`${invoice.customer.city}, ${invoice.customer.state} ${invoice.customer.postalCode}`);
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
          doc.text(`Status: ${invoice.status.toUpperCase()}`);
          doc.moveDown();
          
          // Line items table
          doc.text('Invoice Items', { underline: true });
          doc.moveDown();
          
          // Create a simple table for items
          const tableTop = doc.y;
          const colWidths = {
            description: 250,
            quantity: 70,
            unitPrice: 100,
            total: 100
          };
          
          // Table headers
          doc.text('Description', doc.x, tableTop);
          doc.text('Quantity', doc.x + colWidths.description, tableTop);
          doc.text('Unit Price', doc.x + colWidths.description + colWidths.quantity, tableTop);
          doc.text('Total', doc.x + colWidths.description + colWidths.quantity + colWidths.unitPrice, tableTop);
          
          doc.moveDown();
          let yPos = doc.y;
          
          // Check if items exist
          if (invoice.items && invoice.items.length > 0) {
            // Debug log the items
            console.log(`Invoice items for PDF (${invoice.items.length}):`, JSON.stringify(invoice.items));
            
            // Try a completely different approach for rendering items
            let currentY = yPos;
            
            // Draw table header borders
            doc.moveTo(doc.x, currentY - 15).lineTo(doc.x + 520, currentY - 15).stroke();
            
            // Process each item
            invoice.items.forEach((item, index) => {
              console.log(`Rendering invoice item ${index} at position ${currentY}:`, JSON.stringify(item));
              
              // Extract values with defaults to prevent errors
              const description = String(item.description || 'No description provided');
              const quantity = String(item.quantity || '0');
              const unitPrice = Number(item.unitPrice) || 0;
              const totalPrice = Number(item.total) || 0;
              
              console.log(`Processing item description: "${description.substring(0, 50)}..." [${description.length} chars]`);
              
              // Draw description text (multiline supported)
              const descriptionOptions = { 
                width: colWidths.description - 10,
                align: 'left' as const
              };
              
              // Draw description starting at current position
              const descriptionStart = currentY;
              doc.text(description, doc.x + 5, currentY, descriptionOptions);
              
              // Store where description ended
              const descriptionEnd = doc.y;
              
              // Reset position to where this row started
              doc.y = currentY;
              
              // Draw the other columns aligned with top of description
              doc.text(quantity, doc.x + colWidths.description + 5, currentY, { align: 'center' });
              doc.text(formatCurrency(unitPrice), doc.x + colWidths.description + colWidths.quantity + 5, currentY);
              doc.text(formatCurrency(totalPrice), doc.x + colWidths.description + colWidths.quantity + colWidths.unitPrice + 5, currentY);
              
              // Move to position after description (which may be multiline)
              currentY = descriptionEnd + 10;
              doc.y = currentY;
              
              // Draw horizontal line separator
              doc.moveTo(doc.x, currentY - 5).lineTo(doc.x + 520, currentY - 5).stroke();
            });
          } else {
            doc.text('No items in this invoice', doc.x, yPos, { width: colWidths.description + colWidths.quantity + colWidths.unitPrice + colWidths.total });
            yPos = doc.y + 15;
            doc.y = yPos;
          }
          
          // Add a divider
          doc.moveTo(doc.x, doc.y).lineTo(doc.x + 520, doc.y).stroke();
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
          
          doc.text(`Total:`, totalsX, null, { bold: true });
          doc.text(formatCurrency(invoice.total || 0), totalsX + 100, null, { bold: true });
          
        } else if (filename.includes('PO') && originalDoc) {
          // It's a purchase order - similar structure to quote/invoice
          const po = originalDoc;
          
          console.log(`Purchase Order PDF data:`, JSON.stringify(po));
          
          doc.text('PURCHASE ORDER DETAILS', { align: 'center', underline: true });
          doc.moveDown();
          
          // PO reference and dates
          doc.text(`PO Number: ${po.poNumber || 'N/A'}`);
          doc.text(`Issue Date: ${new Date(po.issueDate).toLocaleDateString()}`);
          doc.text(`Expected Delivery: ${po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'N/A'}`);
          doc.text(`Status: ${po.status.toUpperCase()}`);
          doc.moveDown();
          
          // Line items table
          doc.text('Purchase Order Items', { underline: true });
          doc.moveDown();
          
          // Create a simple table for items
          const tableTop = doc.y;
          const colWidths = {
            description: 250,
            quantity: 70,
            unitPrice: 100,
            total: 100
          };
          
          // Table headers
          doc.text('Description', doc.x, tableTop);
          doc.text('Quantity', doc.x + colWidths.description, tableTop);
          doc.text('Unit Price', doc.x + colWidths.description + colWidths.quantity, tableTop);
          doc.text('Total', doc.x + colWidths.description + colWidths.quantity + colWidths.unitPrice, tableTop);
          
          doc.moveDown();
          let yPos = doc.y;
          
          // Check if items exist
          if (po.items && po.items.length > 0) {
            // Debug log the items
            console.log(`PO items for PDF (${po.items.length}):`, JSON.stringify(po.items));
            
            // Try a completely different approach for rendering items
            let currentY = yPos;
            
            // Draw table header borders
            doc.moveTo(doc.x, currentY - 15).lineTo(doc.x + 520, currentY - 15).stroke();
            
            // Process each item
            po.items.forEach((item, index) => {
              console.log(`Rendering PO item ${index} at position ${currentY}:`, JSON.stringify(item));
              
              // Extract values with defaults to prevent errors
              const description = String(item.description || 'No description provided');
              const quantity = String(item.quantity || '0');
              const unitPrice = Number(item.unitPrice) || 0;
              const totalPrice = Number(item.total) || 0;
              
              console.log(`Processing item description: "${description.substring(0, 50)}..." [${description.length} chars]`);
              
              // Draw description text (multiline supported)
              const descriptionOptions = { 
                width: colWidths.description - 10,
                align: 'left' as const
              };
              
              // Draw description starting at current position
              const descriptionStart = currentY;
              doc.text(description, doc.x + 5, currentY, descriptionOptions);
              
              // Store where description ended
              const descriptionEnd = doc.y;
              
              // Reset position to where this row started
              doc.y = currentY;
              
              // Draw the other columns aligned with top of description
              doc.text(quantity, doc.x + colWidths.description + 5, currentY, { align: 'center' });
              doc.text(formatCurrency(unitPrice), doc.x + colWidths.description + colWidths.quantity + 5, currentY);
              doc.text(formatCurrency(totalPrice), doc.x + colWidths.description + colWidths.quantity + colWidths.unitPrice + 5, currentY);
              
              // Move to position after description (which may be multiline)
              currentY = descriptionEnd + 10;
              doc.y = currentY;
              
              // Draw horizontal line separator
              doc.moveTo(doc.x, currentY - 5).lineTo(doc.x + 520, currentY - 5).stroke();
            });
          } else {
            doc.text('No items in this purchase order', doc.x, yPos, { width: colWidths.description + colWidths.quantity + colWidths.unitPrice + colWidths.total });
            yPos = doc.y + 15;
            doc.y = yPos;
          }
          
          // Add a divider
          doc.moveTo(doc.x, doc.y).lineTo(doc.x + 520, doc.y).stroke();
          doc.moveDown();
          
          // PO totals
          const totalsX = doc.x + 350;
          doc.text(`Subtotal:`, totalsX);
          doc.text(formatCurrency(po.subtotal || 0), totalsX + 100);
          doc.moveDown(0.5);
          
          doc.text(`Tax:`, totalsX);
          doc.text(formatCurrency(po.tax || 0), totalsX + 100);
          doc.moveDown(0.5);
          
          if (po.shipping) {
            doc.text(`Shipping:`, totalsX);
            doc.text(formatCurrency(po.shipping || 0), totalsX + 100);
            doc.moveDown(0.5);
          }
          
          doc.text(`Total:`, totalsX, null, { bold: true });
          doc.text(formatCurrency(po.total || 0), totalsX + 100, null, { bold: true });
          
        } else {
          // Fallback for generic documents or missing data
          doc.text('This is a system-generated document.');
          doc.moveDown();
          doc.text('For complete details, please contact our office.');
        }
        
        // Add standard footer
        doc.moveDown();
        doc.moveDown();
        doc.fontSize(10);
        doc.text('NOTICE: This is a computer-generated document. If you have questions, please contact support.', { align: 'center' });
        
        // Finalize PDF
        doc.end();
        
        // Get the buffer when the stream is finished
        writableStreamBuffer.on('finish', () => {
          const pdfBuffer = writableStreamBuffer.getContents();
          if (pdfBuffer) {
            console.log(`PDF generated successfully with PDFKit for ${filename}, size: ${pdfBuffer.length} bytes`);
            resolve(pdfBuffer);
          } else {
            console.error(`Failed to generate PDF for ${filename}: Empty buffer`);
            reject(new Error('Failed to generate PDF: Empty buffer'));
          }
        });
        
        writableStreamBuffer.on('error', (err) => {
          console.error(`Error in stream for ${filename}:`, err);
          reject(err);
        });
        
      } catch (error) {
        console.error(`Error generating PDF with PDFKit for ${filename}:`, error);
        reject(error);
      }
    });
  }

  /**
   * Render HTML template for quote
   */
  private static async renderQuoteTemplate(quote: Quote & { items: any[] }): Promise<string> {
    // Format currency
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD'
      }).format(value);
    };

    // Format date
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Quote #${quote.quoteNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.5;
              color: #333;
              margin: 0;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              font-size: 24px;
              margin: 0;
            }
            .quote-info {
              margin-bottom: 20px;
            }
            .quote-info p {
              margin: 5px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              padding: 10px;
              border-bottom: 1px solid #ddd;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            .amount-summary {
              margin-left: auto;
              width: 300px;
            }
            .amount-summary table {
              width: 100%;
            }
            .amount-summary td {
              padding: 5px 10px;
            }
            .amount-summary td:last-child {
              text-align: right;
            }
            .footer {
              margin-top: 30px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>QUOTE</h1>
            <p>Quote #: ${quote.quoteNumber}</p>
          </div>
          
          <div class="quote-info">
            <p><strong>Issue Date:</strong> ${formatDate(quote.issueDate)}</p>
            <p><strong>Valid Until:</strong> ${quote.expiryDate ? formatDate(quote.expiryDate) : 'N/A'}</p>
            <p><strong>Reference:</strong> ${quote.reference || 'N/A'}</p>
            <p><strong>Status:</strong> ${quote.status.toUpperCase()}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${quote.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.unitPrice)}</td>
                  <td>${formatCurrency(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="amount-summary">
            <table>
              <tr>
                <td><strong>Subtotal:</strong></td>
                <td>${formatCurrency(quote.subtotal)}</td>
              </tr>
              ${quote.tax ? `
              <tr>
                <td><strong>Tax:</strong></td>
                <td>${formatCurrency(quote.tax)}</td>
              </tr>
              ` : ''}
              ${quote.discount ? `
              <tr>
                <td><strong>Discount:</strong></td>
                <td>${formatCurrency(quote.discount)}</td>
              </tr>
              ` : ''}
              <tr>
                <td><strong>Total:</strong></td>
                <td>${formatCurrency(quote.total)}</td>
              </tr>
            </table>
          </div>
          
          <div class="footer">
            ${quote.notes ? `<p><strong>Notes:</strong> ${quote.notes}</p>` : ''}
            ${quote.terms ? `<p><strong>Terms & Conditions:</strong> ${quote.terms}</p>` : ''}
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Render HTML template for invoice
   */
  private static async renderInvoiceTemplate(invoice: InvoiceWithRelations): Promise<string> {
    // Format currency
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD'
      }).format(value);
    };

    // Format date
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice #${invoice.invoiceNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.5;
              color: #333;
              margin: 0;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              font-size: 24px;
              margin: 0;
            }
            .customer-info, .project-info, .invoice-info {
              margin-bottom: 20px;
            }
            .customer-info h3, .project-info h3 {
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            .invoice-info p, .customer-info p, .project-info p {
              margin: 5px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              padding: 10px;
              border-bottom: 1px solid #ddd;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            .amount-summary {
              margin-left: auto;
              width: 300px;
            }
            .amount-summary table {
              width: 100%;
            }
            .amount-summary td {
              padding: 5px 10px;
            }
            .amount-summary td:last-child {
              text-align: right;
            }
            .footer {
              margin-top: 30px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${invoice.type === 'deposit' ? 'DEPOSIT INVOICE' : 'INVOICE'}</h1>
            <p>Invoice #: ${invoice.invoiceNumber}</p>
          </div>
          
          ${invoice.customer ? `
          <div class="customer-info">
            <h3>Customer</h3>
            <p>${invoice.customer.name}</p>
            <p>${invoice.customer.email}</p>
            <p>${invoice.customer.phone}</p>
            <p>${invoice.customer.address || ''}</p>
            <p>${invoice.customer.city || ''}, ${invoice.customer.state || ''} ${invoice.customer.zipCode || ''}</p>
            <p>${invoice.customer.country || ''}</p>
          </div>
          ` : ''}

          ${invoice.project ? `
          <div class="project-info">
            <h3>Project</h3>
            <p><strong>Project Name:</strong> ${invoice.project.name}</p>
            <p><strong>Description:</strong> ${invoice.project.description || 'N/A'}</p>
          </div>
          ` : ''}
          
          <div class="invoice-info">
            <p><strong>Issue Date:</strong> ${formatDate(invoice.issueDate)}</p>
            <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
            <p><strong>Reference:</strong> ${invoice.reference || 'N/A'}</p>
            <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.unitPrice)}</td>
                  <td>${formatCurrency(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="amount-summary">
            <table>
              <tr>
                <td><strong>Subtotal:</strong></td>
                <td>${formatCurrency(invoice.subtotal)}</td>
              </tr>
              ${invoice.tax ? `
              <tr>
                <td><strong>Tax:</strong></td>
                <td>${formatCurrency(invoice.tax)}</td>
              </tr>
              ` : ''}
              ${invoice.discount ? `
              <tr>
                <td><strong>Discount:</strong></td>
                <td>${formatCurrency(invoice.discount)}</td>
              </tr>
              ` : ''}
              <tr>
                <td><strong>Total:</strong></td>
                <td>${formatCurrency(invoice.total)}</td>
              </tr>
            </table>
          </div>
          
          <div class="footer">
            ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
            ${invoice.terms ? `<p><strong>Terms & Conditions:</strong> ${invoice.terms}</p>` : ''}
            <p><strong>Payment Information:</strong> Please include the invoice number with your payment.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Render HTML template for purchase order
   */
  private static async renderPurchaseOrderTemplate(po: PurchaseOrder & { items: any[] }): Promise<string> {
    // Format currency
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD'
      }).format(value);
    };

    // Format date
    const formatDate = (dateString: string | null) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Purchase Order #${po.poNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.5;
              color: #333;
              margin: 0;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              font-size: 24px;
              margin: 0;
            }
            .po-info {
              margin-bottom: 20px;
            }
            .po-info p {
              margin: 5px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              padding: 10px;
              border-bottom: 1px solid #ddd;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            .amount-summary {
              margin-left: auto;
              width: 300px;
            }
            .amount-summary table {
              width: 100%;
            }
            .amount-summary td {
              padding: 5px 10px;
            }
            .amount-summary td:last-child {
              text-align: right;
            }
            .footer {
              margin-top: 30px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PURCHASE ORDER</h1>
            <p>PO #: ${po.poNumber}</p>
          </div>
          
          <div class="po-info">
            <p><strong>Issue Date:</strong> ${formatDate(po.issueDate)}</p>
            <p><strong>Expected Delivery Date:</strong> ${formatDate(po.expectedDeliveryDate)}</p>
            <p><strong>Status:</strong> ${po.status.toUpperCase()}</p>
            ${po.deliveryAddress ? `<p><strong>Delivery Address:</strong> ${po.deliveryAddress}</p>` : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${po.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.unitPrice)}</td>
                  <td>${formatCurrency(item.total || (item.quantity * item.unitPrice))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="amount-summary">
            <table>
              <tr>
                <td><strong>Subtotal:</strong></td>
                <td>${formatCurrency(po.subtotal)}</td>
              </tr>
              ${po.tax ? `
              <tr>
                <td><strong>Tax:</strong></td>
                <td>${formatCurrency(po.tax)}</td>
              </tr>
              ` : ''}
              ${po.shipping ? `
              <tr>
                <td><strong>Shipping:</strong></td>
                <td>${formatCurrency(po.shipping)}</td>
              </tr>
              ` : ''}
              <tr>
                <td><strong>Total:</strong></td>
                <td>${formatCurrency(po.total)}</td>
              </tr>
            </table>
          </div>
          
          <div class="footer">
            ${po.notes ? `<p><strong>Notes:</strong> ${po.notes}</p>` : ''}
            ${po.terms ? `<p><strong>Terms & Conditions:</strong> ${po.terms}</p>` : ''}
          </div>
        </body>
      </html>
    `;
  }
}