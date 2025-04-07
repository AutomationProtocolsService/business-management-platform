import { storage } from "../storage";
import { TenantFilter } from "../middleware/tenant-filter";

/**
 * Dashboard service to generate data for dashboard widgets
 */
export class DashboardService {
  
  /**
   * Get all dashboard data for the current tenant
   */
  async getDashboardData(filter?: TenantFilter) {
    try {
      // Get basic counts and data
      const projects = await storage.getAllProjects(filter);
      const quotes = await storage.getAllQuotes(filter);
      const invoices = await storage.getAllInvoices(filter);
      const customers = await storage.getAllCustomers(filter);
      const surveys = await storage.getAllSurveys(filter);
      const installations = await storage.getAllInstallations(filter);
      
      // For tasks, we need to get them from all task lists
      const taskLists = await storage.getAllTaskLists(filter);
      const tasksPromises = taskLists.map(taskList => 
        storage.getTasksByTaskList(taskList.id, filter)
      );
      const taskArrays = await Promise.all(tasksPromises);
      const tasks = taskArrays.flat(); // Flatten array of arrays
      
      // Project stats
      const totalProjects = projects.length;
      const projectsByStatus = this.getProjectStatusBreakdown(projects);
      
      // Financial stats
      const financialMetrics = this.getFinancialMetrics(quotes, invoices);
      
      // Customer stats
      const customerMetrics = {
        total: customers.length,
        new: this.getRecentCustomers(customers, 30).length,
      };
      
      // Get recent activity data
      const recentActivity = await this.getRecentActivity(filter);
      
      // Get upcoming schedule
      const upcomingEvents = await this.getUpcomingEvents(
        surveys, 
        installations, 
        tasks, 
        projects,
        filter
      );
      
      // Get sales pipeline data
      const salesPipeline = this.getSalesPipelineData(quotes, invoices);
      
      // Return comprehensive dashboard data
      return {
        stats: {
          projects: {
            total: totalProjects,
            byStatus: projectsByStatus,
            recentCount: this.getRecentProjects(projects, 30).length
          },
          quotes: {
            pendingCount: quotes.filter(q => q.status === 'pending').length,
            total: quotes.length,
            averageValue: financialMetrics.averageQuoteValue
          },
          invoices: {
            totalAmount: financialMetrics.totalInvoiceAmount,
            pendingAmount: financialMetrics.pendingInvoiceAmount,
            paidAmount: financialMetrics.paidInvoiceAmount,
            overdue: financialMetrics.overdueInvoiceCount
          },
          customers: customerMetrics,
          tasks: {
            totalCount: tasks.length,
            completedCount: tasks.filter(t => t.status === 'completed').length,
            pendingCount: tasks.filter(t => t.status === 'pending').length
          }
        },
        recentActivity,
        upcomingEvents,
        salesPipeline,
        projectChart: this.getProjectsTimeSeriesData(projects, 6),
        revenueChart: this.getRevenueTimeSeriesData(invoices, 6)
      };
    } catch (error) {
      console.error("Error in dashboard service:", error);
      throw error;
    }
  }
  
  /**
   * Get breakdown of projects by status
   */
  getProjectStatusBreakdown(projects) {
    const statusCounts = {};
    
    // Initialize with common statuses even if count is 0
    const commonStatuses = ['pending', 'in-progress', 'completed', 'delayed', 'cancelled'];
    commonStatuses.forEach(status => {
      statusCounts[status] = 0;
    });
    
    // Count projects by status
    projects.forEach(project => {
      const status = project.status.toLowerCase();
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      } else {
        // Handle any custom statuses
        statusCounts[status] = 1;
      }
    });
    
    return statusCounts;
  }
  
  /**
   * Calculate financial metrics from quotes and invoices
   */
  getFinancialMetrics(quotes, invoices) {
    // Calculate total invoice amount
    const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);
    
    // Calculate pending and paid invoice amounts
    const pendingInvoiceAmount = invoices
      .filter(inv => ['draft', 'sent', 'partial'].includes(inv.status))
      .reduce((sum, inv) => sum + inv.total, 0);
      
    const paidInvoiceAmount = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);
    
    // Calculate average quote value
    const totalQuoteAmount = quotes.reduce((sum, q) => sum + q.total, 0);
    const averageQuoteValue = quotes.length > 0 ? totalQuoteAmount / quotes.length : 0;
    
    // Count overdue invoices
    const today = new Date();
    const overdueInvoiceCount = invoices.filter(inv => {
      return ['sent', 'partial'].includes(inv.status) && 
             new Date(inv.dueDate) < today;
    }).length;
    
    return {
      totalInvoiceAmount,
      pendingInvoiceAmount,
      paidInvoiceAmount,
      averageQuoteValue,
      overdueInvoiceCount
    };
  }
  
  /**
   * Get customers created within the specified number of days
   */
  getRecentCustomers(customers, days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return customers.filter(customer => 
      new Date(customer.createdAt) > cutoffDate
    );
  }
  
  /**
   * Get projects created within the specified number of days
   */
  getRecentProjects(projects, days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return projects.filter(project => 
      new Date(project.createdAt) > cutoffDate
    );
  }
  
  /**
   * Get recent activity data (quotes, invoices, projects)
   */
  async getRecentActivity(filter?: TenantFilter) {
    // Collect recent activities from different sources
    const recentProjects = (await storage.getAllProjects(filter))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(project => ({
        type: 'project',
        id: project.id,
        title: project.name,
        status: project.status,
        date: project.createdAt,
        description: `Project created${project.customerId ? ' for customer' : ''}`,
        entityType: 'project'
      }));
      
    const recentQuotes = (await storage.getAllQuotes(filter))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(quote => ({
        type: 'quote',
        id: quote.id,
        title: `Quote #${quote.quoteNumber}`,
        status: quote.status,
        date: quote.createdAt,
        amount: quote.total,
        description: `Quote ${quote.status}`,
        entityType: 'quote'
      }));
      
    const recentInvoices = (await storage.getAllInvoices(filter))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(invoice => ({
        type: 'invoice',
        id: invoice.id,
        title: `Invoice #${invoice.invoiceNumber}`,
        status: invoice.status,
        date: invoice.createdAt,
        amount: invoice.total,
        description: `Invoice ${invoice.status}`,
        entityType: 'invoice'
      }));
      
    // Combine and sort all activities
    return [...recentProjects, ...recentQuotes, ...recentInvoices]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }
  
  /**
   * Get upcoming scheduled events (surveys, installations, tasks with due dates)
   */
  async getUpcomingEvents(surveys, installations, tasks, projects, filter?: TenantFilter) {
    // Collect all types of upcoming events
    const upcomingEvents = [
      ...surveys.map(s => ({
        type: 'survey',
        id: s.id,
        projectId: s.projectId,
        date: s.scheduledDate,
        status: s.status,
        title: `Survey ${s.surveyNumber || ''}`,
        description: s.notes || ''
      })),
      ...installations.map(i => ({
        type: 'installation',
        id: i.id,
        projectId: i.projectId,
        date: i.scheduledDate,
        status: i.status,
        title: `Installation`,
        description: i.notes || ''
      })),
      ...tasks.filter(t => t.dueDate).map(t => ({
        type: 'task',
        id: t.id,
        projectId: t.projectId,
        date: t.dueDate,
        status: t.status,
        title: t.title || 'Task',
        description: t.description || ''
      }))
    ]
    .filter(event => {
      const eventDate = new Date(event.date);
      const today = new Date();
      const fourWeeksLater = new Date();
      fourWeeksLater.setDate(fourWeeksLater.getDate() + 28);
      
      return event.status !== 'completed' && eventDate >= today && eventDate <= fourWeeksLater;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 10);
    
    // Enhance upcoming events with project details
    const upcomingEventsWithDetails = await Promise.all(upcomingEvents.map(async event => {
      if (!event.projectId) return event;
      
      try {
        const project = await storage.getProject(event.projectId, filter?.tenantId);
        return {
          ...event,
          projectName: project?.name || 'Unknown Project'
        };
      } catch (error) {
        console.error(`Error fetching project ${event.projectId} for event:`, error);
        return {
          ...event,
          projectName: 'Unknown Project'
        };
      }
    }));
    
    return upcomingEventsWithDetails;
  }
  
  /**
   * Calculate sales pipeline statistics from quotes and invoices
   */
  getSalesPipelineData(quotes, invoices) {
    const pipelineStages = {
      'draft': { count: 0, value: 0 },
      'sent': { count: 0, value: 0 },
      'accepted': { count: 0, value: 0 },
      'rejected': { count: 0, value: 0 }
    };
    
    // Count quotes by stage
    quotes.forEach(quote => {
      const stage = quote.status.toLowerCase();
      if (pipelineStages[stage]) {
        pipelineStages[stage].count++;
        pipelineStages[stage].value += quote.total;
      }
    });
    
    // Calculate conversion rates
    const totalQuotes = quotes.length || 1; // Avoid division by zero
    const conversionRates = {
      'sent_to_accepted': quotes.filter(q => q.status === 'accepted').length / 
                          (quotes.filter(q => ['sent', 'accepted', 'rejected'].includes(q.status)).length || 1),
      'quote_to_invoice': 0
    };
    
    // Calculate quote to invoice conversion
    // This is simplified - in a real app you would track which invoices came from which quotes
    const quoteIds = new Set(quotes.map(q => q.id));
    const invoicesFromQuotes = invoices.filter(inv => inv.quoteId && quoteIds.has(inv.quoteId)).length;
    conversionRates.quote_to_invoice = invoicesFromQuotes / totalQuotes;
    
    return {
      stages: pipelineStages,
      conversionRates
    };
  }
  
  /**
   * Generate data for projects over time chart
   */
  getProjectsTimeSeriesData(projects, months = 6) {
    const today = new Date();
    const data = [];
    
    // For each of the past n months
    for (let i = 0; i < months; i++) {
      const monthDate = new Date();
      monthDate.setMonth(today.getMonth() - i);
      monthDate.setDate(1); // First day of month
      
      const monthStart = new Date(monthDate);
      const monthEnd = new Date(monthDate);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0); // Last day of month
      
      const monthProjects = projects.filter(project => {
        const projectDate = new Date(project.createdAt);
        return projectDate >= monthStart && projectDate <= monthEnd;
      });
      
      const monthName = monthDate.toLocaleString('default', { month: 'short' });
      
      data.unshift({
        month: monthName,
        year: monthDate.getFullYear(),
        total: monthProjects.length,
        completed: monthProjects.filter(p => p.status === 'completed').length,
        inProgress: monthProjects.filter(p => p.status === 'in-progress').length,
        pending: monthProjects.filter(p => p.status === 'pending').length
      });
    }
    
    return data;
  }
  
  /**
   * Generate data for revenue over time chart
   */
  getRevenueTimeSeriesData(invoices, months = 6) {
    const today = new Date();
    const data = [];
    
    // For each of the past n months
    for (let i = 0; i < months; i++) {
      const monthDate = new Date();
      monthDate.setMonth(today.getMonth() - i);
      monthDate.setDate(1); // First day of month
      
      const monthStart = new Date(monthDate);
      const monthEnd = new Date(monthDate);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0); // Last day of month
      
      const monthInvoices = invoices.filter(invoice => {
        const invoiceDate = new Date(invoice.issueDate);
        return invoiceDate >= monthStart && invoiceDate <= monthEnd;
      });
      
      const totalAmount = monthInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const paidAmount = monthInvoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total, 0);
      
      const monthName = monthDate.toLocaleString('default', { month: 'short' });
      
      data.unshift({
        month: monthName,
        year: monthDate.getFullYear(),
        total: totalAmount,
        paid: paidAmount,
        pending: totalAmount - paidAmount
      });
    }
    
    return data;
  }
}

// Export as a singleton
export default new DashboardService();