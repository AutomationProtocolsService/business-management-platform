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
        
        // Add company header
        doc.fontSize(20).text('QUOTE', { align: 'center' });
        doc.moveDown();
        
        // Add quote information
        doc.fontSize(12).text(`Quote Number: ${quoteData.quoteNumber}`);
        doc.text(`Date: ${new Date(quoteData.issueDate || quoteData.createdAt).toLocaleDateString()}`);
        if (quoteData.expiryDate) {
          doc.text(`Expiry Date: ${new Date(quoteData.expiryDate).toLocaleDateString()}`);
        }
        doc.moveDown();
        
        // Add customer information if available
        if (quoteData.customer) {
          doc.text('CUSTOMER INFORMATION', { underline: true });
          doc.text(`Name: ${quoteData.customer.name || 'N/A'}`);
          doc.text(`Email: ${quoteData.customer.email || 'N/A'}`);
          if (quoteData.customer.phone) doc.text(`Phone: ${quoteData.customer.phone}`);
          if (quoteData.customer.address) doc.text(`Address: ${quoteData.customer.address}`);
          doc.moveDown();
        } else {
          doc.text('CUSTOMER INFORMATION', { underline: true });
          doc.text('No customer information available');
          doc.moveDown();
        }
        
        // Add project information if available
        if (quoteData.project) {
          doc.text('PROJECT INFORMATION', { underline: true });
          doc.text(`Project: ${quoteData.project.name}`);
          if (quoteData.project.description) doc.text(`Description: ${quoteData.project.description}`, { width: maxWidth });
          doc.moveDown();
        }
        
        // Add items table
        doc.text('ITEMS', { underline: true });
        doc.moveDown(0.5);
        
        // Define table layout
        const pageWidth = doc.page.width - 100; // 50 margin on each side
        const itemWidth = 30;
        const descriptionWidth = pageWidth - 210; // Allocate more space for description
        const quantityWidth = 40;
        const priceWidth = 60;
        const amountWidth = 80;
        
        // Table header positions
        const itemX = 50;
        const descriptionX = itemX + itemWidth;
        const quantityX = descriptionX + descriptionWidth;
        const priceX = quantityX + quantityWidth;
        const amountX = priceX + priceWidth;
        
        // Table header
        doc.font('Helvetica-Bold');
        doc.text('Item', itemX, doc.y);
        doc.text('Description', descriptionX, doc.y - doc.currentLineHeight());
        doc.text('Qty', quantityX, doc.y - doc.currentLineHeight());
        doc.text('Price', priceX, doc.y - doc.currentLineHeight());
        doc.text('Amount', amountX, doc.y - doc.currentLineHeight());
        
        // Reset font
        doc.font('Helvetica');
        
        // Add horizontal line
        const lineY = doc.y + 5;
        doc.moveTo(50, lineY).lineTo(doc.page.width - 50, lineY).stroke();
        
        // Table rows
        let y = lineY + 10;
        
        // Add items
        if (quoteData.items && quoteData.items.length) {
          quoteData.items.forEach((item: any, i: number) => {
            // Save initial Y position
            const rowStartY = doc.y;
            
            // Item number (index)
            doc.text((i + 1).toString(), itemX, rowStartY);
            
            // Description with word wrapping - We need to handle this separately
            const descriptionHeight = doc.heightOfString(item.description, { 
              width: descriptionWidth,
              align: 'left' 
            });
            
            doc.text(item.description, descriptionX, rowStartY, { 
              width: descriptionWidth,
              align: 'left' 
            });
            
            // Other columns
            doc.text(item.quantity.toString(), quantityX, rowStartY);
            doc.text(`$${item.unitPrice.toFixed(2)}`, priceX, rowStartY);
            doc.text(`$${item.total.toFixed(2)}`, amountX, rowStartY);
            
            // Move down by the maximum height used
            doc.moveDown(Math.max(1, descriptionHeight / doc.currentLineHeight()));
            
            // Check if we need a new page
            if (doc.y > doc.page.height - 150) {
              doc.addPage();
            }
          });
        } else {
          doc.text('No items', descriptionX, doc.y);
          doc.moveDown();
        }
        
        // Add horizontal line
        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
        doc.moveDown();
        
        // Add totals
        const totalsX = amountX - 100;
        doc.text('Subtotal:', totalsX, doc.y);
        doc.text(`$${quoteData.subtotal ? quoteData.subtotal.toFixed(2) : '0.00'}`, amountX, doc.y - doc.currentLineHeight());
        doc.moveDown();
        
        if (quoteData.tax) {
          doc.text('Tax:', totalsX, doc.y);
          doc.text(`$${quoteData.tax.toFixed(2)}`, amountX, doc.y - doc.currentLineHeight());
          doc.moveDown();
        }
        
        if (quoteData.discount) {
          doc.text('Discount:', totalsX, doc.y);
          doc.text(`$${quoteData.discount.toFixed(2)}`, amountX, doc.y - doc.currentLineHeight());
          doc.moveDown();
        }
        
        doc.font('Helvetica-Bold');
        doc.text('TOTAL:', totalsX, doc.y);
        doc.text(`$${quoteData.total ? quoteData.total.toFixed(2) : '0.00'}`, amountX, doc.y - doc.currentLineHeight());
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
        
        // Define table layout
        const pageWidth = doc.page.width - 100; // 50 margin on each side
        const itemWidth = 30;
        const descriptionWidth = pageWidth - 210; // Allocate more space for description
        const quantityWidth = 40;
        const priceWidth = 60;
        const amountWidth = 80;
        
        // Table header positions
        const itemX = 50;
        const descriptionX = itemX + itemWidth;
        const quantityX = descriptionX + descriptionWidth;
        const priceX = quantityX + quantityWidth;
        const amountX = priceX + priceWidth;
        
        // Table header
        doc.font('Helvetica-Bold');
        doc.text('Item', itemX, doc.y);
        doc.text('Description', descriptionX, doc.y - doc.currentLineHeight());
        doc.text('Qty', quantityX, doc.y - doc.currentLineHeight());
        doc.text('Price', priceX, doc.y - doc.currentLineHeight());
        doc.text('Amount', amountX, doc.y - doc.currentLineHeight());
        
        // Reset font
        doc.font('Helvetica');
        
        // Add horizontal line
        const lineY = doc.y + 5;
        doc.moveTo(50, lineY).lineTo(doc.page.width - 50, lineY).stroke();
        
        // Add items
        if (invoiceData.items && invoiceData.items.length) {
          invoiceData.items.forEach((item: any, i: number) => {
            // Save initial Y position
            const rowStartY = doc.y;
            
            // Item number (index)
            doc.text((i + 1).toString(), itemX, rowStartY);
            
            // Description with word wrapping - We need to handle this separately
            const descriptionHeight = doc.heightOfString(item.description, { 
              width: descriptionWidth,
              align: 'left' 
            });
            
            doc.text(item.description, descriptionX, rowStartY, { 
              width: descriptionWidth,
              align: 'left' 
            });
            
            // Other columns
            doc.text(item.quantity.toString(), quantityX, rowStartY);
            doc.text(`$${item.unitPrice.toFixed(2)}`, priceX, rowStartY);
            doc.text(`$${item.total.toFixed(2)}`, amountX, rowStartY);
            
            // Move down by the maximum height used
            doc.moveDown(Math.max(1, descriptionHeight / doc.currentLineHeight()));
            
            // Check if we need a new page
            if (doc.y > doc.page.height - 150) {
              doc.addPage();
            }
          });
        } else {
          doc.text('No items', descriptionX, doc.y);
          doc.moveDown();
        }
        
        // Add horizontal line
        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
        doc.moveDown();
        
        // Add totals
        const totalsX = amountX - 100;
        doc.text('Subtotal:', totalsX, doc.y);
        doc.text(`$${invoiceData.subtotal ? invoiceData.subtotal.toFixed(2) : '0.00'}`, amountX, doc.y - doc.currentLineHeight());
        doc.moveDown();
        
        if (invoiceData.tax) {
          doc.text('Tax:', totalsX, doc.y);
          doc.text(`$${invoiceData.tax.toFixed(2)}`, amountX, doc.y - doc.currentLineHeight());
          doc.moveDown();
        }
        
        if (invoiceData.discount) {
          doc.text('Discount:', totalsX, doc.y);
          doc.text(`$${invoiceData.discount.toFixed(2)}`, amountX, doc.y - doc.currentLineHeight());
          doc.moveDown();
        }
        
        doc.font('Helvetica-Bold');
        doc.text('TOTAL DUE:', totalsX, doc.y);
        doc.text(`$${invoiceData.total ? invoiceData.total.toFixed(2) : '0.00'}`, amountX, doc.y - doc.currentLineHeight());
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
}

// Export a singleton instance
const PDFService = new PDFServiceImpl();
export default PDFService;