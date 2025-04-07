import nodemailer from 'nodemailer';
import { logger } from '../logger';

// Types for email parameters
export interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    contentType?: string;
    encoding?: string;
  }>;
}

/**
 * Nodemailer Service for sending emails
 */
export default class NodemailerService {
  private static transporter: nodemailer.Transporter;

  /**
   * Initialize the Nodemailer transporter
   * This should be called once at application startup
   */
  static initialize(): boolean {
    try {
      // Check for required environment variables
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT) {
        logger.warn({}, 'Missing email configuration. NodemailerService not initialized.');
        return false;
      }

      // Create transporter with environment variables
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT, 10),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      // Verify the connection
      this.transporter.verify((error) => {
        if (error) {
          logger.error({ err: error }, 'Failed to initialize Nodemailer');
          return false;
        } else {
          logger.info({}, 'Nodemailer initialized successfully');
          return true;
        }
      });

      return true;
    } catch (error) {
      logger.error({ err: error }, 'Error initializing Nodemailer');
      return false;
    }
  }

  /**
   * Send an email using Nodemailer
   */
  static async sendEmail(params: EmailParams): Promise<boolean> {
    try {
      if (!this.transporter) {
        const initialized = this.initialize();
        if (!initialized) {
          logger.error({}, 'Nodemailer not initialized and failed to initialize.');
          return false;
        }
      }

      logger.info({ 
        to: params.to, 
        from: params.from, 
        subject: params.subject 
      }, 'Sending email via Nodemailer');

      // Convert any base64 attachments to Buffer
      const attachments = params.attachments?.map(attachment => ({
        filename: attachment.filename,
        content: Buffer.from(attachment.content, 'base64'),
        contentType: attachment.contentType || 'application/octet-stream'
      }));

      // Send the email
      const result = await this.transporter.sendMail({
        from: params.from,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
        attachments
      });

      logger.info({ 
        messageId: result.messageId, 
        to: params.to 
      }, 'Email sent successfully via Nodemailer');
      
      return true;
    } catch (error) {
      logger.error({ 
        err: error, 
        to: params.to, 
        subject: params.subject 
      }, 'Failed to send email via Nodemailer');
      
      return false;
    }
  }
}