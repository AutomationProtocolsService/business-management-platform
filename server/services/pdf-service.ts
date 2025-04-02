import puppeteer from 'puppeteer';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import StreamBuffers from 'stream-buffers';
import { Quote, Invoice, PurchaseOrder } from '@shared/schema';

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
    return this.generatePDFFromHTML(htmlContent, `Quote_${quote.quoteNumber}`);
  }

  /**
   * Generate a PDF file for an invoice
   * @param invoice The invoice data including items
   * @returns Buffer containing the PDF file
   */
  static async generateInvoicePDF(invoice: Invoice & { items: any[] }): Promise<Buffer> {
    const htmlContent = await this.renderInvoiceTemplate(invoice);
    return this.generatePDFFromHTML(htmlContent, `Invoice_${invoice.invoiceNumber}`);
  }

  /**
   * Generate a PDF file for a purchase order
   * @param purchaseOrder The PO data including items
   * @returns Buffer containing the PDF file
   */
  static async generatePurchaseOrderPDF(purchaseOrder: PurchaseOrder & { items: any[] }): Promise<Buffer> {
    const htmlContent = await this.renderPurchaseOrderTemplate(purchaseOrder);
    return this.generatePDFFromHTML(htmlContent, `PO_${purchaseOrder.poNumber}`);
  }

  /**
   * Generate a PDF from HTML content using Puppeteer
   * @param htmlContent The HTML content to render as PDF
   * @param filename The filename without extension
   * @returns Buffer containing the PDF file
   */
  private static async generatePDFFromHTML(htmlContent: string, filename: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
      });
      
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
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
        // Create a PDF document
        const doc = new PDFDocument({ margin: 50 });
        
        // Create a writable stream buffer
        const buffers: Buffer[] = [];
        const writableStreamBuffer = new StreamBuffers.WritableStreamBuffer({
          initialSize: (100 * 1024),
          incrementAmount: (10 * 1024)
        });
        
        // Pipe the document to the buffer
        doc.pipe(writableStreamBuffer);

        // Add company header (this would be fetched from company settings in a real app)
        doc.fontSize(20).text('Company Name', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text('123 Business St, City, State, ZIP', { align: 'center' });
        doc.text('Phone: (123) 456-7890 | Email: info@company.com', { align: 'center' });
        doc.moveDown();
        
        // Add document title
        doc.fontSize(16).text(filename, { align: 'center' });
        doc.moveDown();
        
        // Add details based on data type
        doc.fontSize(12);
        
        // We would add specific data rendering based on the document type here
        
        // Finalize PDF
        doc.end();
        
        // Get the buffer when the stream is finished
        writableStreamBuffer.on('finish', () => {
          const pdfBuffer = writableStreamBuffer.getContents();
          if (pdfBuffer) {
            resolve(pdfBuffer);
          } else {
            reject(new Error('Failed to generate PDF: Empty buffer'));
          }
        });
        
        writableStreamBuffer.on('error', (err) => {
          reject(err);
        });
        
      } catch (error) {
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
  private static async renderInvoiceTemplate(invoice: Invoice & { items: any[] }): Promise<string> {
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
            .invoice-info {
              margin-bottom: 20px;
            }
            .invoice-info p {
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