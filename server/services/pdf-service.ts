import PDFDocument from "pdfkit";
import { createWriteStream } from "fs";
import * as stream from "stream";
import { storage } from "../storage";
import axios from "axios";
import path from "path";

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
  private storage: any;

  constructor(storage: any) {
    this.storage = storage;
  }

  /**
   * Download image from URL and return buffer
   */
  private async downloadImage(url: string): Promise<Buffer | null> {
    try {
      // Handle local file URLs
      if (url.startsWith('/uploads/') || url.startsWith('./uploads/')) {
        const fs = await import('fs');
        const filePath = url.startsWith('./') ? url : `.${url}`;
        if (fs.existsSync(filePath)) {
          return fs.readFileSync(filePath);
        }
        return null;
      }
      
      // Handle remote URLs
      if (url.startsWith('http')) {
        const response = await axios.get(url, { 
          responseType: 'arraybuffer',
          timeout: 5000 
        });
        return Buffer.from(response.data);
      }
      
      return null;
    } catch (error) {
      console.error('Error downloading image:', error);
      return null;
    }
  }

  /**
   * Add company header to PDF document
   */
  private async addCompanyHeader(doc: any, docType: string): Promise<void> {
    try {
      const companySettings = await storage.getCompanySettings();
      
      if (companySettings) {
        const currentY = doc.y;
        
        // Add company logo if available
        if (companySettings.companyLogo) {
          try {
            const logoBuffer = await this.downloadImage(companySettings.companyLogo);
            if (logoBuffer) {
              // Calculate logo position (left-aligned with company info on right)
              const logoX = 50;
              const logoY = currentY;
              const logoMaxWidth = 120;
              const logoMaxHeight = 60;
              
              doc.image(logoBuffer, logoX, logoY, {
                fit: [logoMaxWidth, logoMaxHeight],
                align: 'left'
              });
              
              // Company name and info positioned to the right of logo
              const textX = logoX + logoMaxWidth + 20;
              const textWidth = doc.page.width - textX - 50;
              
              doc.fontSize(16).fillColor('#000')
                .text(companySettings.companyName, textX, logoY, { 
                  width: textWidth, 
                  align: 'left' 
                });
              
              // Company address
              if (companySettings.address || companySettings.city || companySettings.state || companySettings.zipCode) {
                let addressLine = '';
                if (companySettings.address) addressLine += companySettings.address;
                if (companySettings.city) addressLine += (addressLine ? ', ' : '') + companySettings.city;
                if (companySettings.state) addressLine += (addressLine ? ', ' : '') + companySettings.state;
                if (companySettings.zipCode) addressLine += (addressLine ? ' ' : '') + companySettings.zipCode;
                if (companySettings.country) addressLine += (addressLine ? ', ' : '') + companySettings.country;
                
                doc.fontSize(10).text(addressLine, textX, doc.y + 5, { 
                  width: textWidth, 
                  align: 'left' 
                });
              }
              
              // Contact information
              let contactLine = '';
              if (companySettings.phone) contactLine += companySettings.phone;
              if (companySettings.email) contactLine += (contactLine ? ' | ' : '') + companySettings.email;
              if (companySettings.website) contactLine += (contactLine ? ' | ' : '') + companySettings.website;
              
              if (contactLine) {
                doc.fontSize(10).text(contactLine, textX, doc.y + 3, { 
                  width: textWidth, 
                  align: 'left' 
                });
              }
              
              // Move to below the logo/text area
              doc.y = Math.max(doc.y + 10, logoY + logoMaxHeight + 10);
            } else {
              // Fallback to text-only header if logo fails
              await this.addTextOnlyHeader(doc, companySettings);
            }
          } catch (error) {
            console.error('Error adding logo to PDF:', error);
            // Fallback to text-only header if logo fails
            await this.addTextOnlyHeader(doc, companySettings);
          }
        } else {
          // No logo, use centered text layout
          await this.addTextOnlyHeader(doc, companySettings);
        }
        
        // Add separator line
        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
        doc.moveDown(0.5);
      }
      
      // Document type header
      doc.fontSize(20).fillColor('#000').text(docType, { align: 'center' });
      doc.moveDown();
      
    } catch (error) {
      console.error('Error fetching company settings for PDF:', error);
      // Fallback to just document type if company settings fetch fails
      doc.fontSize(20).fillColor('#000').text(docType, { align: 'center' });
      doc.moveDown();
    }
  }

  /**
   * Add text-only header (fallback when no logo)
   */
  private async addTextOnlyHeader(doc: any, companySettings: any): Promise<void> {
    // Company name at the top
    doc.fontSize(16).fillColor('#000').text(companySettings.companyName, { align: 'center' });
    
    // Company address and contact info centered
    if (companySettings.address || companySettings.city || companySettings.state || companySettings.zipCode) {
      let addressLine = '';
      if (companySettings.address) addressLine += companySettings.address;
      if (companySettings.city) addressLine += (addressLine ? ', ' : '') + companySettings.city;
      if (companySettings.state) addressLine += (addressLine ? ', ' : '') + companySettings.state;
      if (companySettings.zipCode) addressLine += (addressLine ? ' ' : '') + companySettings.zipCode;
      if (companySettings.country) addressLine += (addressLine ? ', ' : '') + companySettings.country;
      
      doc.fontSize(10).text(addressLine, { align: 'center' });
    }
    
    // Contact information
    let contactLine = '';
    if (companySettings.phone) contactLine += companySettings.phone;
    if (companySettings.email) contactLine += (contactLine ? ' | ' : '') + companySettings.email;
    if (companySettings.website) contactLine += (contactLine ? ' | ' : '') + companySettings.website;
    
    if (contactLine) {
      doc.fontSize(10).text(contactLine, { align: 'center' });
    }
    
    doc.moveDown(0.5);
  }
  /**
   * Generate a PDF for a quote
   * @param quoteData The quote data including related items, customer, and project
   * @returns Buffer containing the PDF
   */
  async generateQuotePDF(quoteData: any): Promise<Buffer> {
    console.log("PDF table layout patch loaded - Quote generation starting");
    return new Promise(async (resolve, reject) => {
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
        
        // Add company header with company information
        await this.addCompanyHeader(doc, 'QUOTE');
        
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
        
        // Add company terms & conditions from settings
        try {
          const { storage } = await import('../storage');
          const companySettings = await storage.getCompanySettings();
          if (companySettings?.termsAndConditions) {
            doc.moveDown(2);
            
            // Professional terms section styling
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#2563eb')
               .text('Terms & Conditions', 50, doc.y);
            doc.moveDown(0.5);
            
            // Terms content with proper formatting
            doc.fontSize(9).font('Helvetica').fillColor('#374151')
               .text(companySettings.termsAndConditions, 50, doc.y, { 
                 width: maxWidth, 
                 lineGap: 2 
               });
          }
        } catch (error) {
          console.error('Error loading company settings for PDF:', error);
          // Continue without terms if there's an error
        }
        
        // Add notes if provided
        if (quoteData.notes) {
          doc.moveDown(1.5);
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151')
             .text('Additional Notes:', 50, doc.y);
          doc.moveDown(0.3);
          doc.fontSize(9).font('Helvetica')
             .text(quoteData.notes, 50, doc.y, { width: maxWidth });
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
   * Generate a PDF for an invoice with identical styling to quote PDF
   * @param invoiceData The invoice data including related items, customer, and project
   * @param useTestData Whether to use test data for development/debugging
   * @returns Buffer containing the PDF
   */
  async generateInvoicePDF(invoiceData: any, useTestData = false): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log("PDF table layout patch loaded - Invoice generation starting");
        
        // Create a PDF document with identical settings to quote
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
        
        // Add company header with company information
        await this.addCompanyHeader(doc, 'INVOICE');
        
        // Add invoice information using professional formatting
        doc.fontSize(10).font('Helvetica').fillColor('#000000');
        doc.text(`Invoice Number: ${invoiceData.invoiceNumber}`, 50, doc.y);
        doc.text(`Issue Date: ${invoiceData.issueDate}`, 50, doc.y);
        doc.text(`Due Date: ${invoiceData.dueDate}`, 50, doc.y);
        doc.moveDown(1);
        
        // Customer information section with professional styling
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#374151')
           .text('BILL TO:', 50, doc.y);
        doc.moveDown(0.5);
        
        doc.fontSize(10).font('Helvetica').fillColor('#000000');
        doc.text(`Name: ${invoiceData.customerName || 'N/A'}`, 50, doc.y);
        doc.text(`Email: ${invoiceData.customerEmail || 'N/A'}`, 50, doc.y);
        if (invoiceData.customerPhone) doc.text(`Phone: ${invoiceData.customerPhone}`, 50, doc.y);
        if (invoiceData.customerAddress) doc.text(`Address: ${invoiceData.customerAddress}`, 50, doc.y);
        doc.moveDown(1);
        
        // Project information section
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#374151')
           .text('PROJECT INFORMATION', 50, doc.y);
        doc.moveDown(0.5);
        
        doc.fontSize(10).font('Helvetica').fillColor('#000000');
        doc.text(`Project: ${invoiceData.projectName || 'N/A'}`, 50, doc.y);
        if (invoiceData.projectDescription) {
          doc.text(`Description: ${invoiceData.projectDescription}`, 50, doc.y, { width: maxWidth });
        }
        doc.moveDown(0.5);
        
        // Related quote information if available
        if (invoiceData.quoteId) {
          doc.text(`Related Quote: ${invoiceData.quoteId}`, 50, doc.y);
          doc.moveDown(1);
        } else {
          doc.moveDown(0.5);
        }
        
        // Items table with professional styling matching quote exactly
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#374151')
           .text('ITEMS', 50, doc.y);
        doc.moveDown(0.8);
        
        // Professional table header using exact quote formatting
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
        
        // Use exact same column positions as quote for consistency
        const descriptionX = 50;
        const quantityX = COLS.qty;
        const priceX = COLS.price;  
        const amountX = COLS.amt;
        
        // Table header
        doc.text('Description', descriptionX, doc.y);
        doc.text('Qty', quantityX, doc.y - doc.currentLineHeight(), { width: 50, align: 'center' });
        doc.text('Price', priceX, doc.y - doc.currentLineHeight(), { width: 50, align: 'right' });
        doc.text('Amount', amountX, doc.y - doc.currentLineHeight(), { width: 50, align: 'right' });
        
        doc.moveDown(0.8);
        
        // Reset font for items
        doc.fontSize(10).font('Helvetica').fillColor('#000000');
        
        // Items section with clean layout matching quote format
        if (invoiceData.items && invoiceData.items.length) {
          invoiceData.items.forEach(({ description, quantity, unitPrice, total }: any, i: number) => {
            const yStart = doc.y;
            
            // Description with proper wrapping using quote format
            doc.text(wrapLongWords(description || ''), descriptionX, yStart, { 
              width: DESC_WIDTH,
              continued: false 
            });
            
            const descHeight = doc.y - yStart;
            const centerY = yStart + (descHeight / 2) - 6;
            
            // Align other columns to center of description
            doc.text(String(quantity), quantityX, centerY, { width: 50, align: 'center' });
            doc.text(formatMoney(unitPrice || 0), priceX, centerY, { width: 50, align: 'right' });
            doc.text(formatMoney(total || 0), amountX, centerY, { width: 50, align: 'right' });
            
            // Move to next row with proper spacing
            doc.y = yStart + Math.max(descHeight, 20) + ROW_GAP;
            
            // Check for new page
            if (doc.y > doc.page.height - 150) {
              doc.addPage();
            }
          });
        } else {
          doc.text('No items', descriptionX, doc.y);
          doc.moveDown();
        }
        
        doc.moveDown(1.5);
        
        // Totals section with perfect right-alignment using same method as quote
        doc.fontSize(10).font('Helvetica').fillColor('#000000');
        
        // Perfect right-aligned totals with consistent column positioning
        const startY = doc.y;
        const labelX = 420;  // Label position
        const valueX = 500;  // Value position
        const valueWidth = 50; // Value column width
        const lineHeight = 12;
        
        let rowY = startY;
        
        // Subtotal - explicitly control positioning
        doc.text('Subtotal:', labelX, rowY);
        doc.text(formatMoney(invoiceData.subtotal || 0), valueX, rowY, { width: valueWidth, align: 'right' });
        rowY += lineHeight;
        
        // Tax (only if exists and > 0)
        if (invoiceData.tax && invoiceData.tax > 0) {
          doc.text('Tax:', labelX, rowY);
          doc.text(formatMoney(invoiceData.tax), valueX, rowY, { width: valueWidth, align: 'right' });
          rowY += lineHeight;
        }
        
        // Discount (only if exists and > 0)
        if (invoiceData.discount && invoiceData.discount > 0) {
          doc.text('Discount:', labelX, rowY);
          doc.text(formatMoney(invoiceData.discount), valueX, rowY, { width: valueWidth, align: 'right' });
          rowY += lineHeight;
        }
        
        // Total with emphasis - ensure single line
        rowY += 3;
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000');
        
        // Write both label and value on exact same Y coordinate
        const totalY = rowY;
        doc.text('TOTAL DUE:', labelX, totalY);
        doc.text(formatMoney(invoiceData.total || 0), valueX, totalY, { width: valueWidth, align: 'right' });
        
        // Explicitly set doc.y to continue after this section
        doc.y = totalY + 20;
        
        // Set doc.y to continue below totals
        doc.y = currentY + 30;
        
        // Add bank payment details section
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#2563eb')
           .text('PAYMENT INSTRUCTIONS', 50, doc.y);
        doc.moveDown(0.5);
        
        doc.fontSize(10).font('Helvetica').fillColor('#374151');
        doc.text('Please reference invoice number when making payment.', 50, doc.y, { width: maxWidth });
        doc.moveDown(0.5);
        
        // Bank details section
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
           .text('Bank Transfer Details:', 50, doc.y);
        doc.moveDown(0.3);
        
        doc.fontSize(10).font('Helvetica').fillColor('#000000');
        
        // Get company settings for bank details
        const companySettings = await this.storage.getCompanySettings();
        
        if (companySettings?.bankAccountName) {
          doc.text(`Account Name: ${companySettings.bankAccountName}`, 50, doc.y);
        }
        if (companySettings?.bankSortCode) {
          doc.text(`Sort Code: ${companySettings.bankSortCode}`, 50, doc.y);  
        }
        if (companySettings?.bankAccountNumber) {
          doc.text(`Account Number: ${companySettings.bankAccountNumber}`, 50, doc.y);
        }
        if (companySettings?.bankName) {
          doc.text(`Bank: ${companySettings.bankName}`, 50, doc.y);
        }
        doc.text('Reference: Please include invoice number', 50, doc.y);
        
        doc.moveDown(1.5);
        
        // Add company terms & conditions from settings
        try {
          const { storage } = await import('../storage');
          const companySettings = await storage.getCompanySettings();
          if (companySettings?.termsAndConditions) {
            // Professional terms section styling matching quote
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#2563eb')
               .text('Terms & Conditions', 50, doc.y);
            doc.moveDown(0.5);
            
            // Terms content with proper formatting
            doc.fontSize(9).font('Helvetica').fillColor('#374151')
               .text(companySettings.termsAndConditions, 50, doc.y, { 
                 width: maxWidth, 
                 lineGap: 2 
               });
          }
        } catch (error) {
          console.error('Error loading company settings for invoice PDF:', error);
        }
        
        // Add notes if provided
        if (invoiceData.notes) {
          doc.moveDown(1.5);
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151')
             .text('Additional Notes:', 50, doc.y);
          doc.moveDown(0.3);
          doc.fontSize(9).font('Helvetica')
             .text(invoiceData.notes, 50, doc.y, { width: maxWidth });
        }
        
        // Add footer with page numbers
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc.fontSize(9).font('Helvetica').fillColor('#666666');
          doc.text(
            `Page ${i + 1} of ${pageCount}`,
            50,
            doc.page.height - 50,
            { align: 'center' }
          );
          
          // Add "Thank you" message on the last page
          if (i === pageCount - 1) {
            doc.moveDown(1);
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#2563eb');
            doc.text('Thank you for your business!', 50, doc.page.height - 80, { align: 'center' });
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

// Export the class and a factory function
export { PDFServiceImpl };

// Factory function to create PDFService with storage
export function createPDFService(storage: any) {
  return new PDFServiceImpl(storage);
}

// Legacy singleton for backward compatibility - will be deprecated
let _instance: PDFServiceImpl | null = null;
export function getPDFService(storage?: any) {
  if (!_instance && storage) {
    _instance = new PDFServiceImpl(storage);
  }
  return _instance;
}

const PDFService = {
  generateQuotePDF: async (data: any) => {
    const { storage } = await import('../storage');
    const service = new PDFServiceImpl(storage);
    return service.generateQuotePDF(data);
  },
  generateInvoicePDF: async (data: any) => {
    const { storage } = await import('../storage');
    const service = new PDFServiceImpl(storage);
    return service.generateInvoicePDF(data);
  },
  generatePurchaseOrderPDF: async (data: any) => {
    const { storage } = await import('../storage');
    const service = new PDFServiceImpl(storage);
    return service.generatePurchaseOrderPDF(data);
  }
};

export default PDFService;