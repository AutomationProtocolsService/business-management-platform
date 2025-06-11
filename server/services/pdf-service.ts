import PDFDocument from "pdfkit";
import { createWriteStream } from "fs";
import * as stream from "stream";

/**
 * Helper function to wrap long words for better text wrapping
 */
function wrapLongWords(txt: string, every = 30): string {
  // inserts a zero-width-space every ‹every› chars inside an unbroken word
  return txt.replace(
    new RegExp(`([^\\s]{${every}})(?=[^\\s])`, 'g'),
    '$1\u200B'
  );
}

/**
 * Helper function to format money values
 */
function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// Table column constants
const COLS = { 
  item: 50, 
  desc: 100, 
  qty: 380, 
  price: 440, 
  amt: 500 
};
const DESC_WIDTH = 260; // Keep under right margin
const ROW_GAP = 6; // White-space below each row

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
    console.log("PDF table layout patch loaded - Quote generation starting");
    return new Promise((resolve, reject) => {
      try {
        // Create a PDF document with optimized margins
        const doc = new PDFDocument({ 
          margin: 40, // Reduce margins to allow more space for content
          size: 'letter',
          bufferPages: true
        });
        
        // Set maximum width for text wrapping
        const maxWidth = 520; // Increased to provide more space for text
        
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
        
        // Version stamp
        doc
          .fontSize(8)
          .fillColor('#999')
          .text(`feat(pdf): stable table layout`, 400, 20);
        
        // Add company header
        doc.fontSize(20).fillColor('#000').text('QUOTE', { align: 'center' });
        doc.moveDown();
        
        // Add quote information - left aligned
        doc.fontSize(12).text(`Quote Number: ${quoteData.quoteNumber}`, 50);
        doc.text(`Date: ${new Date(quoteData.issueDate || quoteData.createdAt).toLocaleDateString()}`, 50);
        if (quoteData.expiryDate) {
          doc.text(`Expiry Date: ${new Date(quoteData.expiryDate).toLocaleDateString()}`, 50);
        }
        doc.moveDown();
        
        // Add customer information - left aligned to match invoice
        if (quoteData.customer) {
          doc.text('CUSTOMER INFORMATION', 50, doc.y, { underline: true });
          doc.text(`Name: ${quoteData.customer.name || 'N/A'}`, 50);
          doc.text(`Email: ${quoteData.customer.email || 'N/A'}`, 50);
          if (quoteData.customer.phone) doc.text(`Phone: ${quoteData.customer.phone}`, 50);
          if (quoteData.customer.address) doc.text(`Address: ${quoteData.customer.address}`, 50);
          doc.moveDown();
        } else {
          doc.text('CUSTOMER INFORMATION', 50, doc.y, { underline: true });
          doc.text('No customer information available', 50);
          doc.moveDown();
        }
        
        // Add project information if available - left aligned
        if (quoteData.project) {
          doc.text('PROJECT INFORMATION', 50, doc.y, { underline: true });
          doc.text(`Project: ${quoteData.project.name}`, 50);
          if (quoteData.project.description) doc.text(`Description: ${quoteData.project.description}`, 50, doc.y, { width: maxWidth });
          doc.moveDown();
        }
        
        // Add items table
        doc.text('ITEMS', { underline: true });
        doc.moveDown(0.5);
        
        // Clean table layout without borders - fixed column spacing
        const pageWidth = doc.page.width - 100;
        const descriptionWidth = 280;
        const quantityWidth = 60;
        const priceWidth = 80;
        const amountWidth = 80;
        
        // Table header positions with wider spacing
        const descriptionX = 50;
        const quantityX = 360;  // Quantity column
        const priceX = 430;     // Price column
        const amountX = 515;    // Amount column with more space
        
        // Table header - clean design
        doc.font('Helvetica-Bold');
        doc.text('Description', descriptionX, doc.y);
        doc.text('Qty', quantityX, doc.y - doc.currentLineHeight(), { width: quantityWidth, align: 'center' });
        doc.text('Price', priceX, doc.y - doc.currentLineHeight(), { width: priceWidth, align: 'right' });
        doc.text('Amount', amountX, doc.y - doc.currentLineHeight(), { width: amountWidth, align: 'right' });
        
        doc.moveDown(0.5);
        
        // Single line under header only
        const headerLineY = doc.y;
        doc.moveTo(descriptionX, headerLineY).lineTo(amountX + amountWidth, headerLineY).stroke();
        doc.moveDown(0.5);
        
        // Reset font
        doc.font('Helvetica');
        
        // Items without table borders
        if (quoteData.items && quoteData.items.length) {
          quoteData.items.forEach(({ description, quantity, unitPrice, total }: any, i: number) => {
            const yStart = doc.y;

            // Description with wrapping
            doc.text(wrapLongWords(description || ''), descriptionX, yStart, { 
              width: descriptionWidth - 10,
              continued: false 
            });

            // Get the height after description text wrapping
            const descriptionHeight = doc.y - yStart;
            
            // Center align quantity, price, and amount with the description
            const centerY = yStart + (descriptionHeight / 2) - 6;
            
            doc.text(String(quantity), quantityX, centerY, { width: quantityWidth, align: 'center' });
            doc.text(formatMoney(unitPrice || 0), priceX, centerY, { width: priceWidth, align: 'right' });
            doc.text(formatMoney(total || 0), amountX, centerY, { width: amountWidth, align: 'right' });

            // Move to next row with proper spacing
            doc.y = yStart + Math.max(descriptionHeight, 20) + 8;
            
            // Check for new page
            if (doc.y > doc.page.height - 150) {
              doc.addPage();
            }
          });
        } else {
          doc.text('No items', descriptionX, doc.y);
          doc.moveDown();
        }
        
        doc.moveDown(1);
        
        // Clean totals section aligned to the right
        const totalsX = priceX;
        doc.text('Subtotal:', totalsX, doc.y, { align: 'left' });
        doc.text(`$${quoteData.subtotal ? quoteData.subtotal.toFixed(2) : '0.00'}`, amountX, doc.y - doc.currentLineHeight(), { width: amountWidth, align: 'right' });
        doc.moveDown(0.3);
        
        if (quoteData.tax) {
          doc.text('Tax:', totalsX, doc.y, { align: 'left' });
          doc.text(`$${quoteData.tax.toFixed(2)}`, amountX, doc.y - doc.currentLineHeight(), { width: amountWidth, align: 'right' });
          doc.moveDown(0.3);
        }
        
        if (quoteData.discount) {
          doc.text('Discount:', totalsX, doc.y, { align: 'left' });
          doc.text(`$${quoteData.discount.toFixed(2)}`, amountX, doc.y - doc.currentLineHeight(), { width: amountWidth, align: 'right' });
          doc.moveDown(0.3);
        }
        
        doc.font('Helvetica-Bold');
        doc.text('TOTAL:', totalsX, doc.y, { align: 'left' });
        doc.text(`$${quoteData.total ? quoteData.total.toFixed(2) : '0.00'}`, amountX, doc.y - doc.currentLineHeight(), { width: amountWidth, align: 'right' });
        doc.font('Helvetica');
        doc.moveDown();
        
        // Add notes and terms with word wrapping
        if (quoteData.notes) {
          doc.moveDown();
          doc.text('Notes:', { underline: true });
          doc.text(quoteData.notes, { width: maxWidth });
        }
        
        if (quoteData.terms) {
          doc.moveDown();
          doc.text('Terms and Conditions:', { underline: true });
          doc.text(quoteData.terms, { width: maxWidth });
        }
        
        // Add a footer
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc.text(
            `Page ${i + 1} of ${pageCount}`,
            50,
            doc.page.height - 50,
            { align: 'center' }
          );
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
        // Create a PDF document with larger margins
        const doc = new PDFDocument({
          margin: 50,
          size: 'letter',
          bufferPages: true
        });
        
        // Set maximum width for text wrapping
        const maxWidth = 500;
        
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
          doc.text(`Name: ${invoiceData.customer.name || 'N/A'}`);
          doc.text(`Email: ${invoiceData.customer.email || 'N/A'}`);
          if (invoiceData.customer.phone) doc.text(`Phone: ${invoiceData.customer.phone}`);
          if (invoiceData.customer.address) doc.text(`Address: ${invoiceData.customer.address}`);
          doc.moveDown();
        } else {
          doc.text('BILL TO:', { underline: true });
          doc.text('No customer information available');
          doc.moveDown();
        }
        
        // Add project information if available
        if (invoiceData.project) {
          doc.text('PROJECT INFORMATION', { underline: true });
          doc.text(`Project: ${invoiceData.project.name}`);
          if (invoiceData.project.description) doc.text(`Description: ${invoiceData.project.description}`, { width: maxWidth });
          doc.moveDown();
        }
        
        // Related quote information if available
        if (invoiceData.quoteId) {
          doc.text(`Related Quote: ${invoiceData.quoteId}`);
          doc.moveDown();
        }
        
        // Add items table
        doc.text('ITEMS', { underline: true });
        doc.moveDown(0.5);
        
        // Clean table layout without borders - fixed column spacing
        const pageWidth = doc.page.width - 100;
        const descriptionWidth = 280;
        const quantityWidth = 60;
        const priceWidth = 80;
        const amountWidth = 80;
        
        // Table header positions with wider spacing
        const descriptionX = 50;
        const quantityX = 360;  // Quantity column
        const priceX = 430;     // Price column
        const amountX = 515;    // Amount column with more space
        
        // Table header - clean design
        doc.font('Helvetica-Bold');
        doc.text('Description', descriptionX, doc.y);
        doc.text('Qty', quantityX, doc.y - doc.currentLineHeight(), { width: quantityWidth, align: 'center' });
        doc.text('Price', priceX, doc.y - doc.currentLineHeight(), { width: priceWidth, align: 'right' });
        doc.text('Amount', amountX, doc.y - doc.currentLineHeight(), { width: amountWidth, align: 'right' });
        
        doc.moveDown(0.5);
        
        // Single line under header only
        const headerLineY = doc.y;
        doc.moveTo(descriptionX, headerLineY).lineTo(amountX + amountWidth, headerLineY).stroke();
        doc.moveDown(0.5);
        
        // Reset font
        doc.font('Helvetica');
        
        // Items without table borders
        if (invoiceData.items && invoiceData.items.length) {
          invoiceData.items.forEach(({ description, quantity, unitPrice, total }: any, i: number) => {
            const yStart = doc.y;

            // Description with wrapping
            doc.text(wrapLongWords(description || ''), descriptionX, yStart, { 
              width: descriptionWidth - 10,
              continued: false 
            });

            // Get the height after description text wrapping
            const descriptionHeight = doc.y - yStart;
            
            // Center align quantity, price, and amount with the description
            const centerY = yStart + (descriptionHeight / 2) - 6;
            
            doc.text(String(quantity), quantityX, centerY, { width: quantityWidth, align: 'center' });
            doc.text(formatMoney(unitPrice || 0), priceX, centerY, { width: priceWidth, align: 'right' });
            doc.text(formatMoney(total || 0), amountX, centerY, { width: amountWidth, align: 'right' });

            // Move to next row with proper spacing
            doc.y = yStart + Math.max(descriptionHeight, 20) + 8;
            
            // Check for new page
            if (doc.y > doc.page.height - 150) {
              doc.addPage();
            }
          });
        } else {
          doc.text('No items', descriptionX, doc.y);
          doc.moveDown();
        }
        
        doc.moveDown(1);
        
        // Clean totals section aligned to the right
        const totalsX = priceX;
        doc.text('Subtotal:', totalsX, doc.y, { align: 'left' });
        doc.text(`$${invoiceData.subtotal ? invoiceData.subtotal.toFixed(2) : '0.00'}`, amountX, doc.y - doc.currentLineHeight(), { width: amountWidth, align: 'right' });
        doc.moveDown(0.3);
        
        if (invoiceData.tax) {
          doc.text('Tax:', totalsX, doc.y, { align: 'left' });
          doc.text(`$${invoiceData.tax.toFixed(2)}`, amountX, doc.y - doc.currentLineHeight(), { width: amountWidth, align: 'right' });
          doc.moveDown(0.3);
        }
        
        if (invoiceData.discount) {
          doc.text('Discount:', totalsX, doc.y, { align: 'left' });
          doc.text(`$${invoiceData.discount.toFixed(2)}`, amountX, doc.y - doc.currentLineHeight(), { width: amountWidth, align: 'right' });
          doc.moveDown(0.3);
        }
        
        doc.font('Helvetica-Bold');
        doc.text('TOTAL DUE:', totalsX, doc.y, { align: 'left' });
        doc.text(`$${invoiceData.total ? invoiceData.total.toFixed(2) : '0.00'}`, amountX, doc.y - doc.currentLineHeight(), { width: amountWidth, align: 'right' });
        doc.font('Helvetica');
        doc.moveDown();
        
        // Add payment instructions
        doc.moveDown();
        doc.text('PAYMENT INSTRUCTIONS', { underline: true });
        doc.text('Please reference invoice number when making payment.', { width: maxWidth });
        
        // Add notes and terms with word wrapping
        if (invoiceData.notes) {
          doc.moveDown();
          doc.text('Notes:', { underline: true });
          doc.text(invoiceData.notes, { width: maxWidth });
        }
        
        if (invoiceData.terms) {
          doc.moveDown();
          doc.text('Terms and Conditions:', { underline: true });
          doc.text(invoiceData.terms, { width: maxWidth });
        }
        
        // Add a footer
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc.text(
            `Page ${i + 1} of ${pageCount}`,
            50,
            doc.page.height - 50,
            { align: 'center' }
          );
          
          // Add "Thank you" message on the last page
          if (i === pageCount - 1) {
            doc.text('Thank you for your business!', 50, doc.page.height - 70, { align: 'center' });
          }
        }
        
        // Finalize the PDF
        doc.end();
        
      } catch (error) {
        console.error('Error generating invoice PDF:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate a PDF for a purchase order
   * @param purchaseOrderData The purchase order data including related items
   * @returns Buffer containing the PDF
   */
  async generatePurchaseOrderPDF(purchaseOrderData: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Create a PDF document with optimized margins
        const doc = new PDFDocument({ 
          margin: 40,
          size: 'letter',
          bufferPages: true
        });
        
        // Set maximum width for text wrapping
        const maxWidth = 520;
        
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
        doc.fontSize(20).text('PURCHASE ORDER', { align: 'center' });
        doc.moveDown();
        
        // Add purchase order information
        doc.fontSize(12).text(`PO Number: ${purchaseOrderData.poNumber}`);
        doc.text(`Date: ${new Date(purchaseOrderData.issueDate || purchaseOrderData.createdAt).toLocaleDateString()}`);
        if (purchaseOrderData.expectedDeliveryDate) {
          doc.text(`Expected Delivery: ${new Date(purchaseOrderData.expectedDeliveryDate).toLocaleDateString()}`);
        }
        doc.moveDown();
        
        // Add supplier information
        doc.text('Supplier Information:', { underline: true });
        doc.text(`Supplier ID: ${purchaseOrderData.supplierId}`);
        doc.moveDown();
        
        // Add line items table
        if (purchaseOrderData.items && purchaseOrderData.items.length > 0) {
          doc.text('Items:', { underline: true });
          doc.moveDown(0.5);
          
          // Table headers
          const startY = doc.y;
          doc.text('Description', 50, startY);
          doc.text('Qty', 300, startY);
          doc.text('Unit Price', 350, startY);
          doc.text('Total', 450, startY);
          
          // Draw header line
          doc.moveTo(50, doc.y + 5).lineTo(520, doc.y + 5).stroke();
          doc.moveDown();
          
          let subtotal = 0;
          
          // Add each item with surgical fix for proper border positioning
          purchaseOrderData.items.forEach(({ description, quantity, unitPrice }: any, i: number) => {
            const yStart = doc.y;
            const itemTotal = (quantity || 0) * (unitPrice || 0);
            subtotal += itemTotal;

            // Draw cell contents
            doc.text(wrapLongWords(description || 'No description'), 50, yStart, { width: DESC_WIDTH });
            doc.text(String(quantity || 0), 300, yStart, { width: 40, align: 'right' });
            doc.text(`$${(unitPrice || 0).toFixed(2)}`, 350, yStart, { width: 60, align: 'right' });
            doc.text(`$${itemTotal.toFixed(2)}`, 450, yStart, { width: 60, align: 'right' });

            // How tall did the wrapped description make this row?
            const yBottom = doc.y; // cursor now sits *after* wrapped text

            // Row rule drawn after measuring actual height
            const rowBottom = yBottom + 4; // add 4-pt padding
            doc.moveTo(50, rowBottom)
               .lineTo(520, rowBottom)
               .stroke();

            // Gap before next row
            doc.y = rowBottom + ROW_GAP;
          });
          
          // Draw line before totals
          doc.moveTo(350, doc.y).lineTo(520, doc.y).stroke();
          doc.moveDown(0.5);
          
          // Add totals
          doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 400, doc.y);
          doc.moveDown();
          doc.text(`Total: $${(purchaseOrderData.total || subtotal).toFixed(2)}`, 400, doc.y, { underline: true });
        }
        
        doc.moveDown();
        
        // Add status
        doc.text(`Status: ${purchaseOrderData.status || 'Draft'}`);
        doc.moveDown();
        
        // Add notes if available
        if (purchaseOrderData.notes) {
          doc.moveDown();
          doc.text('Notes:', { underline: true });
          doc.text(purchaseOrderData.notes, { width: maxWidth });
        }
        
        // Add footer with page numbers
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc.text(
            `Page ${i + 1} of ${pageCount}`,
            50,
            doc.page.height - 50,
            { align: 'center' }
          );
          
          // Add "Thank you" message on the last page
          if (i === pageCount - 1) {
            doc.text('Thank you for your service!', 50, doc.page.height - 70, { align: 'center' });
          }
        }
        
        // Finalize the PDF
        doc.end();
        
      } catch (error) {
        console.error('Error generating purchase order PDF:', error);
        reject(error);
      }
    });
  }
}

// Export a singleton instance
const PDFService = new PDFServiceImpl();
export default PDFService;