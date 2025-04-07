import sgMail from '@sendgrid/mail';
import PDFService from './pdf-service';
import { logger } from '../logger';

/**
 * Email service implementation using SendGrid
 */
class EmailServiceImpl {
  constructor() {
    // Initialize SendGrid with API key if available
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    } else {
      logger.warn('SendGrid API key not found. Email functionality will not work.');
    }
  }

  /**
   * Send a quote via email, with optional PDF attachment
   * @param quoteData The quote data with all related entities
   * @param recipientEmail The email address to send to
   * @param senderEmail The email address to send from
   * @param options Additional options (subject, message, includePdf)
   * @returns Boolean indicating success
   */
  async sendQuote(
    quoteData: any,
    recipientEmail: string,
    senderEmail: string,
    options: { subject?: string; message?: string; includePdf?: boolean } = {}
  ): Promise<boolean> {
    try {
      const { subject, message, includePdf = true } = options;
      
      // Generate a PDF buffer if needed
      let pdfBuffer: Buffer | null = null;
      if (includePdf) {
        pdfBuffer = await PDFService.generateQuotePDF(quoteData);
      }
      
      // Construct the email
      const emailData: any = {
        to: recipientEmail,
        from: senderEmail,
        subject: subject || `Quote #${quoteData.quoteNumber}`,
        text: message || `Please find attached Quote #${quoteData.quoteNumber}.`,
        html: this.generateHtmlContent('quote', quoteData, message),
      };
      
      // Add attachment if we have a PDF
      if (pdfBuffer) {
        emailData.attachments = [
          {
            content: pdfBuffer.toString('base64'),
            filename: `Quote_${quoteData.quoteNumber}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment',
          },
        ];
      }
      
      // Send the email
      await sgMail.send(emailData);
      logger.info(`Quote email sent to ${recipientEmail}`);
      return true;
    } catch (error) {
      logger.error(`Error sending quote email: ${error}`);
      return false;
    }
  }

  /**
   * Send an invoice via email, with optional PDF attachment
   * @param invoiceData The invoice data with all related entities
   * @param recipientEmail The email address to send to
   * @param senderEmail The email address to send from
   * @param options Additional options (subject, message, includePdf)
   * @returns Boolean indicating success
   */
  async sendInvoice(
    invoiceData: any,
    recipientEmail: string,
    senderEmail: string,
    options: { subject?: string; message?: string; includePdf?: boolean } = {}
  ): Promise<boolean> {
    try {
      const { subject, message, includePdf = true } = options;
      
      // Generate a PDF buffer if needed
      let pdfBuffer: Buffer | null = null;
      if (includePdf) {
        pdfBuffer = await PDFService.generateInvoicePDF(invoiceData);
      }
      
      // Construct the email
      const emailData: any = {
        to: recipientEmail,
        from: senderEmail,
        subject: subject || `Invoice #${invoiceData.invoiceNumber}`,
        text: message || `Please find attached Invoice #${invoiceData.invoiceNumber}.`,
        html: this.generateHtmlContent('invoice', invoiceData, message),
      };
      
      // Add attachment if we have a PDF
      if (pdfBuffer) {
        emailData.attachments = [
          {
            content: pdfBuffer.toString('base64'),
            filename: `Invoice_${invoiceData.invoiceNumber}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment',
          },
        ];
      }
      
      // Send the email
      await sgMail.send(emailData);
      logger.info(`Invoice email sent to ${recipientEmail}`);
      return true;
    } catch (error) {
      logger.error(`Error sending invoice email: ${error}`);
      return false;
    }
  }

  /**
   * Send a password reset email
   * @param email Recipient email
   * @param resetToken Reset token
   * @param resetUrl URL for the reset page
   */
  async sendPasswordResetEmail(email: string, resetToken: string, resetUrl: string): Promise<boolean> {
    try {
      const msg = {
        to: email,
        from: process.env.SENDGRID_SENDER_EMAIL || 'noreply@example.com',
        subject: 'Password Reset Request',
        text: `You requested a password reset. Click the following link to reset your password: ${resetUrl}?token=${resetToken}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>You requested a password reset. Click the button below to reset your password:</p>
            <a href="${resetUrl}?token=${resetToken}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
              Reset Password
            </a>
            <p>If you did not request this password reset, please ignore this email.</p>
            <p>The link will expire in 24 hours.</p>
          </div>
        `,
      };
      
      await sgMail.send(msg);
      logger.info(`Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      logger.error(`Error sending password reset email: ${error}`);
      return false;
    }
  }

  /**
   * Send a welcome email to a new user
   * @param email Recipient email
   * @param name User's name
   * @param loginUrl URL for the login page
   */
  async sendWelcomeEmail(email: string, name: string, loginUrl: string): Promise<boolean> {
    try {
      const msg = {
        to: email,
        from: process.env.SENDGRID_SENDER_EMAIL || 'noreply@example.com',
        subject: 'Welcome to Our Platform',
        text: `Welcome ${name}! Your account has been created. You can now login at ${loginUrl}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Our Platform!</h2>
            <p>Hello ${name},</p>
            <p>Your account has been created. You can now login to access your dashboard.</p>
            <a href="${loginUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
              Login to Your Account
            </a>
            <p>Thank you for joining us!</p>
          </div>
        `,
      };
      
      await sgMail.send(msg);
      logger.info(`Welcome email sent to ${email}`);
      return true;
    } catch (error) {
      logger.error(`Error sending welcome email: ${error}`);
      return false;
    }
  }

  /**
   * Generate HTML content for quote or invoice emails
   * @param type Type of document ('quote' or 'invoice')
   * @param data The document data
   * @param customMessage Optional custom message to include
   * @returns HTML string
   */
  private generateHtmlContent(type: 'quote' | 'invoice', data: any, customMessage?: string): string {
    const documentNumber = type === 'quote' ? data.quoteNumber : data.invoiceNumber;
    const documentType = type === 'quote' ? 'Quote' : 'Invoice';
    const documentDate = type === 'quote' 
      ? new Date(data.createdAt).toLocaleDateString() 
      : new Date(data.issueDate).toLocaleDateString();
    
    let itemsHtml = '';
    if (data.items && data.items.length > 0) {
      itemsHtml = `
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Description</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">Quantity</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">Price</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">Total</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      data.items.forEach((item: any) => {
        itemsHtml += `
          <tr>
            <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${item.description}</td>
            <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${item.quantity}</td>
            <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">$${item.unitPrice.toFixed(2)}</td>
            <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">$${item.total.toFixed(2)}</td>
          </tr>
        `;
      });
      
      itemsHtml += `
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 8px; text-align: right; border: 1px solid #ddd;"><strong>Subtotal:</strong></td>
              <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">$${data.subtotal.toFixed(2)}</td>
            </tr>
      `;
      
      if (data.tax) {
        itemsHtml += `
          <tr>
            <td colspan="3" style="padding: 8px; text-align: right; border: 1px solid #ddd;"><strong>Tax:</strong></td>
            <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">$${data.tax.toFixed(2)}</td>
          </tr>
        `;
      }
      
      if (data.discount) {
        itemsHtml += `
          <tr>
            <td colspan="3" style="padding: 8px; text-align: right; border: 1px solid #ddd;"><strong>Discount:</strong></td>
            <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">$${data.discount.toFixed(2)}</td>
          </tr>
        `;
      }
      
      itemsHtml += `
            <tr>
              <td colspan="3" style="padding: 8px; text-align: right; border: 1px solid #ddd;"><strong>Total:</strong></td>
              <td style="padding: 8px; text-align: right; border: 1px solid #ddd;"><strong>$${data.total.toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>
      `;
    }
    
    let customerHtml = '';
    if (data.customer) {
      customerHtml = `
        <div style="margin-bottom: 20px;">
          <h3>Customer Information</h3>
          <p>Name: ${data.customer.name}</p>
          <p>Email: ${data.customer.email}</p>
          ${data.customer.phone ? `<p>Phone: ${data.customer.phone}</p>` : ''}
          ${data.customer.address ? `<p>Address: ${data.customer.address}</p>` : ''}
        </div>
      `;
    }
    
    let projectHtml = '';
    if (data.project) {
      projectHtml = `
        <div style="margin-bottom: 20px;">
          <h3>Project</h3>
          <p>Project Name: ${data.project.name}</p>
          ${data.project.description ? `<p>Description: ${data.project.description}</p>` : ''}
        </div>
      `;
    }
    
    let customMessageHtml = '';
    if (customMessage) {
      customMessageHtml = `
        <div style="margin-bottom: 20px; border-left: 4px solid #007bff; padding-left: 15px;">
          <p>${customMessage.replace(/\n/g, '<br>')}</p>
        </div>
      `;
    }
    
    const specialInstructions = type === 'invoice' 
      ? `<p>Please remit payment by the due date: ${new Date(data.dueDate).toLocaleDateString()}</p>` 
      : '';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1>${documentType} #${documentNumber}</h1>
          <p>Date: ${documentDate}</p>
        </div>
        
        ${customMessageHtml}
        
        ${customerHtml}
        
        ${projectHtml}
        
        <div style="margin-bottom: 20px;">
          <h3>${documentType} Details</h3>
          ${itemsHtml}
        </div>
        
        ${specialInstructions}
        
        <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #777;">
          <p>This ${documentType.toLowerCase()} was sent to you from our system. Please do not reply to this email.</p>
          <p>For inquiries, please contact us directly.</p>
        </div>
      </div>
    `;
  }
}

// Export a singleton instance
const EmailService = new EmailServiceImpl();
export default EmailService;