import { Express, Request, Response } from 'express';
import PDFService from '../services/pdf-service';
import EmailService from '../services/unified-email-service';
import { storage } from '../storage';

// Import authentication middleware from main routes
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Helper function to get tenant ID from request
const getTenantIdFromRequest = (req: Request): number | undefined => {
  return (req as any).tenantId;
};

/**
 * Register document-related API routes
 * @param app Express application
 */
export const registerDocumentRoutes = (app: Express) => {

  // Generate and download Quote PDF
  app.get('/api/quotes/:id/pdf', requireAuth, async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      
      // Add cache-busting headers to prevent browser caching
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      
      console.log(`[PDF Route] Starting PDF generation for quote ID: ${quoteId}`);
      
      // Fetch the quote with tenant filtering
      // Get the tenant ID from the tenant filter middleware
      const tenantFilter = req.tenantFilter ? { tenantId: req.tenantFilter.tenantId } : undefined;
      const quote = await storage.getQuote(quoteId, tenantFilter);
      
      if (!quote) {
        console.log(`[PDF Route] Quote not found with ID: ${quoteId}`);
        return res.status(404).json({ message: 'Quote not found' });
      }
      
      // Check if user has access to this resource (double-checking)
      if (req.isTenantResource && !req.isTenantResource(quote.tenantId)) {
        console.log(`[PDF Route] Access denied for user to Quote ID: ${quoteId}`);
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Log basic quote info
      console.log(`[PDF Route] Quote found:`);
      console.log(`  - ID: ${quote.id}`);
      console.log(`  - Number: ${quote.quoteNumber}`);
      console.log(`  - Customer ID: ${quote.customerId}`);
      console.log(`  - Project ID: ${quote.projectId}`);
      
      // Get quote items
      const quoteItems = await storage.getQuoteItemsByQuote(quoteId);
      console.log(`[PDF Route] Found ${quoteItems.length} quote items`);
      
      // Get customer and project information for the PDF - using explicit approach
      let customer = null;
      let project = null;
      
      // Fetch customer if we have a customer ID, using tenant filtering
      if (quote.customerId) {
        try {
          console.log(`[PDF Route] Fetching customer with ID: ${quote.customerId}`);
          const tenantFilter = req.tenantFilter ? { tenantId: req.tenantFilter.tenantId } : undefined;
          customer = await storage.getCustomer(quote.customerId, tenantFilter);
          if (customer) {
            console.log(`[PDF Route] Customer found: ${customer.name} (ID: ${customer.id})`);
          } else {
            console.log(`[PDF Route] No customer found with ID: ${quote.customerId}`);
          }
        } catch (err) {
          console.error(`[PDF Route] Error fetching customer:`, err);
        }
      } else {
        console.log(`[PDF Route] No customer ID on quote`);
      }
      
      // Fetch project if we have a project ID, using tenant filtering
      if (quote.projectId) {
        try {
          console.log(`[PDF Route] Fetching project with ID: ${quote.projectId}`);
          const tenantFilter = req.tenantFilter ? { tenantId: req.tenantFilter.tenantId } : undefined;
          project = await storage.getProject(quote.projectId, tenantFilter);
          if (project) {
            console.log(`[PDF Route] Project found: ${project.name} (ID: ${project.id})`);
          } else {
            console.log(`[PDF Route] No project found with ID: ${quote.projectId}`);
          }
        } catch (err) {
          console.error(`[PDF Route] Error fetching project:`, err);
        }
      } else {
        console.log(`[PDF Route] No project ID on quote`);
      }
      
      // Create a properly structured combined object 
      const completeQuoteData = {
        ...quote,
        items: quoteItems,
        customer: customer, // Explicitly assign customer
        project: project    // Explicitly assign project
      };
      
      // Log the final data structure we're passing to the PDF generator
      console.log('[PDF Route] Final data for PDF generation:');
      console.log(`  - Quote number: ${completeQuoteData.quoteNumber}`);
      console.log(`  - Items count: ${completeQuoteData.items.length}`);
      console.log(`  - Has customer: ${completeQuoteData.customer !== null}`);
      console.log(`  - Has project: ${completeQuoteData.project !== null}`);
      
      // Generate PDF using the PDFService with all related data
      const pdfBuffer = await PDFService.generateQuotePDF(completeQuoteData);
      
      // Set appropriate headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Quote_${quote.quoteNumber}.pdf`);
      
      // Send the PDF buffer to the client
      console.log(`[PDF Route] PDF generated successfully, sending to client`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('[PDF Route] Error generating quote PDF:', error);
      res.status(500).json({ message: 'Failed to generate PDF' });
    }
  });
  
  // Email Quote PDF
  app.post('/api/quotes/:id/email', requireAuth, async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const { recipientEmail, subject, message, includePdf } = req.body;
      
      console.log(`[Email Route] Starting email process for quote ID: ${quoteId}`);
      console.log(`[Email Route] Recipient: ${recipientEmail}`);
      
      if (!recipientEmail) {
        console.log(`[Email Route] Error: Recipient email is required`);
        return res.status(400).json({ message: 'Recipient email is required' });
      }
      
      // Get quote with items - using tenant filtering
      const tenantFilter = req.tenantFilter ? { tenantId: req.tenantFilter.tenantId } : undefined;
      const quote = await storage.getQuote(quoteId, tenantFilter);
      if (!quote) {
        console.log(`[Email Route] Error: Quote not found with ID: ${quoteId}`);
        return res.status(404).json({ message: 'Quote not found' });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(quote.tenantId)) {
        console.log(`[Email Route] Error: Access denied for user to Quote ID: ${quoteId}`);
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const quoteItems = await storage.getQuoteItemsByQuote(quote.id);
      console.log(`[Email Route] Found ${quoteItems.length} quote items`);
      
      // Get customer and project information for the email - using explicit approach
      let customer = null;
      let project = null;
      
      // Fetch customer if we have a customer ID
      if (quote.customerId) {
        try {
          console.log(`[Email Route] Fetching customer with ID: ${quote.customerId}`);
          const tenantFilter = req.tenantFilter ? { tenantId: req.tenantFilter.tenantId } : undefined;
          customer = await storage.getCustomer(quote.customerId, tenantFilter);
          if (customer) {
            console.log(`[Email Route] Customer found: ${customer.name} (ID: ${customer.id})`);
          } else {
            console.log(`[Email Route] No customer found with ID: ${quote.customerId}`);
          }
        } catch (err) {
          console.error(`[Email Route] Error fetching customer:`, err);
        }
      } else {
        console.log(`[Email Route] No customer ID on quote`);
      }
      
      // Fetch project if we have a project ID
      if (quote.projectId) {
        try {
          console.log(`[Email Route] Fetching project with ID: ${quote.projectId}`);
          const tenantFilter = req.tenantFilter ? { tenantId: req.tenantFilter.tenantId } : undefined;
          project = await storage.getProject(quote.projectId, tenantFilter);
          if (project) {
            console.log(`[Email Route] Project found: ${project.name} (ID: ${project.id})`);
          } else {
            console.log(`[Email Route] No project found with ID: ${quote.projectId}`);
          }
        } catch (err) {
          console.error(`[Email Route] Error fetching project:`, err);
        }
      } else {
        console.log(`[Email Route] No project ID on quote`);
      }
      
      // Get company settings for sender email
      const companySettings = await storage.getCompanySettings();
      const senderEmail = companySettings?.email || 'noreply@example.com';
      
      // Create a properly structured combined object for the email service
      const completeQuoteData = {
        ...quote,
        items: quoteItems,
        customer: customer, // Explicitly assign customer
        project: project    // Explicitly assign project
      };
      
      console.log(`[Email Route] Preparing to send email with quote ${quote.quoteNumber}`);
      console.log(`[Email Route] Has customer data: ${completeQuoteData.customer !== null}`);
      console.log(`[Email Route] Has project data: ${completeQuoteData.project !== null}`);
      console.log(`[Email Route] Items count: ${completeQuoteData.items.length}`);
      
      // Send email with PDF and optional customizations
      const success = await EmailService.sendQuote(
        completeQuoteData,
        recipientEmail,
        senderEmail,
        {
          subject,
          message,
          includePdf: includePdf !== false
        }
      );
      
      if (success) {
        console.log(`[Email Route] Email sent successfully to ${recipientEmail}`);
        res.json({ message: 'Quote sent successfully via email' });
      } else {
        console.log(`[Email Route] Failed to send email to ${recipientEmail}`);
        res.status(500).json({ message: 'Failed to send quote via email' });
      }
    } catch (error) {
      console.error('[Email Route] Error emailing quote:', error);
      res.status(500).json({ message: 'Failed to send quote via email' });
    }
  });
  
  // Generate and download Invoice PDF
  app.get('/api/invoices/:id/pdf', requireAuth, async (req, res) => {
    try {
      const invoiceId = Number(req.params.id);
      
      // Add cache-busting headers to prevent browser caching
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      
      console.log(`[PDF Route] Starting PDF generation for invoice ID: ${invoiceId}`);
      
      // Fetch the invoice - using tenant filtering
      const tenantFilter = req.tenantFilter ? { tenantId: req.tenantFilter.tenantId } : undefined;
      const invoice = await storage.getInvoice(invoiceId, tenantFilter);
      
      if (!invoice) {
        console.log(`[PDF Route] Invoice not found with ID: ${invoiceId}`);
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(invoice.tenantId)) {
        console.log(`[PDF Route] Access denied for user to Invoice ID: ${invoiceId}`);
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Log basic invoice info
      console.log(`[PDF Route] Invoice found:`);
      console.log(`  - ID: ${invoice.id}`);
      console.log(`  - Number: ${invoice.invoiceNumber}`);
      console.log(`  - Customer ID: ${invoice.customerId}`);
      console.log(`  - Project ID: ${invoice.projectId}`);
      
      // Get invoice items
      const invoiceItems = await storage.getInvoiceItemsByInvoice(invoiceId);
      console.log(`[PDF Route] Found ${invoiceItems.length} invoice items`);
      
      // Get customer and project information for the PDF - using explicit approach
      let customer = null;
      let project = null;
      
      // Fetch customer if we have a customer ID
      if (invoice.customerId) {
        try {
          console.log(`[PDF Route] Fetching customer with ID: ${invoice.customerId}`);
          const tenantFilter = req.tenantFilter ? { tenantId: req.tenantFilter.tenantId } : undefined;
          customer = await storage.getCustomer(invoice.customerId, tenantFilter);
          if (customer) {
            console.log(`[PDF Route] Customer found: ${customer.name} (ID: ${customer.id})`);
          } else {
            console.log(`[PDF Route] No customer found with ID: ${invoice.customerId}`);
          }
        } catch (err) {
          console.error(`[PDF Route] Error fetching customer:`, err);
        }
      } else {
        console.log(`[PDF Route] No customer ID on invoice`);
      }
      
      // Fetch project if we have a project ID
      if (invoice.projectId) {
        try {
          console.log(`[PDF Route] Fetching project with ID: ${invoice.projectId}`);
          const tenantFilter = req.tenantFilter ? { tenantId: req.tenantFilter.tenantId } : undefined;
          project = await storage.getProject(invoice.projectId, tenantFilter);
          if (project) {
            console.log(`[PDF Route] Project found: ${project.name} (ID: ${project.id})`);
          } else {
            console.log(`[PDF Route] No project found with ID: ${invoice.projectId}`);
          }
        } catch (err) {
          console.error(`[PDF Route] Error fetching project:`, err);
        }
      } else {
        console.log(`[PDF Route] No project ID on invoice`);
      }
      
      // Create a properly structured combined object 
      const completeInvoiceData = {
        ...invoice,
        items: invoiceItems,
        customer: customer, // Explicitly assign customer
        project: project    // Explicitly assign project
      };
      
      // Log the final data structure we're passing to the PDF generator
      console.log('[PDF Route] Final data for PDF generation:');
      console.log(`  - Invoice number: ${completeInvoiceData.invoiceNumber}`);
      console.log(`  - Items count: ${completeInvoiceData.items.length}`);
      console.log(`  - Has customer: ${completeInvoiceData.customer !== null}`);
      console.log(`  - Has project: ${completeInvoiceData.project !== null}`);
      
      // Generate PDF using the PDFService with all related data
      const pdfBuffer = await PDFService.generateInvoicePDF(completeInvoiceData);
      
      // Set appropriate headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Invoice_${invoice.invoiceNumber}.pdf`);
      
      // Send the PDF buffer to the client
      console.log(`[PDF Route] PDF generated successfully, sending to client`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('[PDF Route] Error generating invoice PDF:', error);
      res.status(500).json({ message: 'Failed to generate PDF' });
    }
  });
  
  // Email Invoice PDF
  app.post('/api/invoices/:id/email', requireAuth, async (req, res) => {
    try {
      const invoiceId = Number(req.params.id);
      const { recipientEmail, subject, message, includePdf } = req.body;
      
      console.log(`[Email Route] Starting email process for invoice ID: ${invoiceId}`);
      console.log(`[Email Route] Recipient: ${recipientEmail}`);
      
      if (!recipientEmail) {
        console.log(`[Email Route] Error: Recipient email is required`);
        return res.status(400).json({ message: 'Recipient email is required' });
      }
      
      // Get invoice with items - using tenant filtering
      const tenantFilter = req.tenantFilter ? { tenantId: req.tenantFilter.tenantId } : undefined;
      const invoice = await storage.getInvoice(invoiceId, tenantFilter);
      if (!invoice) {
        console.log(`[Email Route] Error: Invoice not found with ID: ${invoiceId}`);
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(invoice.tenantId)) {
        console.log(`[Email Route] Error: Access denied for user to Invoice ID: ${invoiceId}`);
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const invoiceItems = await storage.getInvoiceItemsByInvoice(invoice.id);
      console.log(`[Email Route] Found ${invoiceItems.length} invoice items`);
      
      // Get customer and project information for the email - using explicit approach
      let customer = null;
      let project = null;
      
      // Fetch customer if we have a customer ID - using tenant filtering
      if (invoice.customerId) {
        try {
          console.log(`[Email Route] Fetching customer with ID: ${invoice.customerId}`);
          const tenantFilter = req.tenantFilter ? { tenantId: req.tenantFilter.tenantId } : undefined;
          customer = await storage.getCustomer(invoice.customerId, tenantFilter);
          if (customer) {
            console.log(`[Email Route] Customer found: ${customer.name} (ID: ${customer.id})`);
          } else {
            console.log(`[Email Route] No customer found with ID: ${invoice.customerId}`);
          }
        } catch (err) {
          console.error(`[Email Route] Error fetching customer:`, err);
        }
      } else {
        console.log(`[Email Route] No customer ID on invoice`);
      }
      
      // Fetch project if we have a project ID - using tenant filtering
      if (invoice.projectId) {
        try {
          console.log(`[Email Route] Fetching project with ID: ${invoice.projectId}`);
          const tenantFilter = req.tenantFilter ? { tenantId: req.tenantFilter.tenantId } : undefined;
          project = await storage.getProject(invoice.projectId, tenantFilter);
          if (project) {
            console.log(`[Email Route] Project found: ${project.name} (ID: ${project.id})`);
          } else {
            console.log(`[Email Route] No project found with ID: ${invoice.projectId}`);
          }
        } catch (err) {
          console.error(`[Email Route] Error fetching project:`, err);
        }
      } else {
        console.log(`[Email Route] No project ID on invoice`);
      }
      
      // Get company settings for sender email
      const companySettings = await storage.getCompanySettings();
      const senderEmail = companySettings?.email || 'noreply@example.com';
      
      // Create a properly structured combined object for the email service
      const completeInvoiceData = {
        ...invoice,
        items: invoiceItems,
        customer: customer, // Explicitly assign customer
        project: project    // Explicitly assign project
      };
      
      console.log(`[Email Route] Preparing to send email with invoice ${invoice.invoiceNumber}`);
      console.log(`[Email Route] Has customer data: ${completeInvoiceData.customer !== null}`);
      console.log(`[Email Route] Has project data: ${completeInvoiceData.project !== null}`);
      console.log(`[Email Route] Items count: ${completeInvoiceData.items.length}`);
      
      // Send email with PDF and optional customizations
      const success = await EmailService.sendInvoice(
        completeInvoiceData,
        recipientEmail,
        senderEmail,
        {
          subject,
          message,
          includePdf: includePdf !== false
        }
      );
      
      if (success) {
        console.log(`[Email Route] Email sent successfully to ${recipientEmail}`);
        res.json({ message: 'Invoice sent successfully via email' });
      } else {
        console.log(`[Email Route] Failed to send email to ${recipientEmail}`);
        res.status(500).json({ message: 'Failed to send invoice via email' });
      }
    } catch (error) {
      console.error('[Email Route] Error emailing invoice:', error);
      res.status(500).json({ message: 'Failed to send invoice via email' });
    }
  });
  
  // Generate and download Purchase Order PDF
  app.get('/api/purchase-orders/:id/pdf', requireAuth, async (req, res) => {
    try {
      const poId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      if (!tenantId) {
        return res.status(400).json({ message: 'Tenant context required' });
      }
      
      // Get PO with tenant filtering
      const purchaseOrder = await storage.getPurchaseOrder(poId, { tenantId });
      if (!purchaseOrder) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      // Security check - ensure purchase order belongs to the tenant
      if (purchaseOrder.tenantId !== tenantId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const poItems = await storage.getPurchaseOrderItemsByPO(purchaseOrder.id);
      
      // Generate PDF
      const pdfBuffer = await PDFService.generatePurchaseOrderPDF({
        ...purchaseOrder,
        items: poItems
      });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="PO_${purchaseOrder.poNumber}.pdf"`);
      
      // Send the PDF as response
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating purchase order PDF:', error);
      res.status(500).json({ message: 'Failed to generate PDF' });
    }
  });
  
  // Email Purchase Order PDF
  app.post('/api/purchase-orders/:id/email', requireAuth, async (req, res) => {
    try {
      const poId = Number(req.params.id);
      const { to: recipientEmail, subject, body } = req.body;
      const tenantId = getTenantIdFromRequest(req);
      
      console.log('[PO Email] Request payload:', { poId, recipientEmail, subject, body, tenantId });
      
      if (!tenantId) {
        console.log('[PO Email] Missing tenant context');
        return res.status(400).json({ message: 'Tenant context required' });
      }
      
      if (!recipientEmail) {
        console.log('[PO Email] Missing recipient email');
        return res.status(400).json({ message: 'Recipient email is required' });
      }
      
      // Get PO with tenant filtering
      console.log('[PO Email] Fetching purchase order with ID:', poId);
      const purchaseOrder = await storage.getPurchaseOrder(poId, { tenantId });
      if (!purchaseOrder) {
        console.log('[PO Email] Purchase order not found');
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      // Security check - ensure purchase order belongs to the tenant
      if (purchaseOrder.tenantId !== tenantId) {
        console.log('[PO Email] Access denied - tenant mismatch');
        return res.status(403).json({ message: 'Access denied' });
      }
      
      console.log('[PO Email] Fetching purchase order items');
      const poItems = await storage.getPurchaseOrderItemsByPO(purchaseOrder.id);
      console.log('[PO Email] Found items:', poItems.length);
      
      // Get company settings for sender email
      console.log('[PO Email] Fetching company settings');
      const companySettings = await storage.getCompanySettings();
      const senderEmail = companySettings?.email || process.env.SENDGRID_SENDER_EMAIL || 'noreply@example.com';
      console.log('[PO Email] Using sender email:', senderEmail);
      
      // Check email service configuration
      console.log('[PO Email] Checking email service configuration');
      console.log('[PO Email] SendGrid API Key configured:', !!process.env.SENDGRID_API_KEY);
      console.log('[PO Email] Email service configured:', EmailService.isConfigured());
      
      // Send email with PDF using the unified email service with custom subject and body
      console.log('[PO Email] Attempting to send email');
      const success = await EmailService.sendPurchaseOrder(
        { ...purchaseOrder, items: poItems },
        recipientEmail,
        senderEmail,
        {
          subject,
          message: body,
          includePdf: true
        }
      );
      
      console.log('[PO Email] Email send result:', success);
      
      if (success) {
        res.json({ message: 'Purchase order sent successfully via email' });
      } else {
        res.status(500).json({ message: 'Failed to send purchase order via email' });
      }
    } catch (error) {
      console.error('[PO Email] Error emailing purchase order:', error);
      if (error instanceof Error) {
        console.error('[PO Email] Error message:', error.message);
        console.error('[PO Email] Error stack:', error.stack);
      }
      res.status(500).json({ message: 'Failed to send purchase order via email' });
    }
  });
};