/**
 * Reporting Routes
 * 
 * API endpoints for generating and exporting various business reports
 */
import { Express, Request, Response } from "express";
import { requireAuth } from "../middleware/auth-middleware";
import ReportingService, { ReportFilterOptions, ReportType } from "../services/reporting-service";
import { getDateRange } from "../utils/date-utils";

export function registerReportingRoutes(app: Express): void {
  /**
   * Get available report types
   */
  app.get('/api/reports/types', requireAuth, async (req: Request, res: Response) => {
    try {
      const reportTypes = [
        { id: "revenue", name: "Revenue Report", description: "Shows total revenue over time" },
        { id: "sales_by_customer", name: "Sales by Customer", description: "Shows sales grouped by customer" },
        { id: "sales_by_item", name: "Sales by Item", description: "Shows item sales and revenue" },
        { id: "project_profitability", name: "Project Profitability", description: "Shows revenue, costs, and profitability by project" },
        { id: "expenses_by_category", name: "Expenses by Category", description: "Shows expenses grouped by category" },
        { id: "quotes_conversion", name: "Quotes Conversion", description: "Shows quote to invoice conversion rates" }
      ];
      
      res.json({ success: true, reportTypes });
    } catch (error) {
      console.error("Error fetching report types:", error);
      res.status(500).json({ success: false, message: "Failed to fetch report types" });
    }
  });
  
  /**
   * Get date range presets for report filters
   */
  app.get('/api/reports/date-ranges', requireAuth, async (req: Request, res: Response) => {
    try {
      const dateRanges = [
        { id: "today", name: "Today" },
        { id: "yesterday", name: "Yesterday" },
        { id: "this_week", name: "This Week" },
        { id: "last_week", name: "Last Week" },
        { id: "this_month", name: "This Month" },
        { id: "last_month", name: "Last Month" },
        { id: "this_year", name: "This Year" },
        { id: "last_year", name: "Last Year" },
        { id: "last_7_days", name: "Last 7 Days" },
        { id: "last_30_days", name: "Last 30 Days" },
        { id: "last_90_days", name: "Last 90 Days" },
        { id: "last_365_days", name: "Last 365 Days" }
      ];
      
      res.json({ success: true, dateRanges });
    } catch (error) {
      console.error("Error fetching date ranges:", error);
      res.status(500).json({ success: false, message: "Failed to fetch date ranges" });
    }
  });
  
  /**
   * Generate a report
   */
  app.get('/api/reports/:reportType', requireAuth, async (req: Request, res: Response) => {
    try {
      const reportType = req.params.reportType as ReportType;
      const tenantId = req.tenant?.id;
      
      // Extract filter parameters from query string
      const { 
        startDate = getDateRange('last_30_days').startDate, 
        endDate = getDateRange('last_30_days').endDate,
        customerId, 
        projectId, 
        status = 'all',
        sortBy = 'date',
        sortOrder = 'desc',
        limit = 100
      } = req.query;
      
      // Create filter options object
      const filterOptions: ReportFilterOptions = {
        tenantId,
        startDate: startDate as string,
        endDate: endDate as string,
        customerId: customerId ? Number(customerId) : undefined,
        projectId: projectId ? Number(projectId) : undefined,
        status: status as string,
        sortBy: sortBy as string,
        sortOrder: (sortOrder as 'asc' | 'desc'),
        limit: limit ? Number(limit) : undefined
      };
      
      // Get date range if specified by preset
      if (req.query.dateRange && typeof req.query.dateRange === 'string') {
        const range = getDateRange(req.query.dateRange);
        filterOptions.startDate = range.startDate;
        filterOptions.endDate = range.endDate;
      }
      
      const report = await ReportingService.generateReport(reportType, filterOptions);
      
      if (!report) {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid report type: ${reportType}` 
        });
      }
      
      res.json({
        success: true,
        report: {
          type: reportType,
          filters: filterOptions,
          data: report
        }
      });
    } catch (error) {
      console.error(`Error generating ${req.params.reportType} report:`, error);
      res.status(500).json({ 
        success: false, 
        message: `Failed to generate ${req.params.reportType} report` 
      });
    }
  });
  
  /**
   * Export a report as CSV
   */
  app.get('/api/reports/:reportType/export', requireAuth, async (req: Request, res: Response) => {
    try {
      const reportType = req.params.reportType as ReportType;
      const tenantId = req.tenant?.id;
      
      // Extract filter parameters from query string
      const { 
        startDate = getDateRange('last_30_days').startDate, 
        endDate = getDateRange('last_30_days').endDate,
        customerId, 
        projectId, 
        status = 'all',
        sortBy = 'date',
        sortOrder = 'desc'
      } = req.query;
      
      // Create filter options object
      const filterOptions: ReportFilterOptions = {
        tenantId,
        startDate: startDate as string,
        endDate: endDate as string,
        customerId: customerId ? Number(customerId) : undefined,
        projectId: projectId ? Number(projectId) : undefined,
        status: status as string,
        sortBy: sortBy as string,
        sortOrder: (sortOrder as 'asc' | 'desc')
      };
      
      // Get date range if specified by preset
      if (req.query.dateRange && typeof req.query.dateRange === 'string') {
        const range = getDateRange(req.query.dateRange);
        filterOptions.startDate = range.startDate;
        filterOptions.endDate = range.endDate;
      }
      
      const csvData = await ReportingService.generateReport(
        reportType, 
        filterOptions, 
        "csv"
      );
      
      if (!csvData) {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid report type: ${reportType}` 
        });
      }
      
      // Set CSV headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${reportType}_report.csv`);
      
      // Send CSV data
      res.send(csvData);
    } catch (error) {
      console.error(`Error exporting ${req.params.reportType} report:`, error);
      res.status(500).json({ 
        success: false, 
        message: `Failed to export ${req.params.reportType} report` 
      });
    }
  });
}