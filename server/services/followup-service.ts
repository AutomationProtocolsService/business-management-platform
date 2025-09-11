import { logger } from '../logger';
import EmailService from './email-service';
import { storage } from '../storage';

/**
 * Service for handling automated follow-up reminders for quotes
 */
class FollowupServiceImpl {
  
  /**
   * Send follow-up reminders for quotes that haven't received responses
   * @param tenantId The tenant ID to process follow-ups for
   * @returns Promise<{ processed: number, sent: number, errors: number }>
   */
  async processFollowupReminders(tenantId: number): Promise<{ processed: number, sent: number, errors: number }> {
    try {
      logger.info('Starting follow-up reminder processing...');
      
      const stats = {
        processed: 0,
        sent: 0,
        errors: 0
      };
      
      // Get all quotes that need follow-up for this tenant
      const quotesNeedingFollowup = await this.getQuotesNeedingFollowup(tenantId);
      stats.processed = quotesNeedingFollowup.length;
      
      logger.info(`Found ${quotesNeedingFollowup.length} quotes that may need follow-up for tenant ${tenantId}`);
      
      for (const quote of quotesNeedingFollowup) {
        try {
          const shouldSendReminder = this.shouldSendReminder(quote);
          
          if (shouldSendReminder) {
            await this.sendFollowupEmail(quote);
            await this.updateFollowupTracking(quote.id, tenantId);
            stats.sent++;
            logger.info(`Follow-up reminder sent for quote #${quote.quoteNumber} (tenant ${tenantId})`);
          }
        } catch (error) {
          stats.errors++;
          logger.error({ err: error, quoteId: quote.id }, `Error processing follow-up for quote #${quote.quoteNumber}`);
        }
      }
      
      logger.info(`Follow-up processing complete. Processed: ${stats.processed}, Sent: ${stats.sent}, Errors: ${stats.errors}`);
      return stats;
    } catch (error) {
      logger.error({ err: error }, 'Error in follow-up reminder processing');
      throw error;
    }
  }
  
  /**
   * Get quotes that are candidates for follow-up reminders for a specific tenant
   * @param tenantId The tenant ID to filter quotes for
   */
  private async getQuotesNeedingFollowup(tenantId: number): Promise<any[]> {
    // Get quotes that are:
    // 1. Status is 'sent'  
    // 2. Have expiry date in the future or no expiry date
    // 3. Haven't been followed up too many times (max 3 follow-ups)
    
    try {
      const allQuotes = await storage.getAllQuotes(tenantId);
      
      const candidateQuotes = allQuotes.filter(quote => {
        // Must be in 'sent' status
        if (quote.status !== 'sent') return false;
        
        // Must not have exceeded maximum follow-ups (3)
        if ((quote.followupCount || 0) >= 3) return false;
        
        // Must not be expired
        if (quote.expiryDate && new Date(quote.expiryDate) < new Date()) return false;
        
        return true;
      });
      
      // Get customer information for each quote
      const quotesWithCustomers = [];
      for (const quote of candidateQuotes) {
        if (quote.customerId) {
          try {
            const customer = await storage.getCustomer(quote.customerId, tenantId);
            if (customer && customer.email) {
              quotesWithCustomers.push({
                ...quote,
                customer
              });
            }
          } catch (error) {
            logger.warn({ quoteId: quote.id }, `Could not fetch customer for quote #${quote.quoteNumber}`);
          }
        }
      }
      
      return quotesWithCustomers;
    } catch (error) {
      logger.error({ err: error }, 'Error fetching quotes needing follow-up');
      throw error;
    }
  }
  
  /**
   * Determine if a quote should receive a follow-up reminder based on timing rules
   */
  private shouldSendReminder(quote: any): boolean {
    const now = new Date();
    const followupCount = quote.followupCount || 0;
    
    // Follow-up schedule:
    // 1st follow-up: 3 days after quote was sent
    // 2nd follow-up: 7 days after 1st follow-up  
    // 3rd follow-up: 14 days after 2nd follow-up
    const followupIntervals = [
      3 * 24 * 60 * 60 * 1000,  // 3 days in milliseconds
      7 * 24 * 60 * 60 * 1000,  // 7 days in milliseconds
      14 * 24 * 60 * 60 * 1000  // 14 days in milliseconds
    ];
    
    let referenceDate: Date;
    
    if (followupCount === 0) {
      // First follow-up: check against quote creation/sent date
      referenceDate = new Date(quote.createdAt);
    } else {
      // Subsequent follow-ups: check against last follow-up sent date
      if (!quote.lastFollowupSentAt) return false;
      referenceDate = new Date(quote.lastFollowupSentAt);
    }
    
    const daysSinceReference = Math.floor((now.getTime() - referenceDate.getTime()) / (24 * 60 * 60 * 1000));
    const requiredDays = followupIntervals[followupCount] / (24 * 60 * 60 * 1000);
    
    return daysSinceReference >= requiredDays;
  }
  
  /**
   * Send follow-up reminder email for a quote
   */
  private async sendFollowupEmail(quote: any): Promise<void> {
    if (!quote.customer || !quote.customer.email) {
      throw new Error('Customer email is required for follow-up');
    }
    
    const followupCount = (quote.followupCount || 0) + 1;
    
    // Customize message based on follow-up number
    let subject: string;
    let message: string;
    
    switch (followupCount) {
      case 1:
        subject = `Friendly Reminder: Quote #${quote.quoteNumber} - Review Requested`;
        message = `Dear ${quote.customer.name},\n\nI hope this email finds you well. I wanted to follow up on Quote #${quote.quoteNumber} that we sent a few days ago.\n\nHave you had a chance to review our proposal? I'd be happy to answer any questions or discuss the details further.\n\nPlease let me know if you need any additional information or if you'd like to schedule a call to discuss the project.\n\nBest regards,`;
        break;
      case 2:  
        subject = `Quote #${quote.quoteNumber} - Still Available for Your Consideration`;
        message = `Dear ${quote.customer.name},\n\nI wanted to reach out once more regarding Quote #${quote.quoteNumber}. We understand you're busy and may need more time to review our proposal.\n\nOur quote remains valid, and we're still very interested in working with you on this project. If there are any concerns or modifications needed, please don't hesitate to reach out.\n\nWould it be helpful to schedule a brief call to discuss your requirements?\n\nBest regards,`;
        break;
      case 3:
        subject = `Final Follow-up: Quote #${quote.quoteNumber} - Expires Soon`;
        message = `Dear ${quote.customer.name},\n\nThis is our final follow-up regarding Quote #${quote.quoteNumber}. We wanted to ensure you received our proposal and had the opportunity to review it.\n\n${quote.expiryDate ? `Please note that this quote expires on ${new Date(quote.expiryDate).toLocaleDateString()}.` : ''}\n\nIf you're no longer interested or have decided to proceed with another option, we completely understand. We'd appreciate a quick note to let us know.\n\nThank you for considering our services.\n\nBest regards,`;
        break;
      default:
        throw new Error('Invalid follow-up count');
    }
    
    // Send the email
    const emailSent = await EmailService.sendQuote(
      quote,
      quote.customer.email,
      process.env.SENDGRID_SENDER_EMAIL || 'noreply@company.com',
      {
        subject,
        message,
        includePdf: true
      }
    );
    
    if (!emailSent) {
      throw new Error('Failed to send follow-up email');
    }
  }
  
  /**
   * Update follow-up tracking fields for a quote
   * @param quoteId The quote ID to update
   * @param tenantId The tenant ID for security validation
   */
  private async updateFollowupTracking(quoteId: number, tenantId: number): Promise<void> {
    try {
      const quote = await storage.getQuote(quoteId, tenantId);
      if (!quote) {
        throw new Error(`Quote ${quoteId} not found`);
      }
      
      await storage.updateQuote(quoteId, {
        lastFollowupSentAt: new Date(),
        followupCount: (quote.followupCount || 0) + 1
      }, tenantId);
    } catch (error) {
      logger.error({ err: error, quoteId }, 'Error updating follow-up tracking');
      throw error;
    }
  }
  
  /**
   * Get follow-up statistics for reporting for a specific tenant
   * @param tenantId The tenant ID to get statistics for
   */
  async getFollowupStats(tenantId: number): Promise<{
    totalQuotesSent: number;
    quotesAwaitingResponse: number;
    quotesWithOneFollowup: number;
    quotesWithTwoFollowups: number; 
    quotesWithThreeFollowups: number;
    expiredQuotes: number;
  }> {
    try {
      const allQuotes = await storage.getAllQuotes(tenantId);
      
      const stats = {
        totalQuotesSent: 0,
        quotesAwaitingResponse: 0,
        quotesWithOneFollowup: 0,
        quotesWithTwoFollowups: 0,
        quotesWithThreeFollowups: 0,
        expiredQuotes: 0
      };
      
      const now = new Date();
      
      for (const quote of allQuotes) {
        if (quote.status === 'sent') {
          stats.totalQuotesSent++;
          
          // Check if expired
          if (quote.expiryDate && new Date(quote.expiryDate) < now) {
            stats.expiredQuotes++;
          } else {
            stats.quotesAwaitingResponse++;
            
            const followupCount = quote.followupCount || 0;
            switch (followupCount) {
              case 1:
                stats.quotesWithOneFollowup++;
                break;
              case 2:
                stats.quotesWithTwoFollowups++;
                break;
              case 3:
                stats.quotesWithThreeFollowups++;
                break;
            }
          }
        }
      }
      
      return stats;
    } catch (error) {
      logger.error({ err: error }, 'Error getting follow-up statistics');
      throw error;
    }
  }
}

const FollowupService = new FollowupServiceImpl();
export default FollowupService;