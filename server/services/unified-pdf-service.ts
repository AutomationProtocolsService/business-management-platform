import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import Mustache from 'mustache';

class UnifiedPdfService {
  private browser: any = null;

  /**
   * Initialize Puppeteer browser
   */
  private async getBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  /**
   * Generate unified PDF using Mustache template
   */
  private async generateUnifiedPDF(templateData: any): Promise<Buffer> {
    try {
      console.log('Loading unified document template...');
      // Load the unified document template
      const templatePath = path.join(process.cwd(), 'server', 'templates', 'document.html');
      const template = await fs.readFile(templatePath, 'utf-8');
      
      console.log('Rendering template with Mustache...');
      // Render the template with Mustache
      const html = Mustache.render(template, templateData);
      
      // DEBUG: Log the final HTML for inspection
      console.log('FINAL_HTML:', html);
      
      console.log('Starting Puppeteer PDF conversion...');
      // Convert to PDF with timeout and error handling
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      
      // Set viewport and wait for content to load
      await page.setViewport({ width: 1200, height: 1600 });
      await page.setContent(html, { waitUntil: 'networkidle2', timeout: 30000 });
      
      console.log('Generating PDF...');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: false,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });
      
      await page.close();
      console.log(`PDF generated successfully, size: ${pdfBuffer.length} bytes`);
      return Buffer.from(pdfBuffer);
      
    } catch (error) {
      console.error('Error generating unified PDF:', error);
      // Fallback to returning the HTML for debugging if PDF generation fails
      const templatePath = path.join(process.cwd(), 'server', 'templates', 'document.html');
      const template = await fs.readFile(templatePath, 'utf-8');
      const html = Mustache.render(template, templateData);
      throw new Error(`PDF generation failed: ${error.message}. HTML content: ${html.substring(0, 500)}...`);
    }
  }

  /**
   * Generate quote PDF with unified template
   */
  async generateQuotePDF(quoteData: any): Promise<Buffer> {
    try {
      console.log('Generating quote PDF with unified template...');
      
      // Get company settings for branding
      const { storage } = await import('../storage');
      const companySettings = await storage.getCompanySettings();
      
      const templateData = {
        document_type: 'QUOTE',
        is_quote: true,
        is_invoice: false,
        logo_url: companySettings?.companyLogo || undefined,
        company_name: companySettings?.companyName || 'Your Company',
        address: companySettings?.address || undefined,
        city: companySettings?.city || undefined,
        state: companySettings?.state || undefined,
        zip_code: companySettings?.zipCode || undefined,
        country: companySettings?.country || undefined,
        phone: companySettings?.phone || undefined,
        email: companySettings?.email || undefined,
        number: quoteData.quoteNumber || `QUO-${Date.now()}`,
        date: quoteData.issueDate || new Date().toLocaleDateString(),
        expiry_date: quoteData.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        reference: quoteData.reference || undefined,
        project: quoteData.projectName ? {
          name: quoteData.projectName,
          description: quoteData.projectDescription || undefined
        } : undefined,
        customer: {
          name: quoteData.customerName || 'Customer Name',
          address: quoteData.customerAddress || undefined,
          city: quoteData.customerCity || undefined,
          state: quoteData.customerState || undefined,
          zip_code: quoteData.customerZipCode || undefined,
          email: quoteData.customerEmail || undefined,
          phone: quoteData.customerPhone || undefined,
        },
        items: quoteData.items?.map((item: any) => ({
          description: item.description || 'Item description',
          quantity: item.quantity || 1,
          unit_price: `$${(item.unitPrice || 0).toFixed(2)}`,
          total: `$${(item.total || 0).toFixed(2)}`
        })) || [],
        subtotal: `$${(quoteData.subtotal || 0).toFixed(2)}`,
        tax: quoteData.tax ? `$${quoteData.tax.toFixed(2)}` : undefined,
        hasDiscount: quoteData.discount && quoteData.discount > 0,
        discount: quoteData.discount ? `-$${quoteData.discount.toFixed(2)}` : undefined,
        total: `$${(quoteData.total || 0).toFixed(2)}`,
        terms: companySettings?.termsAndConditions || undefined
      };

      return await this.generateUnifiedPDF(templateData);
      
    } catch (error) {
      console.error('Error in unified quote PDF generation:', error);
      throw error;
    }
  }

  /**
   * Generate invoice PDF with unified template
   */
  async generateInvoicePDF(invoiceData: any): Promise<Buffer> {
    try {
      console.log('Generating invoice PDF with unified template...');
      
      // Get company settings for branding
      const { storage } = await import('../storage');
      const companySettings = await storage.getCompanySettings();
      
      const templateData = {
        document_type: 'INVOICE',
        is_quote: false,
        is_invoice: true,
        issue_date: true,
        logo_url: companySettings?.companyLogo || undefined,
        company_name: companySettings?.companyName || 'Your Company',
        address: companySettings?.address || undefined,
        city: companySettings?.city || undefined,
        state: companySettings?.state || undefined,
        zip_code: companySettings?.zipCode || undefined,
        country: companySettings?.country || undefined,
        phone: companySettings?.phone || undefined,
        email: companySettings?.email || undefined,
        number: invoiceData.invoiceNumber || `INV-${Date.now()}`,
        date: invoiceData.issueDate || new Date().toLocaleDateString(),
        due_date: invoiceData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        reference: invoiceData.quoteId ? `${invoiceData.quoteId}` : undefined,
        project: invoiceData.projectName ? {
          name: invoiceData.projectName,
          description: invoiceData.projectDescription || undefined
        } : undefined,
        customer: {
          name: invoiceData.customerName || 'Customer Name',
          address: invoiceData.customerAddress || undefined,
          city: invoiceData.customerCity || undefined,
          state: invoiceData.customerState || undefined,
          zip_code: invoiceData.customerZipCode || undefined,
          email: invoiceData.customerEmail || undefined,
          phone: invoiceData.customerPhone || undefined,
        },
        items: invoiceData.items?.map((item: any) => ({
          description: item.description || 'Item description',
          quantity: item.quantity || 1,
          unit_price: `$${(item.unitPrice || 0).toFixed(2)}`,
          total: `$${(item.total || 0).toFixed(2)}`
        })) || [],
        subtotal: `$${(invoiceData.subtotal || 0).toFixed(2)}`,
        tax: invoiceData.tax ? `$${invoiceData.tax.toFixed(2)}` : undefined,
        hasDiscount: invoiceData.discount && invoiceData.discount > 0,
        discount: invoiceData.discount ? `-$${invoiceData.discount.toFixed(2)}` : undefined,
        total: `$${(invoiceData.total || 0).toFixed(2)}`,
        terms: companySettings?.termsAndConditions || undefined
      };

      return await this.generateUnifiedPDF(templateData);
      
    } catch (error) {
      console.error('Error in unified invoice PDF generation:', error);
      throw error;
    }
  }

  /**
   * Close browser instance
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Export singleton instance
export const unifiedPdfService = new UnifiedPdfService();

// Export individual functions for compatibility
export async function generateQuotePDF(quoteData: any): Promise<Buffer> {
  return unifiedPdfService.generateQuotePDF(quoteData);
}

export async function generateInvoicePDF(invoiceData: any): Promise<Buffer> {
  return unifiedPdfService.generateInvoicePDF(invoiceData);
}