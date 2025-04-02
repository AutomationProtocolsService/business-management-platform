import { Express, Request, Response } from 'express';
import PDFService from '../services/pdf-service';
import EmailService from '../services/email-service';
import { storage } from '../storage';

/**
 * Register document-related API routes
 * @param app Express application
 */
export const registerDocumentRoutes = (app: Express) => {
  // Generate and download Quote PDF
  app.get('/api/quotes/:id/pdf', async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      
      // Get quote with items
      const quote = await storage.getQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(quote.createdBy)) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const quoteItems = await storage.getQuoteItemsByQuote(quote.id);
      
      // Generate PDF
      const pdfBuffer = await PDFService.generateQuotePDF({
        ...quote,
        items: quoteItems
      });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Quote_${quote.quoteNumber}.pdf"`);
      
      // Send the PDF as response
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating quote PDF:', error);
      res.status(500).json({ message: 'Failed to generate PDF' });
    }
  });
  
  // Email Quote PDF
  app.post('/api/quotes/:id/email', async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const { recipientEmail } = req.body;
      
      if (!recipientEmail) {
        return res.status(400).json({ message: 'Recipient email is required' });
      }
      
      // Get quote with items
      const quote = await storage.getQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(quote.createdBy)) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const quoteItems = await storage.getQuoteItemsByQuote(quote.id);
      
      // Get company settings for sender email
      const companySettings = await storage.getCompanySettings();
      const senderEmail = companySettings?.email || 'noreply@example.com';
      
      // Send email with PDF
      const success = await EmailService.sendQuote(
        { ...quote, items: quoteItems },
        recipientEmail,
        senderEmail
      );
      
      if (success) {
        res.json({ message: 'Quote sent successfully via email' });
      } else {
        res.status(500).json({ message: 'Failed to send quote via email' });
      }
    } catch (error) {
      console.error('Error emailing quote:', error);
      res.status(500).json({ message: 'Failed to send quote via email' });
    }
  });
  
  // Generate and download Invoice PDF
  app.get('/api/invoices/:id/pdf', async (req, res) => {
    try {
      const invoiceId = Number(req.params.id);
      
      // Get invoice with items
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(invoice.createdBy)) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const invoiceItems = await storage.getInvoiceItemsByInvoice(invoice.id);
      
      // Generate PDF
      const pdfBuffer = await PDFService.generateInvoicePDF({
        ...invoice,
        items: invoiceItems
      });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice_${invoice.invoiceNumber}.pdf"`);
      
      // Send the PDF as response
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      res.status(500).json({ message: 'Failed to generate PDF' });
    }
  });
  
  // Email Invoice PDF
  app.post('/api/invoices/:id/email', async (req, res) => {
    try {
      const invoiceId = Number(req.params.id);
      const { recipientEmail } = req.body;
      
      if (!recipientEmail) {
        return res.status(400).json({ message: 'Recipient email is required' });
      }
      
      // Get invoice with items
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(invoice.createdBy)) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const invoiceItems = await storage.getInvoiceItemsByInvoice(invoice.id);
      
      // Get company settings for sender email
      const companySettings = await storage.getCompanySettings();
      const senderEmail = companySettings?.email || 'noreply@example.com';
      
      // Send email with PDF
      const success = await EmailService.sendInvoice(
        { ...invoice, items: invoiceItems },
        recipientEmail,
        senderEmail
      );
      
      if (success) {
        res.json({ message: 'Invoice sent successfully via email' });
      } else {
        res.status(500).json({ message: 'Failed to send invoice via email' });
      }
    } catch (error) {
      console.error('Error emailing invoice:', error);
      res.status(500).json({ message: 'Failed to send invoice via email' });
    }
  });
  
  // Generate and download Purchase Order PDF
  app.get('/api/purchase-orders/:id/pdf', async (req, res) => {
    try {
      const poId = Number(req.params.id);
      
      // Get PO with items
      const purchaseOrder = await storage.getPurchaseOrder(poId);
      if (!purchaseOrder) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(purchaseOrder.createdBy)) {
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
  app.post('/api/purchase-orders/:id/email', async (req, res) => {
    try {
      const poId = Number(req.params.id);
      const { recipientEmail } = req.body;
      
      if (!recipientEmail) {
        return res.status(400).json({ message: 'Recipient email is required' });
      }
      
      // Get PO with items
      const purchaseOrder = await storage.getPurchaseOrder(poId);
      if (!purchaseOrder) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(purchaseOrder.createdBy)) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const poItems = await storage.getPurchaseOrderItemsByPO(purchaseOrder.id);
      
      // Get company settings for sender email
      const companySettings = await storage.getCompanySettings();
      const senderEmail = companySettings?.email || 'noreply@example.com';
      
      // Send email with PDF
      const success = await EmailService.sendPurchaseOrder(
        { ...purchaseOrder, items: poItems },
        recipientEmail,
        senderEmail
      );
      
      if (success) {
        res.json({ message: 'Purchase order sent successfully via email' });
      } else {
        res.status(500).json({ message: 'Failed to send purchase order via email' });
      }
    } catch (error) {
      console.error('Error emailing purchase order:', error);
      res.status(500).json({ message: 'Failed to send purchase order via email' });
    }
  });
};