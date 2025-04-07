import { MailService } from '@sendgrid/mail';
import { Quote, Invoice, PurchaseOrder } from '@shared/schema';
import PDFService from './pdf-service';
import NodemailerService, { EmailParams as NodemailerEmailParams } from './nodemailer-service';
import { logger } from '../logger';

// Initialize SendGrid
const mailService = new MailService();

// Set the API key from environment variables
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
  logger.info({}, 'SendGrid API key configured');
}

// Email parameters interface
export interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type?: string;
    disposition?: 'attachment' | 'inline';
    contentType?: string;
  }>;
}

/**
 * Service for sending emails with automatic provider selection
 * Uses SendGrid if API key is available, falls back to Nodemailer if SMTP is configured
 */
export default class UnifiedEmailService {
  /**
   * Check if any email provider is configured
   */
  static isConfigured(): boolean {
    return !!process.env.SENDGRID_API_KEY || (!!process.env.EMAIL_HOST && !!process.env.EMAIL_PORT);
  }

  /**
   * Select the email provider
   * Returns 'sendgrid' or 'nodemailer' or null if none configured
   */
  private static getProvider(): 'sendgrid' | 'nodemailer' | null {
    if (process.env.SENDGRID_API_KEY) {
      return 'sendgrid';
    } else if (process.env.EMAIL_HOST && process.env.EMAIL_PORT) {
      return 'nodemailer';
    }
    return null;
  }

  /**
   * Send a general email
   * @param params Email parameters including recipient, subject, text/html body
   * @returns Success status
   */
  static async sendEmail(params: EmailParams): Promise<boolean> {
    try {
      const provider = this.getProvider();
      
      if (!provider) {
        logger.error({}, 'No email provider configured. Cannot send email.');
        return false;
      }

      // Set a default from address if not provided
      const fromAddress = params.from || process.env.EMAIL_FROM || 'noreply@example.com';
      
      logger.info({ 
        to: params.to,
        from: fromAddress,
        subject: params.subject,
        provider
      }, 'Sending email');
      
      if (provider === 'sendgrid') {
        // Send using SendGrid
        await mailService.send({
          to: params.to,
          from: fromAddress,
          subject: params.subject,
          text: params.text || '',
          html: params.html || '',
          attachments: params.attachments?.map(attachment => ({
            content: attachment.content,
            filename: attachment.filename,
            type: attachment.type || 'application/octet-stream',
            disposition: attachment.disposition || 'attachment'
          }))
        });
      } else {
        // Send using Nodemailer
        const nodemailerParams: NodemailerEmailParams = {
          to: params.to,
          from: fromAddress,
          subject: params.subject,
          text: params.text || '',
          html: params.html || '',
          attachments: params.attachments?.map(attachment => ({
            content: attachment.content,
            filename: attachment.filename,
            contentType: attachment.type || 'application/octet-stream'
          }))
        };
        
        const sent = await NodemailerService.sendEmail(nodemailerParams);
        if (!sent) {
          throw new Error('Failed to send email via Nodemailer');
        }
      }
      
      logger.info({ to: params.to }, 'Email sent successfully');
      return true;
    } catch (error) {
      logger.error({ 
        err: error,
        to: params.to,
        subject: params.subject
      }, 'Error sending email');
      
      if (error instanceof Error) {
        logger.error({
          message: error.message,
          stack: error.stack
        }, 'Error details');
      }
      
      return false;
    }
  }

  /**
   * Send a user invitation email
   * @param email Recipient's email address
   * @param token Invitation token
   * @param inviterName Name of the person who sent the invitation
   * @param tenantName Name of the tenant organization
   * @param role Role being assigned to the invitee
   * @param baseUrl Base URL for the invitation link
   * @returns Success status
   */
  static async sendInvitation(
    email: string,
    token: string,
    inviterName: string,
    tenantName: string,
    role: string,
    baseUrl: string
  ): Promise<boolean> {
    try {
      const fromAddress = process.env.EMAIL_FROM || 'noreply@example.com';
      const subject = `Invitation to join ${tenantName} on Business Manager`;
      
      // Generate the invitation URL
      const inviteUrl = `${baseUrl}/accept-invite?token=${token}`;
      
      // Create HTML email content
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">You've been invited to join ${tenantName}</h2>
          <p>Hello,</p>
          <p>${inviterName} has invited you to join ${tenantName}'s Business Manager platform as a <strong>${role}</strong>.</p>
          <p>To accept this invitation, please click the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #1E40AF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          <p>Or copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; font-size: 14px; color: #666;">${inviteUrl}</p>
          <p>This invitation will expire in 7 days.</p>
          <p>If you have any questions, please contact the person who invited you.</p>
          <hr style="border: 1px solid #eee; margin: 30px 0;" />
          <p style="font-size: 12px; color: #999;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      `;
      
      // Plain text version
      const text = `
        You've been invited to join ${tenantName}
        
        Hello,
        
        ${inviterName} has invited you to join ${tenantName}'s Business Manager platform as a ${role}.
        
        To accept this invitation, please visit this URL:
        ${inviteUrl}
        
        This invitation will expire in 7 days.
        
        If you have any questions, please contact the person who invited you.
        
        If you didn't expect this invitation, you can safely ignore this email.
      `;
      
      // Send the email
      return await this.sendEmail({
        to: email,
        from: fromAddress,
        subject,
        html,
        text
      });
    } catch (error) {
      logger.error({ 
        err: error,
        to: email,
        token: token.substring(0, 8) + '...' // Log only part of the token for security
      }, 'Error sending invitation email');
      
      return false;
    }
  }

  /**
   * Send a quote via email with PDF attachment
   * @param quote The quote data including items
   * @param recipientEmail Email address of the recipient
   * @param senderEmail Email address of the sender
   * @param options Optional settings for the email (subject, message, includePdf)
   * @returns Success status
   */
  static async sendQuote(
    quote: Quote & { items: any[] }, 
    recipientEmail: string, 
    senderEmail: string,
    options?: {
      subject?: string;
      message?: string;
      includePdf?: boolean;
    }
  ): Promise<boolean> {
    try {
      // Prepare email content
      const emailParams: EmailParams = {
        to: recipientEmail,
        from: senderEmail,
        subject: options?.subject || `Quote #${quote.quoteNumber}`,
        html: options?.message ? options.message.replace(/\n/g, '<br/>') : `
          <p>Dear Customer,</p>
          <p>Please find attached the quote #${quote.quoteNumber} for your review.</p>
          <p>The quote total is $${quote.total.toFixed(2)} and is valid until ${
            quote.expiryDate ? new Date(quote.expiryDate).toLocaleDateString() : 'N/A'
          }.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Thank you for your business!</p>
        `
      };
      
      // Add PDF attachment if requested (default is true)
      if (options?.includePdf !== false) {
        // Generate PDF
        const pdfBuffer = await PDFService.generateQuotePDF(quote);
        
        // Convert buffer to base64 for email attachment
        const base64PDF = pdfBuffer.toString('base64');
        
        emailParams.attachments = [
          {
            content: base64PDF,
            filename: `Quote_${quote.quoteNumber}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment'
          }
        ];
      }
      
      // Send email
      return await this.sendEmail(emailParams);
    } catch (error) {
      logger.error({ 
        err: error,
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        recipient: recipientEmail
      }, 'Error sending quote email');
      
      return false;
    }
  }

  /**
   * Send an invoice via email with PDF attachment
   * @param invoice The invoice data including items
   * @param recipientEmail Email address of the recipient
   * @param senderEmail Email address of the sender
   * @returns Success status
   */
  static async sendInvoice(
    invoice: Invoice & { items: any[]; customer?: any; project?: any }, 
    recipientEmail: string, 
    senderEmail: string,
    options?: {
      subject?: string;
      message?: string;
      includePdf?: boolean;
    }
  ): Promise<boolean> {
    try {
      logger.info({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        recipient: recipientEmail
      }, 'Preparing to send invoice email');
      
      // Get customer name if available
      const customerName = invoice.customer ? invoice.customer.name : 'Customer';
      const projectName = invoice.project ? invoice.project.name : '';
      
      // Prepare email content
      const emailParams: EmailParams = {
        to: recipientEmail,
        from: senderEmail,
        subject: options?.subject || `${invoice.type === 'deposit' ? 'Deposit Invoice' : 'Invoice'} #${invoice.invoiceNumber}${projectName ? ' for ' + projectName : ''}`,
        html: options?.message ? options.message.replace(/\n/g, '<br/>') : `
          <p>Dear ${customerName},</p>
          <p>Please find attached the ${invoice.type === 'deposit' ? 'deposit invoice' : 'invoice'} #${invoice.invoiceNumber}${projectName ? ' for ' + projectName : ''} for your payment.</p>
          <p>The invoice total is $${invoice.total.toFixed(2)} and is due on ${new Date(invoice.dueDate).toLocaleDateString()}.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Thank you for your business!</p>
        `
      };
      
      // Add PDF attachment if requested (default is true)
      if (options?.includePdf !== false) {
        logger.info({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber
        }, 'Generating PDF for invoice');
        
        // Generate PDF
        const pdfBuffer = await PDFService.generateInvoicePDF(invoice);
        
        logger.info({
          invoiceId: invoice.id,
          pdfSize: pdfBuffer.length
        }, 'PDF generated successfully');
        
        // Convert buffer to base64 for email attachment
        const base64PDF = pdfBuffer.toString('base64');
        
        emailParams.attachments = [
          {
            content: base64PDF,
            filename: `Invoice_${invoice.invoiceNumber}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment'
          }
        ];
      }
      
      // Send email
      return await this.sendEmail(emailParams);
    } catch (error) {
      logger.error({ 
        err: error,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        recipient: recipientEmail
      }, 'Error sending invoice email');
      
      if (error instanceof Error) {
        logger.error({
          message: error.message,
          stack: error.stack
        }, 'Error details');
      }
      
      return false;
    }
  }

  /**
   * Send a purchase order via email with PDF attachment
   * @param purchaseOrder The purchase order data including items
   * @param recipientEmail Email address of the recipient
   * @param senderEmail Email address of the sender
   * @returns Success status
   */
  static async sendPurchaseOrder(
    purchaseOrder: PurchaseOrder & { items: any[] }, 
    recipientEmail: string, 
    senderEmail: string,
    options?: {
      subject?: string;
      message?: string;
      includePdf?: boolean;
    }
  ): Promise<boolean> {
    try {
      logger.info({
        poId: purchaseOrder.id,
        poNumber: purchaseOrder.poNumber,
        recipient: recipientEmail
      }, 'Preparing to send purchase order email');
      
      // Prepare email content
      const emailParams: EmailParams = {
        to: recipientEmail,
        from: senderEmail,
        subject: options?.subject || `Purchase Order #${purchaseOrder.poNumber}`,
        html: options?.message ? options.message.replace(/\n/g, '<br/>') : `
          <p>Dear Supplier,</p>
          <p>Please find attached our purchase order #${purchaseOrder.poNumber}.</p>
          <p>The purchase order total is $${purchaseOrder.total.toFixed(2)}.</p>
          <p>Expected delivery date: ${
            purchaseOrder.expectedDeliveryDate 
              ? new Date(purchaseOrder.expectedDeliveryDate).toLocaleDateString() 
              : 'As soon as possible'
          }.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Thank you for your cooperation.</p>
        `
      };
      
      // Add PDF attachment if requested (default is true)
      if (options?.includePdf !== false) {
        logger.info({
          poId: purchaseOrder.id,
          poNumber: purchaseOrder.poNumber
        }, 'Generating PDF for purchase order');
        
        // Generate PDF
        const pdfBuffer = await PDFService.generatePurchaseOrderPDF(purchaseOrder);
        
        logger.info({
          poId: purchaseOrder.id,
          pdfSize: pdfBuffer.length
        }, 'PDF generated successfully');
        
        // Convert buffer to base64 for email attachment
        const base64PDF = pdfBuffer.toString('base64');
        
        emailParams.attachments = [
          {
            content: base64PDF,
            filename: `PO_${purchaseOrder.poNumber}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment'
          }
        ];
      }
      
      // Send email
      return await this.sendEmail(emailParams);
    } catch (error) {
      logger.error({ 
        err: error,
        poId: purchaseOrder.id,
        poNumber: purchaseOrder.poNumber,
        recipient: recipientEmail
      }, 'Error sending purchase order email');
      
      return false;
    }
  }
}