import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

interface TemplateData {
  document_type: string;
  logo_url?: string;
  company_name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  number: string;
  date: string;
  expiry_date?: string;
  reference?: string;
  customer: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    email?: string;
    phone?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit_price: string;
    total: string;
  }>;
  subtotal: string;
  tax?: string;
  discount?: string;
  total: string;
  currency_symbol: string;
  terms?: string;
}

export class HtmlPdfService {
  private templateCache = new Map<string, string>();

  /**
   * Load and cache HTML template
   */
  private async loadTemplate(templateName: string): Promise<string> {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    const templatePath = path.join(process.cwd(), 'server', 'templates', `${templateName}.html`);
    const template = await fs.readFile(templatePath, 'utf-8');
    this.templateCache.set(templateName, template);
    return template;
  }

  /**
   * Simple mustache-style template rendering
   */
  private renderTemplate(template: string, data: any): string {
    let rendered = template;

    // Handle regular variables {{variable}}
    rendered = rendered.replace(/\{\{([^{}#\/]+)\}\}/g, (match, key) => {
      const value = this.getNestedValue(data, key.trim());
      return value !== undefined && value !== null ? String(value) : '';
    });

    // Handle conditional blocks {{#variable}}...{{/variable}}
    rendered = rendered.replace(/\{\{#([^{}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
      const value = this.getNestedValue(data, key.trim());
      if (value && (Array.isArray(value) ? value.length > 0 : true)) {
        if (Array.isArray(value)) {
          return value.map(item => this.renderTemplate(content, item)).join('');
        }
        return this.renderTemplate(content, data);
      }
      return '';
    });

    return rendered;
  }

  /**
   * Get nested object value by dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Format currency value
   */
  private formatCurrency(value: number, currencySymbol: string = '$'): string {
    return value.toFixed(2);
  }

  /**
   * Generate professional quote PDF
   */
  async generateQuotePDF(quoteData: any, companySettings: any): Promise<Buffer> {
    try {
      console.log('Starting quote PDF generation...');
      const template = await this.loadTemplate('quote-template');

      // Prepare template data
      const templateData: TemplateData = {
        document_type: 'QUOTE',
        logo_url: companySettings?.companyLogo ? `file://${path.resolve(companySettings.companyLogo.replace('./', ''))}` : undefined,
        company_name: companySettings?.companyName || 'Company Name',
        address: companySettings?.address,
        city: companySettings?.city,
        state: companySettings?.state,
        zip_code: companySettings?.zipCode,
        country: companySettings?.country,
        phone: companySettings?.phone,
        email: companySettings?.email,
        number: quoteData.quoteNumber,
        date: new Date(quoteData.issueDate || quoteData.createdAt).toLocaleDateString(),
        expiry_date: quoteData.expiryDate ? new Date(quoteData.expiryDate).toLocaleDateString() : undefined,
        reference: quoteData.reference,
        customer: {
          name: quoteData.customer?.name || 'Customer Name',
          address: quoteData.customer?.address,
          city: quoteData.customer?.city,
          state: quoteData.customer?.state,
          zip_code: quoteData.customer?.zipCode,
          email: quoteData.customer?.email,
          phone: quoteData.customer?.phone,
        },
        items: (quoteData.quoteItems || []).map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: this.formatCurrency(item.unitPrice),
          total: this.formatCurrency(item.total),
        })),
        subtotal: this.formatCurrency(quoteData.subtotal || 0),
        tax: quoteData.tax ? this.formatCurrency(quoteData.tax) : undefined,
        discount: quoteData.discount ? this.formatCurrency(quoteData.discount) : undefined,
        total: this.formatCurrency(quoteData.total || 0),
        currency_symbol: companySettings?.currencySymbol || '$',
        terms: companySettings?.termsAndConditions,
      };

      console.log('Template data prepared, rendering HTML...');
      const html = this.renderTemplate(template, templateData);
      console.log('HTML rendered, launching Puppeteer...');

      // Generate PDF with Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      try {
        const page = await browser.newPage();
        console.log('Setting HTML content...');
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        console.log('Generating PDF...');
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '0.5in',
            right: '0.5in',
            bottom: '0.5in',
            left: '0.5in'
          }
        });

        console.log('PDF generated successfully, size:', pdf.length, 'bytes');
        return pdf;
      } finally {
        await browser.close();
      }
    } catch (error) {
      console.error('Error in generateQuotePDF:', error);
      throw error;
    }
  }

  /**
   * Generate professional invoice PDF
   */
  async generateInvoicePDF(invoiceData: any, companySettings: any): Promise<Buffer> {
    const template = await this.loadTemplate('quote-template');

    // Prepare template data (similar to quote but with invoice-specific fields)
    const templateData: TemplateData = {
      document_type: 'INVOICE',
      logo_url: companySettings?.companyLogo ? `file://${path.resolve(companySettings.companyLogo.replace('./', ''))}` : undefined,
      company_name: companySettings?.companyName || 'Company Name',
      address: companySettings?.address,
      city: companySettings?.city,
      state: companySettings?.state,
      zip_code: companySettings?.zipCode,
      country: companySettings?.country,
      phone: companySettings?.phone,
      email: companySettings?.email,
      number: invoiceData.invoiceNumber,
      date: new Date(invoiceData.issueDate || invoiceData.createdAt).toLocaleDateString(),
      reference: invoiceData.reference,
      customer: {
        name: invoiceData.customer?.name || 'Customer Name',
        address: invoiceData.customer?.address,
        city: invoiceData.customer?.city,
        state: invoiceData.customer?.state,
        zip_code: invoiceData.customer?.zipCode,
        email: invoiceData.customer?.email,
        phone: invoiceData.customer?.phone,
      },
      items: (invoiceData.invoiceItems || []).map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: this.formatCurrency(item.unitPrice),
        total: this.formatCurrency(item.total),
      })),
      subtotal: this.formatCurrency(invoiceData.subtotal || 0),
      tax: invoiceData.tax ? this.formatCurrency(invoiceData.tax) : undefined,
      discount: invoiceData.discount ? this.formatCurrency(invoiceData.discount) : undefined,
      total: this.formatCurrency(invoiceData.total || 0),
      currency_symbol: companySettings?.currencySymbol || '$',
      terms: companySettings?.termsAndConditions,
    };

    const html = this.renderTemplate(template, templateData);

    // Generate PDF with Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        }
      });

      return pdf;
    } finally {
      await browser.close();
    }
  }
}