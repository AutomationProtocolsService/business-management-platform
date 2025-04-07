import PDFDocument from "pdfkit";
import { createWriteStream } from "fs";
import * as stream from "stream";

/**
 * Service for generating PDF documents
 */
class PDFServiceImpl {
  /**
   * Generate a PDF for a quote
   * @param quoteData The quote data including related items, customer, and project
   * @returns Buffer containing the PDF
   */
  async generateQuotePDF(quoteData: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Create a PDF document
        const doc = new PDFDocument({ margin: 50 });
        
        // Create a buffer to store the PDF
        const buffers: Buffer[] = [];
        const bufferStream = new stream.PassThrough();
        
        bufferStream.on('data', (chunk) => {
          buffers.push(Buffer.from(chunk));
        });
        
        bufferStream.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        
        // Pipe the PDF to the buffer stream
        doc.pipe(bufferStream);
        
        // Add company header
        doc.fontSize(20).text('QUOTE', { align: 'center' });
        doc.moveDown();
        
        // Add quote information
        doc.fontSize(12).text(`Quote Number: ${quoteData.quoteNumber}`);
        doc.text(`Date: ${new Date(quoteData.createdAt).toLocaleDateString()}`);
        if (quoteData.expiryDate) {
          doc.text(`Expiry Date: ${new Date(quoteData.expiryDate).toLocaleDateString()}`);
        }
        doc.moveDown();
        
        // Add customer information if available
        if (quoteData.customer) {
          doc.text('CUSTOMER INFORMATION', { underline: true });
          doc.text(`Name: ${quoteData.customer.name}`);
          doc.text(`Email: ${quoteData.customer.email}`);
          if (quoteData.customer.phone) doc.text(`Phone: ${quoteData.customer.phone}`);
          if (quoteData.customer.address) doc.text(`Address: ${quoteData.customer.address}`);
          doc.moveDown();
        }
        
        // Add project information if available
        if (quoteData.project) {
          doc.text('PROJECT INFORMATION', { underline: true });
          doc.text(`Project: ${quoteData.project.name}`);
          if (quoteData.project.description) doc.text(`Description: ${quoteData.project.description}`);
          doc.moveDown();
        }
        
        // Add items table
        doc.text('ITEMS', { underline: true });
        
        // Table header
        const tableTop = doc.y + 10;
        const itemX = 50;
        const descriptionX = 100;
        const quantityX = 300;
        const priceX = 350;
        const amountX = 450;
        
        doc.font('Helvetica-Bold');
        doc.text('Item', itemX, tableTop);
        doc.text('Description', descriptionX, tableTop);
        doc.text('Qty', quantityX, tableTop);
        doc.text('Price', priceX, tableTop);
        doc.text('Amount', amountX, tableTop);
        
        // Reset font
        doc.font('Helvetica');
        
        // Add horizontal line
        const lineY = doc.y + 5;
        doc.moveTo(50, lineY).lineTo(550, lineY).stroke();
        
        // Table rows
        let y = lineY + 10;
        
        // Add items
        if (quoteData.items && quoteData.items.length) {
          quoteData.items.forEach((item: any, i: number) => {
            doc.text((i + 1).toString(), itemX, y);
            doc.text(item.description, descriptionX, y);
            doc.text(item.quantity.toString(), quantityX, y);
            doc.text(`$${item.unitPrice.toFixed(2)}`, priceX, y);
            doc.text(`$${item.total.toFixed(2)}`, amountX, y);
            y += 20;
          });
        } else {
          doc.text('No items', descriptionX, y);
          y += 20;
        }
        
        // Add horizontal line
        doc.moveTo(50, y).lineTo(550, y).stroke();
        y += 10;
        
        // Add totals
        doc.text('Subtotal:', 350, y);
        doc.text(`$${quoteData.subtotal ? quoteData.subtotal.toFixed(2) : '0.00'}`, amountX, y);
        y += 20;
        
        if (quoteData.tax) {
          doc.text('Tax:', 350, y);
          doc.text(`$${quoteData.tax.toFixed(2)}`, amountX, y);
          y += 20;
        }
        
        if (quoteData.discount) {
          doc.text('Discount:', 350, y);
          doc.text(`$${quoteData.discount.toFixed(2)}`, amountX, y);
          y += 20;
        }
        
        doc.font('Helvetica-Bold');
        doc.text('TOTAL:', 350, y);
        doc.text(`$${quoteData.total ? quoteData.total.toFixed(2) : '0.00'}`, amountX, y);
        doc.font('Helvetica');
        
        // Add notes and terms
        if (quoteData.notes) {
          doc.moveDown();
          doc.text('Notes:', { underline: true });
          doc.text(quoteData.notes);
        }
        
        if (quoteData.terms) {
          doc.moveDown();
          doc.text('Terms and Conditions:', { underline: true });
          doc.text(quoteData.terms);
        }
        
        // Finalize the PDF
        doc.end();
        
      } catch (error) {
        console.error('Error generating quote PDF:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate a PDF for an invoice
   * @param invoiceData The invoice data including related items, customer, and project
   * @param useTestData Whether to use test data for development/debugging
   * @returns Buffer containing the PDF
   */
  async generateInvoicePDF(invoiceData: any, useTestData = false): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Create a PDF document
        const doc = new PDFDocument({ margin: 50 });
        
        // Create a buffer to store the PDF
        const buffers: Buffer[] = [];
        const bufferStream = new stream.PassThrough();
        
        bufferStream.on('data', (chunk) => {
          buffers.push(Buffer.from(chunk));
        });
        
        bufferStream.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        
        // Pipe the PDF to the buffer stream
        doc.pipe(bufferStream);
        
        // If using test data, add a clear indicator
        if (useTestData) {
          doc.fontSize(12).fillColor('red').text('TEST INVOICE - NOT VALID FOR PAYMENT', { align: 'center' });
          doc.fillColor('black');
        }
        
        // Add company header
        doc.fontSize(20).text('INVOICE', { align: 'center' });
        doc.moveDown();
        
        // Add invoice information
        doc.fontSize(12).text(`Invoice Number: ${invoiceData.invoiceNumber}`);
        doc.text(`Issue Date: ${new Date(invoiceData.issueDate).toLocaleDateString()}`);
        doc.text(`Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString()}`);
        doc.moveDown();
        
        // Add customer information if available
        if (invoiceData.customer) {
          doc.text('BILL TO:', { underline: true });
          doc.text(`Name: ${invoiceData.customer.name}`);
          doc.text(`Email: ${invoiceData.customer.email}`);
          if (invoiceData.customer.phone) doc.text(`Phone: ${invoiceData.customer.phone}`);
          if (invoiceData.customer.address) doc.text(`Address: ${invoiceData.customer.address}`);
          doc.moveDown();
        }
        
        // Add project information if available
        if (invoiceData.project) {
          doc.text('PROJECT INFORMATION', { underline: true });
          doc.text(`Project: ${invoiceData.project.name}`);
          if (invoiceData.project.description) doc.text(`Description: ${invoiceData.project.description}`);
          doc.moveDown();
        }
        
        // Related quote information if available
        if (invoiceData.quoteId) {
          doc.text(`Related Quote: ${invoiceData.quoteId}`);
          doc.moveDown();
        }
        
        // Add items table
        doc.text('ITEMS', { underline: true });
        
        // Table header
        const tableTop = doc.y + 10;
        const itemX = 50;
        const descriptionX = 100;
        const quantityX = 300;
        const priceX = 350;
        const amountX = 450;
        
        doc.font('Helvetica-Bold');
        doc.text('Item', itemX, tableTop);
        doc.text('Description', descriptionX, tableTop);
        doc.text('Qty', quantityX, tableTop);
        doc.text('Price', priceX, tableTop);
        doc.text('Amount', amountX, tableTop);
        
        // Reset font
        doc.font('Helvetica');
        
        // Add horizontal line
        const lineY = doc.y + 5;
        doc.moveTo(50, lineY).lineTo(550, lineY).stroke();
        
        // Table rows
        let y = lineY + 10;
        
        // Add items
        if (invoiceData.items && invoiceData.items.length) {
          invoiceData.items.forEach((item: any, i: number) => {
            doc.text((i + 1).toString(), itemX, y);
            doc.text(item.description, descriptionX, y);
            doc.text(item.quantity.toString(), quantityX, y);
            doc.text(`$${item.unitPrice.toFixed(2)}`, priceX, y);
            doc.text(`$${item.total.toFixed(2)}`, amountX, y);
            y += 20;
          });
        } else {
          doc.text('No items', descriptionX, y);
          y += 20;
        }
        
        // Add horizontal line
        doc.moveTo(50, y).lineTo(550, y).stroke();
        y += 10;
        
        // Add totals
        doc.text('Subtotal:', 350, y);
        doc.text(`$${invoiceData.subtotal ? invoiceData.subtotal.toFixed(2) : '0.00'}`, amountX, y);
        y += 20;
        
        if (invoiceData.tax) {
          doc.text('Tax:', 350, y);
          doc.text(`$${invoiceData.tax.toFixed(2)}`, amountX, y);
          y += 20;
        }
        
        if (invoiceData.discount) {
          doc.text('Discount:', 350, y);
          doc.text(`$${invoiceData.discount.toFixed(2)}`, amountX, y);
          y += 20;
        }
        
        doc.font('Helvetica-Bold');
        doc.text('TOTAL DUE:', 350, y);
        doc.text(`$${invoiceData.total ? invoiceData.total.toFixed(2) : '0.00'}`, amountX, y);
        doc.font('Helvetica');
        
        // Add payment instructions
        doc.moveDown();
        doc.text('PAYMENT INSTRUCTIONS', { underline: true });
        doc.text('Please reference invoice number when making payment.');
        
        // Add notes and terms
        if (invoiceData.notes) {
          doc.moveDown();
          doc.text('Notes:', { underline: true });
          doc.text(invoiceData.notes);
        }
        
        if (invoiceData.terms) {
          doc.moveDown();
          doc.text('Terms and Conditions:', { underline: true });
          doc.text(invoiceData.terms);
        }
        
        // Add footer
        const pageHeight = doc.page.height;
        doc.text('Thank you for your business!', 50, pageHeight - 50, { align: 'center' });
        
        // Finalize the PDF
        doc.end();
        
      } catch (error) {
        console.error('Error generating invoice PDF:', error);
        reject(error);
      }
    });
  }
}

// Export a singleton instance
const PDFService = new PDFServiceImpl();
export default PDFService;