import { MailService } from '@sendgrid/mail';
import { Quote, Invoice, PurchaseOrder } from '@shared/schema';
import PDFService from './pdf-service';

// Initialize SendGrid
const mailService = new MailService();

// Set the API key from environment variables
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
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
    type: string;
    disposition: 'attachment' | 'inline';
  }>;
}

/**
 * Service for sending emails with optional PDF attachments
 */
export default class EmailService {
  /**
   * Send a general email
   * @param params Email parameters including recipient, subject, text/html body
   * @returns Success status
   */
  static async sendEmail(params: EmailParams): Promise<boolean> {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.error('SendGrid API key not found. Cannot send email.');
        return false;
      }

      // Set a default from address if not provided
      const fromAddress = params.from || 'noreply@example.com';
      
      console.log(`Attempting to send email to ${params.to} from ${fromAddress}`);
      console.log(`Subject: ${params.subject}`);
      console.log(`Has attachments: ${params.attachments ? 'Yes' : 'No'}`);
      
      await mailService.send({
        to: params.to,
        from: fromAddress,
        subject: params.subject,
        text: params.text || '',
        html: params.html || '',
        attachments: params.attachments
      });
      
      console.log(`Email sent successfully to ${params.to}`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
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
      console.error('Error sending quote email:', error);
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
    invoice: Invoice & { items: any[] }, 
    recipientEmail: string, 
    senderEmail: string,
    options?: {
      subject?: string;
      message?: string;
      includePdf?: boolean;
    }
  ): Promise<boolean> {
    try {
      console.log(`Preparing to send invoice #${invoice.invoiceNumber} to ${recipientEmail}`);
      
      // Prepare email content
      const emailParams: EmailParams = {
        to: recipientEmail,
        from: senderEmail,
        subject: options?.subject || `${invoice.type === 'deposit' ? 'Deposit Invoice' : 'Invoice'} #${invoice.invoiceNumber}`,
        html: options?.message ? options.message.replace(/\n/g, '<br/>') : `
          <p>Dear Customer,</p>
          <p>Please find attached the ${invoice.type === 'deposit' ? 'deposit invoice' : 'invoice'} #${invoice.invoiceNumber} for your payment.</p>
          <p>The invoice total is $${invoice.total.toFixed(2)} and is due on ${new Date(invoice.dueDate).toLocaleDateString()}.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Thank you for your business!</p>
        `
      };
      
      // Add PDF attachment if requested (default is true)
      if (options?.includePdf !== false) {
        console.log(`Generating PDF for invoice #${invoice.invoiceNumber}`);
        
        // Generate PDF
        const pdfBuffer = await PDFService.generateInvoicePDF(invoice);
        
        console.log(`PDF generated, size: ${pdfBuffer.length} bytes`);
        
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
      console.error('Error sending invoice email:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
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
    senderEmail: string
  ): Promise<boolean> {
    try {
      // Generate PDF
      const pdfBuffer = await PDFService.generatePurchaseOrderPDF(purchaseOrder);
      
      // Convert buffer to base64 for email attachment
      const base64PDF = pdfBuffer.toString('base64');
      
      // Prepare email content
      const emailParams: EmailParams = {
        to: recipientEmail,
        from: senderEmail,
        subject: `Purchase Order #${purchaseOrder.poNumber}`,
        html: `
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
        `,
        attachments: [
          {
            content: base64PDF,
            filename: `PO_${purchaseOrder.poNumber}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment'
          }
        ]
      };
      
      // Send email
      return await this.sendEmail(emailParams);
    } catch (error) {
      console.error('Error sending purchase order email:', error);
      return false;
    }
  }
}