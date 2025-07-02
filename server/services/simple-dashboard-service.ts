import { storage } from "../storage";
// Import the TenantFilter interface
import { TenantFilter } from "../storage";

/**
 * Simple Dashboard service - basic data only
 */
export class SimpleDashboardService {
  
  /**
   * Get basic dashboard data for the current tenant
   */
  async getSimpleDashboardData(filter?: TenantFilter) {
    try {
      // Get basic counts only - all methods use tenantId 
      const tenantId = filter?.tenantId;
      const projects = await storage.getAllProjects(filter);
      const quotes = await storage.getAllQuotes(filter); 
      const invoices = await storage.getAllInvoices(filter);
      const customers = await storage.getAllCustomers(tenantId);
      
      // Simple stats calculation
      const stats = {
        projects: {
          total: projects.length,
          active: projects.filter(p => p.status === 'in progress' || p.status === 'pending').length
        },
        quotes: {
          total: quotes.length,
          pending: quotes.filter(q => q.status === 'pending' || q.status === 'sent').length
        },
        invoices: {
          total: invoices.length,
          unpaid: invoices.filter(i => i.status !== 'paid').length,
          totalAmount: invoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
        },
        customers: {
          total: customers.length
        }
      };
      
      // Return recent data for tables
      const recentActivity = {
        projects: projects.slice(0, 5),
        quotes: quotes.slice(0, 5),
        invoices: invoices.slice(0, 5),
        customers: customers.slice(0, 5)
      };
      
      return {
        stats,
        recentActivity
      };
    } catch (error) {
      console.error("Error in simple dashboard service:", error);
      throw error;
    }
  }
}

// Export as a singleton
export default new SimpleDashboardService();