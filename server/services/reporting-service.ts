/**
 * Reporting Service
 * 
 * Provides data aggregation, analysis, and export functionality
 * for various business reports including:
 * - Revenue reports
 * - Customer reports
 * - Project reports
 * - Item sales reports
 */

import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { formatDate } from "../utils/date-utils";
import { 
  customers, 
  invoices, 
  invoiceItems, 
  projects, 
  quotes, 
  catalogItems,
  expenses,
  purchaseOrders
} from "@shared/schema";

/**
 * Report type identifier
 */
export type ReportType = 
  | "revenue" 
  | "sales_by_customer" 
  | "sales_by_item" 
  | "project_profitability"
  | "expenses_by_category"
  | "quotes_conversion";

/**
 * Interface for tenant filtering
 */
export interface TenantFilter {
  tenantId?: number;
}

/**
 * Options for filtering and customizing reports
 */
export interface ReportFilterOptions extends TenantFilter {
  startDate?: string;
  endDate?: string;
  customerId?: number;
  projectId?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

/**
 * Report output format
 */
export type ReportFormat = "json" | "csv";

/**
 * Reporting Service - Handles generating business reports and analytics
 */
export default class ReportingService {
  /**
   * Generate a report based on type and filter options
   */
  static async generateReport(
    reportType: ReportType, 
    options: ReportFilterOptions, 
    format: ReportFormat = "json"
  ): Promise<any> {
    try {
      let reportData: any;
      
      // Create SQL conditions for tenant filtering
      const tenantFilter = options.tenantId ? { tenantId: options.tenantId } : undefined;

      // Generate specific report based on type
      switch (reportType) {
        case "revenue":
          reportData = await this.generateRevenueReport(tenantFilter, options);
          break;
        case "sales_by_customer":
          reportData = await this.generateSalesByCustomerReport(tenantFilter, options);
          break;
        case "sales_by_item":
          reportData = await this.generateSalesByItemReport(tenantFilter, options);
          break;
        case "project_profitability":
          reportData = await this.generateProjectProfitabilityReport(tenantFilter, options);
          break;
        case "expenses_by_category":
          reportData = await this.generateExpensesByCategoryReport(options);
          break;
        case "quotes_conversion":
          reportData = await this.generateQuotesConversionReport(options);
          break;
        default:
          console.error(`Unknown report type: ${reportType}`);
          return null;
      }
      
      // Return report in requested format
      if (format === "csv" && reportData) {
        return this.convertToCSV(reportData);
      }
      
      return reportData;
    } catch (error) {
      console.error(`Error generating ${reportType} report:`, error);
      throw error;
    }
  }

  /**
   * Revenue Report - Shows total revenue over time
   */
  private static async generateRevenueReport(filter?: any, options?: ReportFilterOptions): Promise<any> {
    try {
      // Get all invoices matching filters
      let query = db.select({
        id: invoices.id,
        tenantId: invoices.tenantId,
        invoiceNumber: invoices.invoiceNumber,
        customerId: invoices.customerId,
        projectId: invoices.projectId,
        status: invoices.status,
        total: invoices.total,
        issueDate: invoices.issueDate,
        paidDate: invoices.paidDate,
        paid: invoices.paid
      })
      .from(invoices)
      .where(
        and(
          options?.startDate ? gte(invoices.issueDate, options.startDate) : undefined,
          options?.endDate ? lte(invoices.issueDate, options.endDate) : undefined,
          options?.tenantId ? eq(invoices.tenantId, options.tenantId) : undefined,
          options?.customerId ? eq(invoices.customerId, options.customerId) : undefined,
          options?.projectId ? eq(invoices.projectId, options.projectId) : undefined,
          options?.status && options.status !== 'all' ? eq(invoices.status, options.status) : undefined
        )
      );
      
      const allInvoices = await query;
      
      // Group invoices by month
      const groupBy = options?.sortBy || 'month';
      const revenueByPeriod: { [key: string]: { total: number, count: number, paid: number, unpaid: number } } = {};
      
      for (const invoice of allInvoices) {
        const date = new Date(invoice.issueDate);
        const period = formatDate(invoice.issueDate, groupBy);
        
        if (!revenueByPeriod[period]) {
          revenueByPeriod[period] = { total: 0, count: 0, paid: 0, unpaid: 0 };
        }
        
        revenueByPeriod[period].total += Number(invoice.total) || 0;
        revenueByPeriod[period].count += 1;
        
        if (invoice.paid) {
          revenueByPeriod[period].paid += Number(invoice.total) || 0;
        } else {
          revenueByPeriod[period].unpaid += Number(invoice.total) || 0;
        }
      }
      
      // Convert to array and sort
      const result = Object.entries(revenueByPeriod).map(([period, data]) => ({
        period,
        total: Number(data.total.toFixed(2)),
        count: data.count,
        paid: Number(data.paid.toFixed(2)),
        unpaid: Number(data.unpaid.toFixed(2)),
        paidPercentage: data.total > 0 ? Number((data.paid / data.total * 100).toFixed(1)) : 0
      }));
      
      // Sort by period
      result.sort((a, b) => {
        if (options?.sortOrder === 'desc') {
          return b.period.localeCompare(a.period);
        }
        return a.period.localeCompare(b.period);
      });
      
      return {
        summary: {
          totalRevenue: Number(result.reduce((sum, item) => sum + item.total, 0).toFixed(2)),
          totalPaid: Number(result.reduce((sum, item) => sum + item.paid, 0).toFixed(2)),
          totalUnpaid: Number(result.reduce((sum, item) => sum + item.unpaid, 0).toFixed(2)),
          invoiceCount: result.reduce((sum, item) => sum + item.count, 0),
          averageInvoice: result.reduce((sum, item) => sum + item.count, 0) > 0
            ? Number((result.reduce((sum, item) => sum + item.total, 0) / result.reduce((sum, item) => sum + item.count, 0)).toFixed(2))
            : 0,
          paidPercentage: result.reduce((sum, item) => sum + item.total, 0) > 0
            ? Number((result.reduce((sum, item) => sum + item.paid, 0) / result.reduce((sum, item) => sum + item.total, 0) * 100).toFixed(1))
            : 0
        },
        data: result
      };
    } catch (error) {
      console.error("Error generating revenue report:", error);
      throw error;
    }
  }

  /**
   * Sales by Customer Report - Shows sales grouped by customer
   */
  private static async generateSalesByCustomerReport(filter?: any, options?: ReportFilterOptions): Promise<any> {
    try {
      // Get all invoices with customer info
      const query = db.select({
        invoiceId: invoices.id,
        invoiceTotal: invoices.total,
        invoiceStatus: invoices.status,
        invoicePaid: invoices.paid,
        issueDate: invoices.issueDate,
        customerId: customers.id,
        customerName: customers.name,
        customerEmail: customers.email
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(
        and(
          options?.startDate ? gte(invoices.issueDate, options.startDate) : undefined,
          options?.endDate ? lte(invoices.issueDate, options.endDate) : undefined,
          options?.tenantId ? eq(invoices.tenantId, options.tenantId) : undefined,
          options?.customerId ? eq(invoices.customerId, options.customerId) : undefined,
          options?.status && options.status !== 'all' ? eq(invoices.status, options.status) : undefined
        )
      );
      
      const invoiceData = await query;
      
      // Group by customer
      const salesByCustomer: { [key: number]: any } = {};
      
      for (const row of invoiceData) {
        if (!row.customerId) continue;
        
        const customerId = Number(row.customerId);
        
        if (!salesByCustomer[customerId]) {
          salesByCustomer[customerId] = {
            customerId,
            customerName: row.customerName || 'Unknown',
            customerEmail: row.customerEmail || '',
            totalSales: 0,
            invoiceCount: 0,
            paidSales: 0,
            unpaidSales: 0,
            invoices: []
          };
        }
        
        const total = Number(row.invoiceTotal) || 0;
        salesByCustomer[customerId].totalSales += total;
        salesByCustomer[customerId].invoiceCount += 1;
        
        if (row.invoicePaid) {
          salesByCustomer[customerId].paidSales += total;
        } else {
          salesByCustomer[customerId].unpaidSales += total;
        }
        
        salesByCustomer[customerId].invoices.push({
          id: row.invoiceId,
          total,
          status: row.invoiceStatus,
          paid: row.invoicePaid,
          issueDate: row.issueDate
        });
      }
      
      // Convert to array and sort
      const result = Object.values(salesByCustomer).map(customer => ({
        ...customer,
        totalSales: Number(customer.totalSales.toFixed(2)),
        paidSales: Number(customer.paidSales.toFixed(2)),
        unpaidSales: Number(customer.unpaidSales.toFixed(2)),
        paidPercentage: customer.totalSales > 0 ? Number((customer.paidSales / customer.totalSales * 100).toFixed(1)) : 0,
        averageSale: customer.invoiceCount > 0 ? Number((customer.totalSales / customer.invoiceCount).toFixed(2)) : 0
      }));
      
      // Sort by selected field
      const sortField = options?.sortBy || 'totalSales';
      result.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return options?.sortOrder === 'desc' ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
        }
        
        return options?.sortOrder === 'desc' ? (bValue - aValue) : (aValue - bValue);
      });
      
      // Apply limit if specified
      const limitedResult = options?.limit ? result.slice(0, options.limit) : result;
      
      return {
        summary: {
          totalCustomers: result.length,
          totalSales: Number(result.reduce((sum, item) => sum + item.totalSales, 0).toFixed(2)),
          totalPaid: Number(result.reduce((sum, item) => sum + item.paidSales, 0).toFixed(2)),
          totalUnpaid: Number(result.reduce((sum, item) => sum + item.unpaidSales, 0).toFixed(2)),
          invoiceCount: result.reduce((sum, item) => sum + item.invoiceCount, 0),
          averageCustomerValue: result.length > 0
            ? Number((result.reduce((sum, item) => sum + item.totalSales, 0) / result.length).toFixed(2))
            : 0
        },
        data: limitedResult
      };
    } catch (error) {
      console.error("Error generating sales by customer report:", error);
      throw error;
    }
  }

  /**
   * Sales by Item Report - Shows item sales and revenue
   */
  private static async generateSalesByItemReport(filter?: any, options?: ReportFilterOptions): Promise<any> {
    try {
      // Get all invoice items with catalog info
      const query = db.select({
        itemId: invoiceItems.id,
        invoiceId: invoiceItems.invoiceId,
        catalogItemId: invoiceItems.catalogItemId,
        description: invoiceItems.description,
        quantity: invoiceItems.quantity,
        unitPrice: invoiceItems.unitPrice,
        total: invoiceItems.total,
        issueDate: invoices.issueDate,
        invoiceStatus: invoices.status,
        invoicePaid: invoices.paid,
        catalogName: catalogItems.name,
        catalogType: catalogItems.type,
        catalogCategory: catalogItems.category
      })
      .from(invoiceItems)
      .leftJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .leftJoin(catalogItems, eq(invoiceItems.catalogItemId, catalogItems.id))
      .where(
        and(
          options?.startDate ? gte(invoices.issueDate, options.startDate) : undefined,
          options?.endDate ? lte(invoices.issueDate, options.endDate) : undefined,
          options?.tenantId ? eq(invoices.tenantId, options.tenantId) : undefined,
          options?.status && options.status !== 'all' ? eq(invoices.status, options.status) : undefined
        )
      );
      
      const itemData = await query;
      
      // Group by item
      const salesByItem: { [key: string]: any } = {};
      
      for (const row of itemData) {
        // Use catalog item ID if available, otherwise use description as key
        const itemKey = row.catalogItemId ? `catalog-${row.catalogItemId}` : `desc-${row.description}`;
        
        if (!salesByItem[itemKey]) {
          salesByItem[itemKey] = {
            itemId: row.catalogItemId || null,
            itemName: row.catalogName || row.description,
            itemType: row.catalogType || 'custom',
            itemCategory: row.catalogCategory || 'uncategorized',
            totalSales: 0,
            totalQuantity: 0,
            averageUnitPrice: 0,
            occurrences: 0,
            paidSales: 0,
            unpaidSales: 0
          };
        }
        
        const total = Number(row.total) || 0;
        const quantity = Number(row.quantity) || 0;
        
        salesByItem[itemKey].totalSales += total;
        salesByItem[itemKey].totalQuantity += quantity;
        salesByItem[itemKey].occurrences += 1;
        
        if (row.invoicePaid) {
          salesByItem[itemKey].paidSales += total;
        } else {
          salesByItem[itemKey].unpaidSales += total;
        }
      }
      
      // Calculate averages and format numbers
      const result = Object.values(salesByItem).map(item => ({
        ...item,
        totalSales: Number(item.totalSales.toFixed(2)),
        paidSales: Number(item.paidSales.toFixed(2)),
        unpaidSales: Number(item.unpaidSales.toFixed(2)),
        averageUnitPrice: item.totalQuantity > 0 
          ? Number((item.totalSales / item.totalQuantity).toFixed(2)) 
          : 0,
        paidPercentage: item.totalSales > 0 ? Number((item.paidSales / item.totalSales * 100).toFixed(1)) : 0
      }));
      
      // Sort by selected field
      const sortField = options?.sortBy || 'totalSales';
      result.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return options?.sortOrder === 'desc' ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
        }
        
        return options?.sortOrder === 'desc' ? (bValue - aValue) : (aValue - bValue);
      });
      
      // Apply limit if specified
      const limitedResult = options?.limit ? result.slice(0, options.limit) : result;
      
      // Generate summary
      return {
        summary: {
          uniqueItems: result.length,
          totalSales: Number(result.reduce((sum, item) => sum + item.totalSales, 0).toFixed(2)),
          totalQuantity: result.reduce((sum, item) => sum + item.totalQuantity, 0),
          totalPaid: Number(result.reduce((sum, item) => sum + item.paidSales, 0).toFixed(2)),
          totalUnpaid: Number(result.reduce((sum, item) => sum + item.unpaidSales, 0).toFixed(2)),
          averageItemPrice: result.reduce((sum, item) => sum + item.totalQuantity, 0) > 0
            ? Number((result.reduce((sum, item) => sum + item.totalSales, 0) / result.reduce((sum, item) => sum + item.totalQuantity, 0)).toFixed(2))
            : 0
        },
        data: limitedResult
      };
    } catch (error) {
      console.error("Error generating sales by item report:", error);
      throw error;
    }
  }

  /**
   * Project Profitability Report - Shows revenue, costs, and profitability by project
   */
  private static async generateProjectProfitabilityReport(filter?: any, options?: ReportFilterOptions): Promise<any> {
    try {
      // Get all projects with related data
      const projectsQuery = db.select({
        projectId: projects.id,
        projectName: projects.name,
        projectStatus: projects.status,
        projectStart: projects.startDate,
        projectEnd: projects.endDate,
        customerId: projects.customerId,
        customerName: customers.name
      })
      .from(projects)
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .where(
        and(
          options?.tenantId ? eq(projects.tenantId, options.tenantId) : undefined,
          options?.customerId ? eq(projects.customerId, options.customerId) : undefined,
          options?.projectId ? eq(projects.id, options.projectId) : undefined,
          options?.status && options.status !== 'all' ? eq(projects.status, options.status) : undefined
        )
      );
      
      const projectsList = await projectsQuery;
      
      // Create result array
      const result = [];
      
      // For each project, collect revenue, expense, and purchase order data
      for (const project of projectsList) {
        // Get invoices for this project
        const invoicesQuery = db.select({
          id: invoices.id,
          total: invoices.total,
          paid: invoices.paid,
          status: invoices.status
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.projectId, project.projectId),
            options?.startDate ? gte(invoices.issueDate, options.startDate) : undefined,
            options?.endDate ? lte(invoices.issueDate, options.endDate) : undefined,
            options?.tenantId ? eq(invoices.tenantId, options.tenantId) : undefined
          )
        );
        
        const projectInvoices = await invoicesQuery;
        
        // Get expenses for this project
        const expensesQuery = db.select({
          id: expenses.id,
          amount: expenses.amount,
          category: expenses.category,
          date: expenses.date
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.projectId, project.projectId),
            options?.startDate ? gte(expenses.date, options.startDate) : undefined,
            options?.endDate ? lte(expenses.date, options.endDate) : undefined,
            options?.tenantId ? eq(expenses.tenantId, options.tenantId) : undefined
          )
        );
        
        const projectExpenses = await expensesQuery;
        
        // Get purchase orders for this project
        const purchaseOrdersQuery = db.select({
          id: purchaseOrders.id,
          total: purchaseOrders.total,
          status: purchaseOrders.status
        })
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.projectId, project.projectId),
            options?.startDate ? gte(purchaseOrders.issueDate, options.startDate) : undefined,
            options?.endDate ? lte(purchaseOrders.issueDate, options.endDate) : undefined,
            options?.tenantId ? eq(purchaseOrders.tenantId, options.tenantId) : undefined
          )
        );
        
        const projectPurchaseOrders = await purchaseOrdersQuery;
        
        // Calculate totals
        const totalRevenue = projectInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
        const totalPaidRevenue = projectInvoices.filter(inv => inv.paid).reduce((sum, inv) => sum + Number(inv.total || 0), 0);
        const totalExpenses = projectExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
        const totalPurchaseOrders = projectPurchaseOrders.reduce((sum, po) => sum + Number(po.total || 0), 0);
        const totalCosts = totalExpenses + totalPurchaseOrders;
        const profitAmount = totalRevenue - totalCosts;
        const profitMargin = totalRevenue > 0 ? (profitAmount / totalRevenue * 100) : 0;
        
        // Add project data to results
        result.push({
          projectId: project.projectId,
          projectName: project.projectName,
          projectStatus: project.projectStatus,
          customerId: project.customerId,
          customerName: project.customerName,
          startDate: project.projectStart,
          endDate: project.projectEnd,
          totalRevenue: Number(totalRevenue.toFixed(2)),
          totalPaidRevenue: Number(totalPaidRevenue.toFixed(2)),
          totalExpenses: Number(totalExpenses.toFixed(2)),
          totalPurchaseOrders: Number(totalPurchaseOrders.toFixed(2)),
          totalCosts: Number(totalCosts.toFixed(2)),
          profit: Number(profitAmount.toFixed(2)),
          profitMargin: Number(profitMargin.toFixed(1)),
          invoiceCount: projectInvoices.length,
          expenseCount: projectExpenses.length,
          purchaseOrderCount: projectPurchaseOrders.length
        });
      }
      
      // Sort by selected field
      const sortField = options?.sortBy || 'profit';
      result.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return options?.sortOrder === 'desc' ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
        }
        
        return options?.sortOrder === 'desc' ? (bValue - aValue) : (aValue - bValue);
      });
      
      // Apply limit if specified
      const limitedResult = options?.limit ? result.slice(0, options.limit) : result;
      
      // Generate summary
      return {
        summary: {
          projectCount: result.length,
          totalRevenue: Number(result.reduce((sum, item) => sum + item.totalRevenue, 0).toFixed(2)),
          totalPaidRevenue: Number(result.reduce((sum, item) => sum + item.totalPaidRevenue, 0).toFixed(2)),
          totalCosts: Number(result.reduce((sum, item) => sum + item.totalCosts, 0).toFixed(2)),
          totalProfit: Number(result.reduce((sum, item) => sum + item.profit, 0).toFixed(2)),
          averageProfitMargin: result.length > 0
            ? Number((result.reduce((sum, item) => sum + item.profitMargin, 0) / result.length).toFixed(1))
            : 0,
          profitableProjects: result.filter(item => item.profit > 0).length,
          unprofitableProjects: result.filter(item => item.profit <= 0).length
        },
        data: limitedResult
      };
    } catch (error) {
      console.error("Error generating project profitability report:", error);
      throw error;
    }
  }

  /**
   * Expenses by Category Report - Shows expenses grouped by category
   */
  private static async generateExpensesByCategoryReport(options: ReportFilterOptions): Promise<any> {
    try {
      // Get all expenses matching filters
      const query = db.select({
        id: expenses.id,
        category: expenses.category,
        amount: expenses.amount,
        date: expenses.date,
        description: expenses.description,
        projectId: expenses.projectId,
        projectName: projects.name
      })
      .from(expenses)
      .leftJoin(projects, eq(expenses.projectId, projects.id))
      .where(
        and(
          options?.startDate ? gte(expenses.date, options.startDate) : undefined,
          options?.endDate ? lte(expenses.date, options.endDate) : undefined,
          options?.tenantId ? eq(expenses.tenantId, options.tenantId) : undefined,
          options?.projectId ? eq(expenses.projectId, options.projectId) : undefined
        )
      );
      
      const expensesData = await query;
      
      // Group by category
      const expensesByCategory: { [key: string]: any } = {};
      
      for (const expense of expensesData) {
        const category = expense.category || 'Uncategorized';
        
        if (!expensesByCategory[category]) {
          expensesByCategory[category] = {
            category,
            totalAmount: 0,
            count: 0,
            expenses: []
          };
        }
        
        const amount = Number(expense.amount) || 0;
        expensesByCategory[category].totalAmount += amount;
        expensesByCategory[category].count += 1;
        expensesByCategory[category].expenses.push({
          id: expense.id,
          amount,
          date: expense.date,
          description: expense.description,
          projectId: expense.projectId,
          projectName: expense.projectName
        });
      }
      
      // Convert to array and calculate percentages
      const totalExpenses = Object.values(expensesByCategory).reduce((sum, cat) => sum + cat.totalAmount, 0);
      
      const result = Object.values(expensesByCategory).map(category => ({
        category: category.category,
        totalAmount: Number(category.totalAmount.toFixed(2)),
        count: category.count,
        percentage: totalExpenses > 0 ? Number(((category.totalAmount / totalExpenses) * 100).toFixed(1)) : 0,
        averageAmount: category.count > 0 ? Number((category.totalAmount / category.count).toFixed(2)) : 0
      }));
      
      // Sort by selected field
      const sortField = options?.sortBy || 'totalAmount';
      result.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return options?.sortOrder === 'desc' ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
        }
        
        return options?.sortOrder === 'desc' ? (bValue - aValue) : (aValue - bValue);
      });
      
      // Apply limit if specified
      const limitedResult = options?.limit ? result.slice(0, options.limit) : result;
      
      return {
        summary: {
          totalCategories: result.length,
          totalExpenses: Number(totalExpenses.toFixed(2)),
          expenseCount: expensesData.length,
          averageExpense: expensesData.length > 0 
            ? Number((totalExpenses / expensesData.length).toFixed(2)) 
            : 0
        },
        data: limitedResult
      };
    } catch (error) {
      console.error("Error generating expenses by category report:", error);
      throw error;
    }
  }

  /**
   * Quotes Conversion Report - Shows quote to invoice conversion rates
   */
  private static async generateQuotesConversionReport(options: ReportFilterOptions): Promise<any> {
    try {
      // Get all quotes matching filters
      const quotesQuery = db.select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        status: quotes.status,
        total: quotes.total,
        createdAt: quotes.createdAt,
        customerId: quotes.customerId,
        customerName: customers.name,
        projectId: quotes.projectId,
        projectName: projects.name
      })
      .from(quotes)
      .leftJoin(customers, eq(quotes.customerId, customers.id))
      .leftJoin(projects, eq(quotes.projectId, projects.id))
      .where(
        and(
          options?.startDate ? gte(quotes.createdAt, new Date(options.startDate)) : undefined,
          options?.endDate ? lte(quotes.createdAt, new Date(options.endDate)) : undefined,
          options?.tenantId ? eq(quotes.tenantId, options.tenantId) : undefined,
          options?.customerId ? eq(quotes.customerId, options.customerId) : undefined,
          options?.projectId ? eq(quotes.projectId, options.projectId) : undefined,
          options?.status && options.status !== 'all' ? eq(quotes.status, options.status) : undefined
        )
      );
      
      const quotesData = await quotesQuery;
      
      // For each quote, check if there's an invoice with this quote as reference
      const result = [];
      
      for (const quote of quotesData) {
        // Find associated invoice
        const invoicesQuery = db.select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          total: invoices.total,
          status: invoices.status,
          issueDate: invoices.issueDate,
          paid: invoices.paid
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.quoteId, quote.id),
            options?.tenantId ? eq(invoices.tenantId, options.tenantId) : undefined
          )
        );
        
        const associatedInvoices = await invoicesQuery;
        const converted = associatedInvoices.length > 0;
        const conversionDays = converted && associatedInvoices[0].issueDate
          ? Math.round((new Date(associatedInvoices[0].issueDate).getTime() - new Date(quote.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        result.push({
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          quoteStatus: quote.status,
          quoteTotal: Number(quote.total),
          quoteDate: quote.createdAt,
          customerId: quote.customerId,
          customerName: quote.customerName,
          projectId: quote.projectId,
          projectName: quote.projectName,
          converted,
          invoiceId: converted ? associatedInvoices[0].id : null,
          invoiceNumber: converted ? associatedInvoices[0].invoiceNumber : null,
          invoiceTotal: converted ? Number(associatedInvoices[0].total) : null,
          invoiceDate: converted ? associatedInvoices[0].issueDate : null,
          invoiceStatus: converted ? associatedInvoices[0].status : null,
          invoicePaid: converted ? associatedInvoices[0].paid : null,
          conversionDays
        });
      }
      
      // Sort by selected field
      const sortField = options?.sortBy || 'quoteDate';
      result.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return options?.sortOrder === 'desc' ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
        } else if (aValue instanceof Date && bValue instanceof Date) {
          return options?.sortOrder === 'desc' ? bValue.getTime() - aValue.getTime() : aValue.getTime() - bValue.getTime();
        }
        
        return options?.sortOrder === 'desc' ? (bValue - aValue) : (aValue - bValue);
      });
      
      // Apply limit if specified
      const limitedResult = options?.limit ? result.slice(0, options.limit) : result;
      
      // Generate summary
      const convertedQuotes = result.filter(q => q.converted);
      const conversionRate = result.length > 0 ? (convertedQuotes.length / result.length * 100) : 0;
      const avgConversionDays = convertedQuotes.length > 0
        ? convertedQuotes.reduce((sum, q) => sum + (q.conversionDays || 0), 0) / convertedQuotes.length
        : 0;
      
      return {
        summary: {
          totalQuotes: result.length,
          convertedQuotes: convertedQuotes.length,
          pendingQuotes: result.filter(q => !q.converted && q.quoteStatus !== 'rejected').length,
          rejectedQuotes: result.filter(q => q.quoteStatus === 'rejected').length,
          conversionRate: Number(conversionRate.toFixed(1)),
          averageConversionDays: Number(avgConversionDays.toFixed(1)),
          totalQuoteValue: Number(result.reduce((sum, q) => sum + q.quoteTotal, 0).toFixed(2)),
          totalConvertedValue: Number(convertedQuotes.reduce((sum, q) => sum + q.quoteTotal, 0).toFixed(2))
        },
        data: limitedResult
      };
    } catch (error) {
      console.error("Error generating quotes conversion report:", error);
      throw error;
    }
  }

  /**
   * Convert a JSON report to CSV format
   */
  private static convertToCSV(data: any): string {
    if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
      return "No data available";
    }
    
    // Extract headers from the first item
    const headers = Object.keys(data.data[0]);
    
    // Convert data to 2D array
    const rows = [headers];
    
    // Add each data row
    data.data.forEach((item: any) => {
      const row = headers.map(header => {
        const value = item[header];
        
        // Handle different value types
        if (value === null || value === undefined) {
          return '';
        } else if (typeof value === 'object') {
          if (value instanceof Date) {
            return value.toISOString();
          }
          return JSON.stringify(value);
        }
        
        return value.toString();
      });
      
      rows.push(row);
    });
    
    // Add summary as additional rows if available
    if (data.summary) {
      rows.push([]);
      rows.push(['Summary']);
      
      Object.entries(data.summary).forEach(([key, value]) => {
        rows.push([key, value as string]);
      });
    }
    
    return this.arrayToCSV(rows);
  }

  /**
   * Convert a 2D array to CSV string
   */
  private static arrayToCSV(data: any[][]): string {
    return data.map(row => 
      row.map(value => {
        // If the value contains commas, quotes, or newlines, enclose in quotes
        const stringValue = String(value).replace(/"/g, '""');
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue}"`;
        }
        return stringValue;
      }).join(',')
    ).join('\n');
  }
}