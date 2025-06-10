import PDFDocument from "pdfkit";
import { createWriteStream } from "fs";
import * as stream from "stream";

/**
 * Helper function to break long words for better text wrapping
 */
function breakLongWords(text: string, max = 20): string {
  return text.replace(
    new RegExp(`(\\S{${max}})`, 'g'),
    '$1\u200B'  // zero-width space
  );
}

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
            
            // Description with proper word wrapping and break-word behavior
            const maxDescriptionWidth = 320; // Fixed max width to prevent overflow
            const descriptionText = item.description || '';
            
            // Calculate height needed for wrapped description
            const descriptionHeight = doc.heightOfString(descriptionText, { 
              width: maxDescriptionWidth,
              align: 'left'
            });
            
            // Render description with constrained width
            doc.text(descriptionText, descriptionX, rowStartY, { 
              width: maxDescriptionWidth,
              align: 'left'
            });
            
            // Other columns - align to top of row
            doc.text(item.quantity.toString(), quantityX, rowStartY);
            doc.text(`$${item.unitPrice.toFixed(2)}`, priceX, rowStartY);
            doc.text(`$${item.total.toFixed(2)}`, amountX, rowStartY);
            
            // Calculate row height based on description
            const rowHeight = Math.max(doc.currentLineHeight(), descriptionHeight);
            const nextY = rowStartY + rowHeight + 5; // Add padding between rows
            
            // Draw row border (equivalent to CSS border-bottom for each row except last)
            if (i < quoteData.items.length - 1) {
              doc.moveTo(itemX, nextY - 2)
                 .lineTo(amountX + amountWidth, nextY - 2)
                 .stroke();
            }
            
            // Move to next row position
            doc.y = nextY;
            
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
            
            // Description with proper word wrapping and break-word behavior
            const maxDescriptionWidth = 320; // Fixed max width to prevent overflow
            const descriptionText = item.description || '';
            
            // Calculate height needed for wrapped description
            const descriptionHeight = doc.heightOfString(descriptionText, { 
              width: maxDescriptionWidth,
              align: 'left'
            });
            
            // Render description with constrained width
            doc.text(descriptionText, descriptionX, rowStartY, { 
              width: maxDescriptionWidth,
              align: 'left'
            });
            
            // Other columns - align to top of row
            doc.text(item.quantity.toString(), quantityX, rowStartY);
            doc.text(`$${item.unitPrice.toFixed(2)}`, priceX, rowStartY);
            doc.text(`$${item.total.toFixed(2)}`, amountX, rowStartY);
            
            // Calculate row height based on description
            const rowHeight = Math.max(doc.currentLineHeight(), descriptionHeight);
            const nextY = rowStartY + rowHeight + 5; // Add padding between rows
            
            // Draw row border (equivalent to CSS border-bottom for each row except last)
            if (i < invoiceData.items.length - 1) {
              doc.moveTo(itemX, nextY - 2)
                 .lineTo(amountX + amountWidth, nextY - 2)
                 .stroke();
            }
            
            // Move to next row position
            doc.y = nextY;
            
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
          
          // Add each item
          purchaseOrderData.items.forEach((item: any) => {
            const itemY = doc.y;
            const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
            subtotal += itemTotal;
            
            // Wrap description text if too long
            const descriptionLines = doc.heightOfString(item.description || 'No description', { width: 240 });
            if (descriptionLines > 20) {
              doc.text(item.description || 'No description', 50, itemY, { width: 240 });
            } else {
              doc.text(item.description || 'No description', 50, itemY);
            }
            
            doc.text((item.quantity || 0).toString(), 300, itemY);
            doc.text(`$${(item.unitPrice || 0).toFixed(2)}`, 350, itemY);
            doc.text(`$${itemTotal.toFixed(2)}`, 450, itemY);
            
            doc.moveDown();
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