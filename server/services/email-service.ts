import nodemailer from 'nodemailer';
import fs from 'fs';
import { promisify } from 'util';
import { storage } from '../storage';

// Promisify fs.readFile
const readFileAsync = promisify(fs.readFile);

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
  }>;
  cc?: string | string[];
  bcc?: string | string[];
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string;

  constructor() {
    // Initialize with default values
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@example.com';
    
    // Create the transporter based on environment configuration
    if (process.env.EMAIL_HOST && process.env.EMAIL_PORT) {
      // SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT, 10),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER || '',
          pass: process.env.EMAIL_PASSWORD || '',
        },
      });
    } else {
      // If no SMTP configuration, use ethereal for testing
      // In production, this should be replaced with a real SMTP service
      this.createTestAccount();
    }
  }

  private async createTestAccount() {
    // Only used for development/testing
    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('Created test email account:', testAccount.user);
    } catch (error) {
      console.error('Failed to create test email account:', error);
      // Fallback to a dummy transporter that logs instead of sending
      this.transporter = {
        sendMail: (options: any) => {
          console.log('Email would be sent with:', options);
          return Promise.resolve({ messageId: 'test-id' });
        },
      } as any;
    }
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; message: string; previewUrl?: string }> {
    try {
      if (!this.transporter) {
        console.error('Transporter not initialized');
        return { 
          success: false, 
          message: 'Email transporter not initialized. Check email configuration.' 
        };
      }

      const mailOptions = {
        from: this.fromEmail,
        ...options,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      // For test accounts, log the URL where the email can be previewed
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('Preview URL:', previewUrl);
        return { success: true, message: 'Email sent successfully', previewUrl };
      }
      
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error('Error sending email:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'An unknown error occurred while sending email' 
      };
    }
  }

  async sendDocumentEmail(
    documentType: 'quote' | 'invoice' | 'purchaseOrder',
    documentId: number,
    customerEmail: string,
    subject: string,
    body: string,
    includeAttachments: boolean = true,
    attachmentPdfBuffer?: Buffer
  ): Promise<{ success: boolean; message: string; previewUrl?: string }> {
    try {
      // Prepare attachments
      const attachments: Array<{
        filename: string;
        content?: Buffer;
        path?: string;
        contentType?: string;
      }> = [];

      // Add the main PDF if provided
      if (attachmentPdfBuffer) {
        attachments.push({
          filename: `${documentType}-${documentId}.pdf`,
          content: attachmentPdfBuffer,
          contentType: 'application/pdf',
        });
      }

      // Add any additional file attachments from storage if requested
      if (includeAttachments) {
        const files = await storage.getFileAttachmentsByRelatedEntity(documentType, documentId);
        
        for (const file of files) {
          try {
            // For files stored in the filesystem (local development)
            if (file.fileUrl.startsWith('/') || file.fileUrl.startsWith('file://')) {
              const filePath = file.fileUrl.replace('file://', '');
              const fileContent = await readFileAsync(filePath);
              
              attachments.push({
                filename: file.fileName,
                content: fileContent,
                contentType: file.fileType,
              });
            } else {
              // For files stored in cloud storage or accessible via URL
              attachments.push({
                filename: file.fileName,
                path: file.fileUrl,
                contentType: file.fileType,
              });
            }
          } catch (fileError) {
            console.error(`Error processing attachment ${file.fileName}:`, fileError);
            // Continue with other attachments
          }
        }
      }

      // Send the email
      return this.sendEmail({
        to: customerEmail,
        subject,
        html: body,
        attachments,
      });
    } catch (error) {
      console.error(`Error sending ${documentType} email:`, error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : `An unknown error occurred while sending ${documentType} email` 
      };
    }
  }
}

// Initialize the email service
const emailService = new EmailService();

// Export the sendEmail function that wraps the email service
export const sendEmail = async (options: EmailOptions): Promise<{ success: boolean; message: string; previewUrl?: string }> => {
  return emailService.sendEmail(options);
};

// Export the sendDocumentEmail function for use in routes
export const sendDocumentEmail = async (
  documentType: 'quote' | 'invoice' | 'purchaseOrder',
  documentId: number,
  customerEmail: string,
  subject: string,
  body: string,
  includeAttachments: boolean = true,
  attachmentPdfBuffer?: Buffer
): Promise<{ success: boolean; message: string; previewUrl?: string }> => {
  return emailService.sendDocumentEmail(
    documentType,
    documentId,
    customerEmail,
    subject,
    body,
    includeAttachments,
    attachmentPdfBuffer
  );
};

// Export the service for direct use when needed
export default emailService;