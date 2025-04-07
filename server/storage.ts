import * as schema from "@shared/schema";
import EmailService from './services/email-service';
import { 
  type Tenant,
  type InsertTenant,
  type User, 
  type InsertUser, 
  type Customer, 
  type InsertCustomer,
  type Project,
  type InsertProject,
  type Quote,
  type InsertQuote,
  type QuoteItem,
  type InsertQuoteItem,
  type Invoice,
  type InsertInvoice,
  type InvoiceItem,
  type InsertInvoiceItem,
  type Employee,
  type InsertEmployee,
  type Timesheet,
  type InsertTimesheet,
  type Survey,
  type InsertSurvey,
  type Installation,
  type InsertInstallation,
  type TaskList,
  type InsertTaskList,
  type Task,
  type InsertTask,
  type CatalogItem,
  type InsertCatalogItem,
  type CompanySettings,
  type InsertCompanySettings,
  type SystemSettings,
  type InsertSystemSettings,
  type Supplier,
  type InsertSupplier,
  type Expense,
  type InsertExpense,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type PurchaseOrderItem,
  type InsertPurchaseOrderItem,
  type FileAttachment,
  type InsertFileAttachment,
  type InventoryItem,
  type InsertInventoryItem,
  type InventoryTransaction,
  type UserInvitation,
  type InsertUserInvitation,
  type InsertInventoryTransaction
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { client } from "./db"; // Import postgres client for session store
import { eq, and, asc, desc, between, isNotNull, sql } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Common interface for tenant-specific filters
export interface TenantFilter {
  tenantId?: number;
}

// Interface for storage operations
export interface IStorage {
  // Tenants
  getTenant(id: number): Promise<Tenant | undefined>;
  getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: number, tenant: Partial<Tenant>): Promise<Tenant | undefined>;
  deleteTenant(id: number): Promise<boolean>;
  getAllTenants(): Promise<Tenant[]>;
  
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string, tenantId?: number): Promise<User | undefined>;
  getUserByEmail(email: string, tenantId?: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(filter?: TenantFilter): Promise<User[]>;
  
  // Customers
  getCustomer(id: number, tenantId?: number): Promise<Customer | undefined>;
  getCustomerByName(name: string, tenantId?: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<Customer>, tenantId?: number): Promise<Customer | undefined>;
  deleteCustomer(id: number, tenantId?: number): Promise<boolean>;
  getAllCustomers(filter?: TenantFilter): Promise<Customer[]>;
  
  // Projects
  getProject(id: number, tenantId?: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>, tenantId?: number): Promise<Project | undefined>;
  deleteProject(id: number, tenantId?: number): Promise<boolean>;
  getAllProjects(filter?: TenantFilter): Promise<Project[]>;
  getProjectsByCustomer(customerId: number, tenantId?: number): Promise<Project[]>;
  getProjectsByStatus(status: string, tenantId?: number): Promise<Project[]>;
  
  // Quotes
  getQuote(id: number, tenantId?: number): Promise<Quote | undefined>;
  getQuoteByNumber(quoteNumber: string, tenantId?: number): Promise<Quote | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: number, quote: Partial<Quote>, tenantId?: number): Promise<Quote | undefined>;
  deleteQuote(id: number, tenantId?: number): Promise<boolean>;
  getAllQuotes(filter?: TenantFilter): Promise<Quote[]>;
  getQuotesByProject(projectId: number, tenantId?: number): Promise<Quote[]>;
  getQuotesByCustomer(customerId: number, tenantId?: number): Promise<Quote[]>;
  getQuotesByStatus(status: string, tenantId?: number): Promise<Quote[]>;
  
  // Quote Items
  getQuoteItem(id: number): Promise<QuoteItem | undefined>;
  createQuoteItem(quoteItem: InsertQuoteItem): Promise<QuoteItem>;
  updateQuoteItem(id: number, quoteItem: Partial<QuoteItem>): Promise<QuoteItem | undefined>;
  deleteQuoteItem(id: number): Promise<boolean>;
  getQuoteItemsByQuote(quoteId: number): Promise<QuoteItem[]>;
  
  // Invoices
  getInvoice(id: number, tenantId?: number): Promise<Invoice | undefined>;
  getInvoiceByNumber(invoiceNumber: string, tenantId?: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<Invoice>, tenantId?: number): Promise<Invoice | undefined>;
  deleteInvoice(id: number, tenantId?: number): Promise<boolean>;
  getAllInvoices(filter?: TenantFilter): Promise<Invoice[]>;
  getInvoicesByProject(projectId: number, tenantId?: number): Promise<Invoice[]>;
  getInvoicesByCustomer(customerId: number, tenantId?: number): Promise<Invoice[]>;
  getInvoicesByStatus(status: string, tenantId?: number): Promise<Invoice[]>;
  
  // Invoice Items
  getInvoiceItem(id: number): Promise<InvoiceItem | undefined>;
  createInvoiceItem(invoiceItem: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceItem(id: number, invoiceItem: Partial<InvoiceItem>): Promise<InvoiceItem | undefined>;
  deleteInvoiceItem(id: number): Promise<boolean>;
  getInvoiceItemsByInvoice(invoiceId: number): Promise<InvoiceItem[]>;
  
  // Employees
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeeByUserId(userId: number): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<Employee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<boolean>;
  getAllEmployees(): Promise<Employee[]>;
  
  // Timesheets
  getTimesheet(id: number): Promise<Timesheet | undefined>;
  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  updateTimesheet(id: number, timesheet: Partial<Timesheet>): Promise<Timesheet | undefined>;
  deleteTimesheet(id: number): Promise<boolean>;
  getAllTimesheets(): Promise<Timesheet[]>;
  getTimesheetsByEmployee(employeeId: number): Promise<Timesheet[]>;
  getTimesheetsByProject(projectId: number): Promise<Timesheet[]>;
  getTimesheetsByDateRange(startDate: Date, endDate: Date): Promise<Timesheet[]>;
  
  // Surveys
  getSurvey(id: number): Promise<Survey | undefined>;
  createSurvey(survey: InsertSurvey): Promise<Survey>;
  updateSurvey(id: number, survey: Partial<Survey>): Promise<Survey | undefined>;
  deleteSurvey(id: number): Promise<boolean>;
  getAllSurveys(): Promise<Survey[]>;
  getSurveysByProject(projectId: number): Promise<Survey[]>;
  getSurveysByStatus(status: string): Promise<Survey[]>;
  getSurveysByDateRange(startDate: Date, endDate: Date): Promise<Survey[]>;
  
  // Installations
  getInstallation(id: number): Promise<Installation | undefined>;
  createInstallation(installation: InsertInstallation): Promise<Installation>;
  updateInstallation(id: number, installation: Partial<Installation>): Promise<Installation | undefined>;
  deleteInstallation(id: number): Promise<boolean>;
  getAllInstallations(): Promise<Installation[]>;
  getInstallationsByProject(projectId: number): Promise<Installation[]>;
  getInstallationsByStatus(status: string): Promise<Installation[]>;
  getInstallationsByDateRange(startDate: Date, endDate: Date): Promise<Installation[]>;
  
  // Task Lists
  getTaskList(id: number): Promise<TaskList | undefined>;
  createTaskList(taskList: InsertTaskList): Promise<TaskList>;
  updateTaskList(id: number, taskList: Partial<TaskList>): Promise<TaskList | undefined>;
  deleteTaskList(id: number): Promise<boolean>;
  getAllTaskLists(): Promise<TaskList[]>;
  getTaskListsByProject(projectId: number): Promise<TaskList[]>;
  
  // Tasks
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  getTasksByTaskList(taskListId: number): Promise<Task[]>;
  getTasksByAssignee(userId: number): Promise<Task[]>;
  
  // Catalog Items
  getCatalogItem(id: number, tenantId?: number): Promise<CatalogItem | undefined>;
  createCatalogItem(item: InsertCatalogItem): Promise<CatalogItem>;
  updateCatalogItem(id: number, item: Partial<CatalogItem>, tenantId?: number): Promise<CatalogItem | undefined>;
  deleteCatalogItem(id: number, tenantId?: number): Promise<boolean>;
  getAllCatalogItems(tenantId?: number): Promise<CatalogItem[]>;
  getCatalogItemsByCategory(category: string, tenantId?: number): Promise<CatalogItem[]>;
  getCatalogItemsByType(type: string, tenantId?: number): Promise<CatalogItem[]>;
  getCatalogItemsByUser(userId: number, tenantId?: number): Promise<CatalogItem[]>;
  
  // Company Settings
  getCompanySettings(): Promise<CompanySettings | undefined>;
  createCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings>;
  updateCompanySettings(id: number, settings: Partial<CompanySettings>): Promise<CompanySettings | undefined>;
  
  // System Settings
  getSystemSettings(): Promise<SystemSettings | undefined>;
  createSystemSettings(settings: InsertSystemSettings): Promise<SystemSettings>;
  updateSystemSettings(id: number, settings: Partial<SystemSettings>): Promise<SystemSettings | undefined>;
  
  // Suppliers
  getSupplier(id: number): Promise<Supplier | undefined>;
  getSupplierByName(name: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<Supplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<boolean>;
  getAllSuppliers(): Promise<Supplier[]>;
  getSuppliersByCategory(category: string): Promise<Supplier[]>;
  
  // Expenses
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<Expense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;
  getAllExpenses(): Promise<Expense[]>;
  getExpensesByProject(projectId: number): Promise<Expense[]>;
  getExpensesBySupplier(supplierId: number): Promise<Expense[]>;
  getExpensesByCategory(category: string): Promise<Expense[]>;
  getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]>;
  
  // Purchase Orders
  getPurchaseOrder(id: number, filter?: TenantFilter): Promise<PurchaseOrder | undefined>;
  getPurchaseOrderByNumber(poNumber: string): Promise<PurchaseOrder | undefined>;
  createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: number, po: Partial<PurchaseOrder>): Promise<PurchaseOrder | undefined>;
  deletePurchaseOrder(id: number): Promise<boolean>;
  getAllPurchaseOrders(filter?: TenantFilter): Promise<PurchaseOrder[]>;
  getPurchaseOrdersByProject(projectId: number, filter?: TenantFilter): Promise<PurchaseOrder[]>;
  getPurchaseOrdersBySupplier(supplierId: number, filter?: TenantFilter): Promise<PurchaseOrder[]>;
  getPurchaseOrdersByStatus(status: string, filter?: TenantFilter): Promise<PurchaseOrder[]>;
  
  // Purchase Order Items
  getPurchaseOrderItem(id: number, filter?: TenantFilter): Promise<PurchaseOrderItem | undefined>;
  createPurchaseOrderItem(item: InsertPurchaseOrderItem): Promise<PurchaseOrderItem>;
  updatePurchaseOrderItem(id: number, item: Partial<PurchaseOrderItem>): Promise<PurchaseOrderItem | undefined>;
  deletePurchaseOrderItem(id: number): Promise<boolean>;
  getPurchaseOrderItemsByPO(purchaseOrderId: number, filter?: TenantFilter): Promise<PurchaseOrderItem[]>;
  
  // Inventory Items
  getInventoryItem(id: number): Promise<InventoryItem | undefined>;
  getInventoryItemBySku(sku: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: number, item: Partial<InventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: number): Promise<boolean>;
  getAllInventoryItems(filter?: TenantFilter): Promise<InventoryItem[]>;
  getInventoryItemsByCategory(category: string, filter?: TenantFilter): Promise<InventoryItem[]>;
  getInventoryItemsBySupplier(supplierId: number, filter?: TenantFilter): Promise<InventoryItem[]>;
  getLowStockItems(filter?: TenantFilter): Promise<InventoryItem[]>;
  
  // Inventory Transactions
  getInventoryTransaction(id: number): Promise<InventoryTransaction | undefined>;
  createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction>;
  updateInventoryTransaction(id: number, transaction: Partial<InventoryTransaction>): Promise<InventoryTransaction | undefined>;
  deleteInventoryTransaction(id: number): Promise<boolean>;
  getInventoryTransactionsByItem(inventoryItemId: number, filter?: TenantFilter): Promise<InventoryTransaction[]>;
  getInventoryTransactionsByProject(projectId: number, filter?: TenantFilter): Promise<InventoryTransaction[]>;
  getInventoryTransactionsByPO(purchaseOrderId: number, filter?: TenantFilter): Promise<InventoryTransaction[]>;
  getInventoryTransactionsByType(transactionType: string, filter?: TenantFilter): Promise<InventoryTransaction[]>;
  getInventoryTransactionsByDateRange(startDate: Date, endDate: Date, filter?: TenantFilter): Promise<InventoryTransaction[]>;
  
  // File Attachments
  getFileAttachment(id: number): Promise<FileAttachment | undefined>;
  createFileAttachment(file: InsertFileAttachment): Promise<FileAttachment>;
  deleteFileAttachment(id: number): Promise<boolean>;
  getFileAttachmentsByRelatedEntity(relatedType: string, relatedId: number): Promise<FileAttachment[]>;
  
  // User Invitations
  getUserInvitation(id: number): Promise<UserInvitation | undefined>;
  getUserInvitationByToken(token: string): Promise<UserInvitation | undefined>;
  getUserInvitationsByTenant(tenantId: number): Promise<UserInvitation[]>;
  getUserInvitationsByEmail(email: string, tenantId: number): Promise<UserInvitation[]>; 
  createUserInvitation(invitation: InsertUserInvitation): Promise<UserInvitation>;
  updateUserInvitation(id: number, invitation: Partial<UserInvitation>): Promise<UserInvitation | undefined>;
  deleteUserInvitation(id: number): Promise<boolean>;
  
  // Session store
  sessionStore: any; // Using any to fix Express session store type issue
}

export class MemStorage implements IStorage {
  // In-memory storage
  private users: Map<number, User>;
  private customers: Map<number, Customer>;
  private projects: Map<number, Project>;
  private quotes: Map<number, Quote>;
  private quoteItems: Map<number, QuoteItem>;
  private invoices: Map<number, Invoice>;
  private invoiceItems: Map<number, InvoiceItem>;
  private employees: Map<number, Employee>;
  private timesheets: Map<number, Timesheet>;
  private surveys: Map<number, Survey>;
  private installations: Map<number, Installation>;
  private taskLists: Map<number, TaskList>;
  private tasks: Map<number, Task>;
  private catalogItems: Map<number, CatalogItem>;
  private companySettings: Map<number, CompanySettings>;
  private systemSettings: Map<number, SystemSettings>;
  private suppliers: Map<number, Supplier>;
  private expenses: Map<number, Expense>;
  private purchaseOrders: Map<number, PurchaseOrder>;
  private purchaseOrderItems: Map<number, PurchaseOrderItem>;
  private inventoryItems: Map<number, InventoryItem>;
  private inventoryTransactions: Map<number, InventoryTransaction>;
  private fileAttachments: Map<number, FileAttachment>;
  private tenants: Map<number, Tenant>;
  private userInvitations: Map<number, UserInvitation>;
  
  // Auto-incrementing IDs
  private userId: number;
  private customerId: number;
  private projectId: number;
  private quoteId: number;
  private quoteItemId: number;
  private invoiceId: number;
  private invoiceItemId: number;
  private employeeId: number;
  private timesheetId: number;
  private surveyId: number;
  private installationId: number;
  private taskListId: number;
  private taskId: number;
  private catalogItemId: number;
  private companySettingsId: number;
  private systemSettingsId: number;
  private supplierId: number;
  private expenseId: number;
  private purchaseOrderId: number;
  private purchaseOrderItemId: number;
  private inventoryItemId: number;
  private inventoryTransactionId: number;
  private fileAttachmentId: number;
  private tenantId: number;
  private userInvitationId: number;
  
  // Session store
  sessionStore: any; // Using any for Express session store type issue

  constructor() {
    this.users = new Map();
    this.customers = new Map();
    this.projects = new Map();
    this.quotes = new Map();
    this.quoteItems = new Map();
    this.invoices = new Map();
    this.invoiceItems = new Map();
    this.employees = new Map();
    this.timesheets = new Map();
    this.surveys = new Map();
    this.installations = new Map();
    this.taskLists = new Map();
    this.tasks = new Map();
    this.catalogItems = new Map();
    this.companySettings = new Map();
    this.systemSettings = new Map();
    this.suppliers = new Map();
    this.expenses = new Map();
    this.purchaseOrders = new Map();
    this.purchaseOrderItems = new Map();
    this.inventoryItems = new Map();
    this.inventoryTransactions = new Map();
    this.fileAttachments = new Map();
    this.tenants = new Map();
    this.userInvitations = new Map();
    
    this.userId = 1;
    this.customerId = 1;
    this.projectId = 1;
    this.quoteId = 1;
    this.quoteItemId = 1;
    this.invoiceId = 1;
    this.invoiceItemId = 1;
    this.employeeId = 1;
    this.timesheetId = 1;
    this.surveyId = 1;
    this.installationId = 1;
    this.taskListId = 1;
    this.taskId = 1;
    this.catalogItemId = 1;
    this.companySettingsId = 1;
    this.systemSettingsId = 1;
    this.supplierId = 1;
    this.expenseId = 1;
    this.purchaseOrderId = 1;
    this.purchaseOrderItemId = 1;
    this.inventoryItemId = 1;
    this.inventoryTransactionId = 1;
    this.fileAttachmentId = 1;
    this.tenantId = 1;
    this.userInvitationId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }
  
  async getUserByEmail(email: string, tenantId?: number): Promise<User | undefined> {
    if (tenantId) {
      return Array.from(this.users.values()).find(user => 
        user.email === email && user.tenantId === tenantId
      );
    }
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const newUser: User = { ...user, id, createdAt: new Date() };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getCustomerByName(name: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(customer => customer.name === name);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = this.customerId++;
    const newCustomer: Customer = { ...customer, id, createdAt: new Date() };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }

  async updateCustomer(id: number, customerData: Partial<Customer>): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (!customer) return undefined;
    
    const updatedCustomer = { ...customer, ...customerData };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    return this.customers.delete(id);
  }

  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = this.projectId++;
    const newProject: Project = { ...project, id, createdAt: new Date() };
    this.projects.set(id, newProject);
    return newProject;
  }

  async updateProject(id: number, projectData: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = { ...project, ...projectData };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    return this.projects.delete(id);
  }

  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProjectsByCustomer(customerId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(project => project.customerId === customerId);
  }

  async getProjectsByStatus(status: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(project => project.status === status);
  }

  // Quote methods
  async getQuote(id: number, tenantId?: number): Promise<Quote | undefined> {
    const quote = this.quotes.get(id);
    // If tenantId is provided, filter by tenant
    if (tenantId !== undefined && quote) {
      return quote.tenantId === tenantId ? quote : undefined;
    }
    return quote;
  }

  async getQuoteByNumber(quoteNumber: string, tenantId?: number): Promise<Quote | undefined> {
    const quote = Array.from(this.quotes.values()).find(quote => quote.quoteNumber === quoteNumber);
    // If tenantId is provided, filter by tenant
    if (tenantId !== undefined && quote) {
      return quote.tenantId === tenantId ? quote : undefined;
    }
    return quote;
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const id = this.quoteId++;
    const newQuote: Quote = { ...quote, id, createdAt: new Date() };
    this.quotes.set(id, newQuote);
    return newQuote;
  }

  async updateQuote(id: number, quoteData: Partial<Quote>): Promise<Quote | undefined> {
    const quote = this.quotes.get(id);
    if (!quote) return undefined;
    
    const updatedQuote = { ...quote, ...quoteData };
    this.quotes.set(id, updatedQuote);
    return updatedQuote;
  }

  async deleteQuote(id: number): Promise<boolean> {
    return this.quotes.delete(id);
  }

  async getAllQuotes(): Promise<Quote[]> {
    return Array.from(this.quotes.values());
  }

  async getQuotesByProject(projectId: number): Promise<Quote[]> {
    return Array.from(this.quotes.values()).filter(quote => quote.projectId === projectId);
  }

  async getQuotesByCustomer(customerId: number): Promise<Quote[]> {
    return Array.from(this.quotes.values()).filter(quote => quote.customerId === customerId);
  }

  async getQuotesByStatus(status: string): Promise<Quote[]> {
    return Array.from(this.quotes.values()).filter(quote => quote.status === status);
  }

  // Quote Item methods
  async getQuoteItem(id: number): Promise<QuoteItem | undefined> {
    return this.quoteItems.get(id);
  }

  async createQuoteItem(quoteItem: InsertQuoteItem): Promise<QuoteItem> {
    const id = this.quoteItemId++;
    const newQuoteItem: QuoteItem = { ...quoteItem, id };
    this.quoteItems.set(id, newQuoteItem);
    return newQuoteItem;
  }

  async updateQuoteItem(id: number, quoteItemData: Partial<QuoteItem>): Promise<QuoteItem | undefined> {
    const quoteItem = this.quoteItems.get(id);
    if (!quoteItem) return undefined;
    
    const updatedQuoteItem = { ...quoteItem, ...quoteItemData };
    this.quoteItems.set(id, updatedQuoteItem);
    return updatedQuoteItem;
  }

  async deleteQuoteItem(id: number): Promise<boolean> {
    return this.quoteItems.delete(id);
  }

  async getQuoteItemsByQuote(quoteId: number): Promise<QuoteItem[]> {
    return Array.from(this.quoteItems.values()).filter(item => item.quoteId === quoteId);
  }

  // Invoice methods
  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined> {
    return Array.from(this.invoices.values()).find(invoice => invoice.invoiceNumber === invoiceNumber);
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const id = this.invoiceId++;
    const newInvoice: Invoice = { ...invoice, id, createdAt: new Date() };
    this.invoices.set(id, newInvoice);
    return newInvoice;
  }

  async updateInvoice(id: number, invoiceData: Partial<Invoice>): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    
    const updatedInvoice = { ...invoice, ...invoiceData };
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    return this.invoices.delete(id);
  }

  async getAllInvoices(filter?: TenantFilter): Promise<Invoice[]> {
    const invoices = Array.from(this.invoices.values());
    if (filter && 'tenantId' in filter) {
      return invoices.filter(invoice => invoice.tenantId === filter.tenantId);
    }
    return invoices;
  }

  async getInvoicesByProject(projectId: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(invoice => invoice.projectId === projectId);
  }

  async getInvoicesByCustomer(customerId: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(invoice => invoice.customerId === customerId);
  }

  async getInvoicesByStatus(status: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(invoice => invoice.status === status);
  }

  // Invoice Item methods
  async getInvoiceItem(id: number): Promise<InvoiceItem | undefined> {
    return this.invoiceItems.get(id);
  }

  async createInvoiceItem(invoiceItem: InsertInvoiceItem): Promise<InvoiceItem> {
    const id = this.invoiceItemId++;
    const newInvoiceItem: InvoiceItem = { ...invoiceItem, id };
    this.invoiceItems.set(id, newInvoiceItem);
    return newInvoiceItem;
  }

  async updateInvoiceItem(id: number, invoiceItemData: Partial<InvoiceItem>): Promise<InvoiceItem | undefined> {
    const invoiceItem = this.invoiceItems.get(id);
    if (!invoiceItem) return undefined;
    
    const updatedInvoiceItem = { ...invoiceItem, ...invoiceItemData };
    this.invoiceItems.set(id, updatedInvoiceItem);
    return updatedInvoiceItem;
  }

  async deleteInvoiceItem(id: number): Promise<boolean> {
    return this.invoiceItems.delete(id);
  }

  async getInvoiceItemsByInvoice(invoiceId: number): Promise<InvoiceItem[]> {
    return Array.from(this.invoiceItems.values()).filter(item => item.invoiceId === invoiceId);
  }

  // Employee methods
  async getEmployee(id: number): Promise<Employee | undefined> {
    return this.employees.get(id);
  }

  async getEmployeeByUserId(userId: number): Promise<Employee | undefined> {
    return Array.from(this.employees.values()).find(employee => employee.userId === userId);
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const id = this.employeeId++;
    const newEmployee: Employee = { ...employee, id, createdAt: new Date() };
    this.employees.set(id, newEmployee);
    return newEmployee;
  }

  async updateEmployee(id: number, employeeData: Partial<Employee>): Promise<Employee | undefined> {
    const employee = this.employees.get(id);
    if (!employee) return undefined;
    
    const updatedEmployee = { ...employee, ...employeeData };
    this.employees.set(id, updatedEmployee);
    return updatedEmployee;
  }

  async deleteEmployee(id: number): Promise<boolean> {
    return this.employees.delete(id);
  }

  async getAllEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values());
  }

  // Timesheet methods
  async getTimesheet(id: number): Promise<Timesheet | undefined> {
    return this.timesheets.get(id);
  }

  async createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet> {
    const id = this.timesheetId++;
    const newTimesheet: Timesheet = { ...timesheet, id, createdAt: new Date() };
    this.timesheets.set(id, newTimesheet);
    return newTimesheet;
  }

  async updateTimesheet(id: number, timesheetData: Partial<Timesheet>): Promise<Timesheet | undefined> {
    const timesheet = this.timesheets.get(id);
    if (!timesheet) return undefined;
    
    const updatedTimesheet = { ...timesheet, ...timesheetData };
    this.timesheets.set(id, updatedTimesheet);
    return updatedTimesheet;
  }

  async deleteTimesheet(id: number): Promise<boolean> {
    return this.timesheets.delete(id);
  }

  async getAllTimesheets(): Promise<Timesheet[]> {
    return Array.from(this.timesheets.values());
  }

  async getTimesheetsByEmployee(employeeId: number): Promise<Timesheet[]> {
    return Array.from(this.timesheets.values()).filter(timesheet => timesheet.employeeId === employeeId);
  }

  async getTimesheetsByProject(projectId: number): Promise<Timesheet[]> {
    return Array.from(this.timesheets.values()).filter(timesheet => timesheet.projectId === projectId);
  }

  async getTimesheetsByDateRange(startDate: Date, endDate: Date): Promise<Timesheet[]> {
    return Array.from(this.timesheets.values()).filter(timesheet => {
      const timesheetDate = new Date(timesheet.date);
      return timesheetDate >= startDate && timesheetDate <= endDate;
    });
  }

  // Survey methods
  async getSurvey(id: number): Promise<Survey | undefined> {
    return this.surveys.get(id);
  }

  async createSurvey(survey: InsertSurvey): Promise<Survey> {
    const id = this.surveyId++;
    const newSurvey: Survey = { ...survey, id, createdAt: new Date() };
    this.surveys.set(id, newSurvey);
    return newSurvey;
  }

  async updateSurvey(id: number, surveyData: Partial<Survey>): Promise<Survey | undefined> {
    const survey = this.surveys.get(id);
    if (!survey) return undefined;
    
    const updatedSurvey = { ...survey, ...surveyData };
    this.surveys.set(id, updatedSurvey);
    return updatedSurvey;
  }

  async deleteSurvey(id: number): Promise<boolean> {
    return this.surveys.delete(id);
  }

  async getAllSurveys(): Promise<Survey[]> {
    return Array.from(this.surveys.values());
  }

  async getSurveysByProject(projectId: number): Promise<Survey[]> {
    return Array.from(this.surveys.values()).filter(survey => survey.projectId === projectId);
  }

  async getSurveysByStatus(status: string): Promise<Survey[]> {
    return Array.from(this.surveys.values()).filter(survey => survey.status === status);
  }

  async getSurveysByDateRange(startDate: Date, endDate: Date): Promise<Survey[]> {
    return Array.from(this.surveys.values()).filter(survey => {
      const surveyDate = new Date(survey.scheduledDate);
      return surveyDate >= startDate && surveyDate <= endDate;
    });
  }

  // Installation methods
  async getInstallation(id: number): Promise<Installation | undefined> {
    return this.installations.get(id);
  }

  async createInstallation(installation: InsertInstallation): Promise<Installation> {
    const id = this.installationId++;
    const newInstallation: Installation = { ...installation, id, createdAt: new Date() };
    this.installations.set(id, newInstallation);
    return newInstallation;
  }

  async updateInstallation(id: number, installationData: Partial<Installation>): Promise<Installation | undefined> {
    const installation = this.installations.get(id);
    if (!installation) return undefined;
    
    const updatedInstallation = { ...installation, ...installationData };
    this.installations.set(id, updatedInstallation);
    return updatedInstallation;
  }

  async deleteInstallation(id: number): Promise<boolean> {
    return this.installations.delete(id);
  }

  async getAllInstallations(): Promise<Installation[]> {
    return Array.from(this.installations.values());
  }

  async getInstallationsByProject(projectId: number): Promise<Installation[]> {
    return Array.from(this.installations.values()).filter(installation => installation.projectId === projectId);
  }

  async getInstallationsByStatus(status: string): Promise<Installation[]> {
    return Array.from(this.installations.values()).filter(installation => installation.status === status);
  }

  async getInstallationsByDateRange(startDate: Date, endDate: Date): Promise<Installation[]> {
    return Array.from(this.installations.values()).filter(installation => {
      const installationDate = new Date(installation.scheduledDate);
      return installationDate >= startDate && installationDate <= endDate;
    });
  }

  // Task List methods
  async getTaskList(id: number): Promise<TaskList | undefined> {
    return this.taskLists.get(id);
  }

  async createTaskList(taskList: InsertTaskList): Promise<TaskList> {
    const id = this.taskListId++;
    const newTaskList: TaskList = { ...taskList, id, createdAt: new Date() };
    this.taskLists.set(id, newTaskList);
    return newTaskList;
  }

  async updateTaskList(id: number, taskListData: Partial<TaskList>): Promise<TaskList | undefined> {
    const taskList = this.taskLists.get(id);
    if (!taskList) return undefined;
    
    const updatedTaskList = { ...taskList, ...taskListData };
    this.taskLists.set(id, updatedTaskList);
    return updatedTaskList;
  }

  async deleteTaskList(id: number): Promise<boolean> {
    return this.taskLists.delete(id);
  }

  async getAllTaskLists(): Promise<TaskList[]> {
    return Array.from(this.taskLists.values());
  }

  async getTaskListsByProject(projectId: number): Promise<TaskList[]> {
    return Array.from(this.taskLists.values()).filter(taskList => taskList.projectId === projectId);
  }

  // Task methods
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.taskId++;
    const newTask: Task = { ...task, id, createdAt: new Date() };
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: number, taskData: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...taskData };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async getTasksByTaskList(taskListId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.taskListId === taskListId);
  }

  async getTasksByAssignee(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.assignedTo === userId);
  }

  // Catalog Items (reusable items for quotes and invoices)
  private catalogItems: Map<number, CatalogItem>;

  async getCatalogItem(id: number, tenantId?: number): Promise<CatalogItem | undefined> {
    const item = this.catalogItems.get(id);
    if (!item) return undefined;
    
    // Apply tenant filter if provided
    if (tenantId !== undefined && item.tenantId !== tenantId) {
      return undefined;
    }
    
    return item;
  }

  async createCatalogItem(item: InsertCatalogItem): Promise<CatalogItem> {
    // Ensure tenantId is provided
    if (!item.tenantId) {
      throw new Error("Tenant ID is required when creating a catalog item");
    }
    
    const id = this.catalogItemId ? this.catalogItemId++ : 1;
    if (!this.catalogItemId) this.catalogItemId = 2;
    const newItem: CatalogItem = { ...item, id, createdAt: new Date() };
    this.catalogItems.set(id, newItem);
    return newItem;
  }

  async updateCatalogItem(id: number, itemData: Partial<CatalogItem>, tenantId?: number): Promise<CatalogItem | undefined> {
    const item = this.catalogItems.get(id);
    if (!item) return undefined;
    
    // Apply tenant filter if provided
    if (tenantId !== undefined && item.tenantId !== tenantId) {
      return undefined;
    }
    
    const updatedItem = { ...item, ...itemData };
    this.catalogItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteCatalogItem(id: number, tenantId?: number): Promise<boolean> {
    const item = this.catalogItems.get(id);
    if (!item) return false;
    
    // Apply tenant filter if provided
    if (tenantId !== undefined && item.tenantId !== tenantId) {
      return false;
    }
    
    return this.catalogItems.delete(id);
  }

  async getAllCatalogItems(tenantId?: number): Promise<CatalogItem[]> {
    if (tenantId === undefined) {
      return Array.from(this.catalogItems.values());
    }
    
    return Array.from(this.catalogItems.values())
      .filter(item => item.tenantId === tenantId);
  }

  async getCatalogItemsByCategory(category: string, tenantId?: number): Promise<CatalogItem[]> {
    let items = Array.from(this.catalogItems.values())
      .filter(item => item.category === category);
    
    // Apply tenant filter if provided
    if (tenantId !== undefined) {
      items = items.filter(item => item.tenantId === tenantId);
    }
    
    return items;
  }
  
  async getCatalogItemsByType(type: string, tenantId?: number): Promise<CatalogItem[]> {
    let items = Array.from(this.catalogItems.values())
      .filter(item => item.type === type);
    
    // Apply tenant filter if provided
    if (tenantId !== undefined) {
      items = items.filter(item => item.tenantId === tenantId);
    }
    
    return items;
  }

  async getCatalogItemsByUser(userId: number, tenantId?: number): Promise<CatalogItem[]> {
    let items = Array.from(this.catalogItems.values())
      .filter(item => item.createdBy === userId);
    
    // Apply tenant filter if provided
    if (tenantId !== undefined) {
      items = items.filter(item => item.tenantId === tenantId);
    }
    
    return items;
  }

  // Company Settings methods
  async getCompanySettings(): Promise<CompanySettings | undefined> {
    // Company settings are singleton, so we get the first one if it exists
    const settingsArray = Array.from(this.companySettings.values());
    return settingsArray.length > 0 ? settingsArray[0] : undefined;
  }

  async createCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings> {
    // First check if settings already exist
    const existingSettings = await this.getCompanySettings();
    if (existingSettings) {
      // If settings already exist, update them instead
      return this.updateCompanySettings(existingSettings.id, settings);
    }
    
    // Otherwise create new settings
    const id = this.companySettingsId++;
    const newSettings: CompanySettings = { ...settings, id, createdAt: new Date() };
    this.companySettings.set(id, newSettings);
    return newSettings;
  }

  async updateCompanySettings(id: number, settingsData: Partial<CompanySettings>): Promise<CompanySettings | undefined> {
    const settings = this.companySettings.get(id);
    if (!settings) return undefined;
    
    const updatedSettings = { ...settings, ...settingsData };
    this.companySettings.set(id, updatedSettings);
    return updatedSettings;
  }

  // System Settings methods
  async getSystemSettings(): Promise<SystemSettings | undefined> {
    // System settings are singleton, so we get the first one if it exists
    const settingsArray = Array.from(this.systemSettings.values());
    return settingsArray.length > 0 ? settingsArray[0] : undefined;
  }

  async createSystemSettings(settings: InsertSystemSettings): Promise<SystemSettings> {
    // First check if settings already exist
    const existingSettings = await this.getSystemSettings();
    if (existingSettings) {
      // If settings already exist, update them instead
      return this.updateSystemSettings(existingSettings.id, settings);
    }
    
    // Otherwise create new settings
    const id = this.systemSettingsId++;
    const newSettings: SystemSettings = { ...settings, id, createdAt: new Date() };
    this.systemSettings.set(id, newSettings);
    return newSettings;
  }

  async updateSystemSettings(id: number, settingsData: Partial<SystemSettings>): Promise<SystemSettings | undefined> {
    const settings = this.systemSettings.get(id);
    if (!settings) return undefined;
    
    const updatedSettings = { ...settings, ...settingsData };
    this.systemSettings.set(id, updatedSettings);
    return updatedSettings;
  }

  // Supplier methods
  async getSupplier(id: number): Promise<Supplier | undefined> {
    return this.suppliers.get(id);
  }

  async getSupplierByName(name: string): Promise<Supplier | undefined> {
    return Array.from(this.suppliers.values()).find(supplier => supplier.name === name);
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const id = this.supplierId++;
    const newSupplier: Supplier = { ...supplier, id, createdAt: new Date() };
    this.suppliers.set(id, newSupplier);
    return newSupplier;
  }

  async updateSupplier(id: number, supplierData: Partial<Supplier>): Promise<Supplier | undefined> {
    const supplier = this.suppliers.get(id);
    if (!supplier) return undefined;
    
    const updatedSupplier = { ...supplier, ...supplierData };
    this.suppliers.set(id, updatedSupplier);
    return updatedSupplier;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    return this.suppliers.delete(id);
  }

  async getAllSuppliers(): Promise<Supplier[]> {
    return Array.from(this.suppliers.values());
  }

  async getSuppliersByCategory(category: string): Promise<Supplier[]> {
    return Array.from(this.suppliers.values()).filter(supplier => supplier.category === category);
  }

  // Expense methods
  async getExpense(id: number): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const id = this.expenseId++;
    const newExpense: Expense = { ...expense, id, createdAt: new Date() };
    this.expenses.set(id, newExpense);
    return newExpense;
  }

  async updateExpense(id: number, expenseData: Partial<Expense>): Promise<Expense | undefined> {
    const expense = this.expenses.get(id);
    if (!expense) return undefined;
    
    const updatedExpense = { ...expense, ...expenseData };
    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<boolean> {
    return this.expenses.delete(id);
  }

  async getAllExpenses(): Promise<Expense[]> {
    return Array.from(this.expenses.values());
  }

  async getExpensesByProject(projectId: number): Promise<Expense[]> {
    return Array.from(this.expenses.values()).filter(expense => expense.projectId === projectId);
  }

  async getExpensesBySupplier(supplierId: number): Promise<Expense[]> {
    return Array.from(this.expenses.values()).filter(expense => expense.supplierId === supplierId);
  }

  async getExpensesByCategory(category: string): Promise<Expense[]> {
    return Array.from(this.expenses.values()).filter(expense => expense.category === category);
  }

  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    return Array.from(this.expenses.values()).filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= startDate && expenseDate <= endDate;
    });
  }

  // Purchase Order methods
  async getPurchaseOrder(id: number, filter?: TenantFilter): Promise<PurchaseOrder | undefined> {
    const purchaseOrder = this.purchaseOrders.get(id);
    // If tenantId is provided, filter by tenant
    if (filter?.tenantId !== undefined && purchaseOrder) {
      return purchaseOrder.tenantId === filter.tenantId ? purchaseOrder : undefined;
    }
    return purchaseOrder;
  }

  async getPurchaseOrderByNumber(poNumber: string): Promise<PurchaseOrder | undefined> {
    return Array.from(this.purchaseOrders.values()).find(po => po.poNumber === poNumber);
  }

  async createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const id = this.purchaseOrderId++;
    const newPurchaseOrder: PurchaseOrder = { ...po, id, createdAt: new Date() };
    this.purchaseOrders.set(id, newPurchaseOrder);
    return newPurchaseOrder;
  }

  async updatePurchaseOrder(id: number, poData: Partial<PurchaseOrder>): Promise<PurchaseOrder | undefined> {
    const po = this.purchaseOrders.get(id);
    if (!po) return undefined;
    
    const updatedPurchaseOrder = { ...po, ...poData };
    this.purchaseOrders.set(id, updatedPurchaseOrder);
    return updatedPurchaseOrder;
  }

  async deletePurchaseOrder(id: number): Promise<boolean> {
    return this.purchaseOrders.delete(id);
  }

  async getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
    return Array.from(this.purchaseOrders.values());
  }

  async getPurchaseOrdersByProject(projectId: number): Promise<PurchaseOrder[]> {
    return Array.from(this.purchaseOrders.values()).filter(po => po.projectId === projectId);
  }

  async getPurchaseOrdersBySupplier(supplierId: number): Promise<PurchaseOrder[]> {
    return Array.from(this.purchaseOrders.values()).filter(po => po.supplierId === supplierId);
  }

  async getPurchaseOrdersByStatus(status: string): Promise<PurchaseOrder[]> {
    return Array.from(this.purchaseOrders.values()).filter(po => po.status === status);
  }

  // Purchase Order Item methods
  async getPurchaseOrderItem(id: number): Promise<PurchaseOrderItem | undefined> {
    return this.purchaseOrderItems.get(id);
  }

  async createPurchaseOrderItem(item: InsertPurchaseOrderItem): Promise<PurchaseOrderItem> {
    const id = this.purchaseOrderItemId++;
    const newPurchaseOrderItem: PurchaseOrderItem = { ...item, id };
    this.purchaseOrderItems.set(id, newPurchaseOrderItem);
    return newPurchaseOrderItem;
  }

  async updatePurchaseOrderItem(id: number, itemData: Partial<PurchaseOrderItem>): Promise<PurchaseOrderItem | undefined> {
    const item = this.purchaseOrderItems.get(id);
    if (!item) return undefined;
    
    const updatedPurchaseOrderItem = { ...item, ...itemData };
    this.purchaseOrderItems.set(id, updatedPurchaseOrderItem);
    return updatedPurchaseOrderItem;
  }

  async deletePurchaseOrderItem(id: number): Promise<boolean> {
    return this.purchaseOrderItems.delete(id);
  }

  async getPurchaseOrderItemsByPO(purchaseOrderId: number, filter?: TenantFilter): Promise<PurchaseOrderItem[]> {
    // Get all items for the purchase order
    const items = Array.from(this.purchaseOrderItems.values()).filter(item => item.purchaseOrderId === purchaseOrderId);
    
    // If we need to filter by tenant, we need to get the purchase order first to check its tenant
    if (filter && filter.tenantId) {
      const purchaseOrder = this.purchaseOrders.get(purchaseOrderId);
      if (purchaseOrder && purchaseOrder.tenantId === filter.tenantId) {
        return items;
      }
      return []; // No matching tenant or PO not found
    }
    
    return items;
  }

  // Inventory Item methods
  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    return this.inventoryItems.get(id);
  }

  async getInventoryItemBySku(sku: string): Promise<InventoryItem | undefined> {
    return Array.from(this.inventoryItems.values()).find(item => item.sku === sku);
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const id = this.inventoryItemId++;
    const newInventoryItem: InventoryItem = { ...item, id, createdAt: new Date() };
    this.inventoryItems.set(id, newInventoryItem);
    return newInventoryItem;
  }

  async updateInventoryItem(id: number, itemData: Partial<InventoryItem>): Promise<InventoryItem | undefined> {
    const item = this.inventoryItems.get(id);
    if (!item) return undefined;
    
    const updatedInventoryItem = { ...item, ...itemData };
    this.inventoryItems.set(id, updatedInventoryItem);
    return updatedInventoryItem;
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    return this.inventoryItems.delete(id);
  }

  async getAllInventoryItems(): Promise<InventoryItem[]> {
    return Array.from(this.inventoryItems.values());
  }

  async getInventoryItemsByCategory(category: string): Promise<InventoryItem[]> {
    return Array.from(this.inventoryItems.values()).filter(item => item.category === category);
  }

  async getInventoryItemsBySupplier(supplierId: number): Promise<InventoryItem[]> {
    return Array.from(this.inventoryItems.values()).filter(item => item.preferredSupplierId === supplierId);
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    return Array.from(this.inventoryItems.values()).filter(item => 
      item.currentStock !== null && 
      item.minimumStock !== null && 
      item.currentStock <= item.minimumStock
    );
  }

  // Inventory Transaction methods
  async getInventoryTransaction(id: number): Promise<InventoryTransaction | undefined> {
    return this.inventoryTransactions.get(id);
  }

  async createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction> {
    const id = this.inventoryTransactionId++;
    const newTransaction: InventoryTransaction = { ...transaction, id, createdAt: new Date() };
    this.inventoryTransactions.set(id, newTransaction);
    
    // Update inventory item stock levels if transaction affects stock
    if (transaction.inventoryItemId && transaction.quantity) {
      const item = await this.getInventoryItem(transaction.inventoryItemId);
      if (item && item.currentStock !== null) {
        const stockChange = transaction.type === 'incoming' ? transaction.quantity : -transaction.quantity;
        await this.updateInventoryItem(item.id, { 
          currentStock: item.currentStock + stockChange 
        });
      }
    }
    
    return newTransaction;
  }

  async updateInventoryTransaction(id: number, transactionData: Partial<InventoryTransaction>): Promise<InventoryTransaction | undefined> {
    const transaction = this.inventoryTransactions.get(id);
    if (!transaction) return undefined;
    
    // Handle stock adjustments if quantity or type changed
    if ((transactionData.quantity !== undefined || transactionData.type !== undefined) && 
        transaction.inventoryItemId) {
      const item = await this.getInventoryItem(transaction.inventoryItemId);
      
      if (item && item.currentStock !== null) {
        // Reverse the old transaction's effect
        const oldStockChange = transaction.type === 'incoming' ? -transaction.quantity : transaction.quantity;
        
        // Calculate new transaction effect
        const newType = transactionData.type || transaction.type;
        const newQuantity = transactionData.quantity || transaction.quantity;
        const newStockChange = newType === 'incoming' ? newQuantity : -newQuantity;
        
        // Apply the net change
        await this.updateInventoryItem(item.id, { 
          currentStock: item.currentStock + oldStockChange + newStockChange 
        });
      }
    }
    
    const updatedTransaction = { ...transaction, ...transactionData };
    this.inventoryTransactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  async deleteInventoryTransaction(id: number): Promise<boolean> {
    const transaction = this.inventoryTransactions.get(id);
    
    // Reverse stock changes when deleting a transaction
    if (transaction && transaction.inventoryItemId) {
      const item = await this.getInventoryItem(transaction.inventoryItemId);
      if (item && item.currentStock !== null) {
        const stockChange = transaction.type === 'incoming' ? -transaction.quantity : transaction.quantity;
        await this.updateInventoryItem(item.id, { 
          currentStock: item.currentStock + stockChange 
        });
      }
    }
    
    return this.inventoryTransactions.delete(id);
  }

  async getInventoryTransactionsByItem(inventoryItemId: number): Promise<InventoryTransaction[]> {
    return Array.from(this.inventoryTransactions.values())
      .filter(transaction => transaction.inventoryItemId === inventoryItemId);
  }

  async getInventoryTransactionsByProject(projectId: number): Promise<InventoryTransaction[]> {
    return Array.from(this.inventoryTransactions.values())
      .filter(transaction => transaction.projectId === projectId);
  }

  async getInventoryTransactionsByPO(purchaseOrderId: number): Promise<InventoryTransaction[]> {
    return Array.from(this.inventoryTransactions.values())
      .filter(transaction => transaction.purchaseOrderId === purchaseOrderId);
  }

  async getInventoryTransactionsByType(type: string): Promise<InventoryTransaction[]> {
    return Array.from(this.inventoryTransactions.values())
      .filter(transaction => transaction.type === type);
  }

  async getInventoryTransactionsByDateRange(startDate: Date, endDate: Date): Promise<InventoryTransaction[]> {
    return Array.from(this.inventoryTransactions.values()).filter(transaction => {
      return transaction.createdAt >= startDate && transaction.createdAt <= endDate;
    });
  }

  // File Attachment methods
  async getFileAttachment(id: number): Promise<FileAttachment | undefined> {
    return this.fileAttachments.get(id);
  }

  async createFileAttachment(file: InsertFileAttachment): Promise<FileAttachment> {
    const id = this.fileAttachmentId++;
    const newFileAttachment: FileAttachment = { ...file, id, createdAt: new Date() };
    this.fileAttachments.set(id, newFileAttachment);
    return newFileAttachment;
  }

  async deleteFileAttachment(id: number): Promise<boolean> {
    return this.fileAttachments.delete(id);
  }

  async getFileAttachmentsByRelatedEntity(relatedType: string, relatedId: number): Promise<FileAttachment[]> {
    return Array.from(this.fileAttachments.values()).filter(
      file => file.relatedType === relatedType && file.relatedId === relatedId
    );
  }

  // Tenant methods
  async getTenant(id: number): Promise<Tenant | undefined> {
    return this.tenants.get(id);
  }

  async getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined> {
    return Array.from(this.tenants.values()).find(tenant => tenant.subdomain === subdomain);
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const id = this.tenantId++;
    const newTenant: Tenant = { ...tenant, id, createdAt: new Date() };
    this.tenants.set(id, newTenant);
    return newTenant;
  }

  async updateTenant(id: number, tenantData: Partial<Tenant>): Promise<Tenant | undefined> {
    const tenant = this.tenants.get(id);
    if (!tenant) return undefined;
    
    const updatedTenant = { ...tenant, ...tenantData };
    this.tenants.set(id, updatedTenant);
    return updatedTenant;
  }

  async deleteTenant(id: number): Promise<boolean> {
    return this.tenants.delete(id);
  }

  async getAllTenants(): Promise<Tenant[]> {
    return Array.from(this.tenants.values());
  }

  // User Invitation methods
  async getUserInvitation(id: number): Promise<UserInvitation | undefined> {
    return this.userInvitations.get(id);
  }

  async getUserInvitationByToken(token: string): Promise<UserInvitation | undefined> {
    return Array.from(this.userInvitations.values()).find(invitation => invitation.token === token);
  }

  async getUserInvitationsByTenant(tenantId: number): Promise<UserInvitation[]> {
    return Array.from(this.userInvitations.values()).filter(invitation => invitation.tenantId === tenantId);
  }

  async getUserInvitationsByEmail(email: string, tenantId: number): Promise<UserInvitation[]> {
    return Array.from(this.userInvitations.values()).filter(
      invitation => invitation.email === email && invitation.tenantId === tenantId
    );
  }

  async createUserInvitation(invitation: InsertUserInvitation): Promise<UserInvitation> {
    const id = this.userInvitationId++;
    const newInvitation: UserInvitation = { ...invitation, id, createdAt: new Date() };
    this.userInvitations.set(id, newInvitation);
    return newInvitation;
  }

  async updateUserInvitation(id: number, invitationData: Partial<UserInvitation>): Promise<UserInvitation | undefined> {
    const invitation = this.userInvitations.get(id);
    if (!invitation) return undefined;
    
    const updatedInvitation = { ...invitation, ...invitationData };
    this.userInvitations.set(id, updatedInvitation);
    return updatedInvitation;
  }

  async deleteUserInvitation(id: number): Promise<boolean> {
    return this.userInvitations.delete(id);
  }
}

// Export a single instance for use across the application
export class DatabaseStorage implements IStorage {
  sessionStore: any; // Using any for Express session store type issue
  
  // Implement the system settings methods
  async getSystemSettings(): Promise<SystemSettings | undefined> {
    const result = await db.query.systemSettings.findFirst();
    return result;
  }
  
  async createSystemSettings(settings: InsertSystemSettings): Promise<SystemSettings> {
    // First check if settings already exist
    const existingSettings = await this.getSystemSettings();
    if (existingSettings) {
      // If settings already exist, update them instead
      return this.updateSystemSettings(existingSettings.id, settings);
    }
    
    // Create new settings
    const [newSettings] = await db.insert(schema.systemSettings)
      .values({
        ...settings,
        updatedAt: new Date()
      })
      .returning();
    
    return newSettings;
  }
  
  async updateSystemSettings(id: number, settings: Partial<SystemSettings>): Promise<SystemSettings | undefined> {
    const [updatedSettings] = await db.update(schema.systemSettings)
      .set({
        ...settings,
        updatedAt: new Date()
      })
      .where(eq(schema.systemSettings.id, id))
      .returning();
    
    return updatedSettings;
  }

  constructor() {
    // Create a proper pool-compatible interface for the connect-pg-simple package
    // The package expects a node-postgres Pool object with a query method
    const pool = {
      query: async (text: string, params: any[] = []) => {
        try {
          const result = await client.unsafe(text, params);
          // Format result to match pg Pool query result format
          return {
            rows: Array.isArray(result) ? result : [result],
            rowCount: Array.isArray(result) ? result.length : 1
          };
        } catch (error) {
          console.error("Session store query error:", error);
          throw error;
        }
      }
    };
    
    // Use MemoryStore for now as we're having compatibility issues with PostgresSessionStore and postgres.js
    // We can revisit this later once we figure out the session serialization issue
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
  }

  // Tenant methods
  async getTenant(id: number): Promise<Tenant | undefined> {
    const result = await db.query.tenants.findFirst({
      where: eq(schema.tenants.id, id)
    });
    return result;
  }

  async getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined> {
    const result = await db.query.tenants.findFirst({
      where: eq(schema.tenants.subdomain, subdomain)
    });
    return result;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const result = await db.insert(schema.tenants).values({
      ...tenant,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateTenant(id: number, tenantData: Partial<Tenant>): Promise<Tenant | undefined> {
    const result = await db.update(schema.tenants)
      .set(tenantData)
      .where(eq(schema.tenants.id, id))
      .returning();
    return result[0];
  }

  async deleteTenant(id: number): Promise<boolean> {
    const result = await db.delete(schema.tenants)
      .where(eq(schema.tenants.id, id))
      .returning();
    return result.length > 0;
  }

  async getAllTenants(): Promise<Tenant[]> {
    return await db.query.tenants.findMany();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(schema.users.id, id)
    });
    return result;
  }

  async getUserByUsername(username: string, tenantId?: number): Promise<User | undefined> {
    const query = tenantId
      ? and(
          eq(schema.users.username, username),
          eq(schema.users.tenantId, tenantId)
        )
      : eq(schema.users.username, username);
      
    const result = await db.query.users.findFirst({
      where: query
    });
    return result;
  }
  
  async getUserByEmail(email: string, tenantId?: number): Promise<User | undefined> {
    const query = tenantId
      ? and(
          eq(schema.users.email, email),
          eq(schema.users.tenantId, tenantId)
        )
      : eq(schema.users.email, email);
      
    const result = await db.query.users.findFirst({
      where: query
    });
    return result;
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(schema.users).values({
      ...user,
      createdAt: new Date(),
      lastLogin: null
    }).returning();
    return result[0];
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const result = await db.update(schema.users)
      .set(userData)
      .where(eq(schema.users.id, id))
      .returning();
    return result[0];
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(schema.users)
      .where(eq(schema.users.id, id))
      .returning();
    return result.length > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.query.users.findMany();
  }

  // Customer methods
  async getCustomer(id: number, tenantId?: number): Promise<Customer | undefined> {
    let whereCondition: any = eq(schema.customers.id, id);
    
    // Add tenant filtering if tenantId is provided
    if (tenantId !== undefined) {
      whereCondition = and(
        whereCondition,
        eq(schema.customers.tenantId, tenantId)
      );
    }
    
    const result = await db.query.customers.findFirst({
      where: whereCondition
    });
    return result;
  }

  async getCustomerByName(name: string, tenantId?: number): Promise<Customer | undefined> {
    let whereCondition: any = eq(schema.customers.name, name);
    
    // Add tenant filtering if tenantId is provided
    if (tenantId !== undefined) {
      whereCondition = and(
        whereCondition,
        eq(schema.customers.tenantId, tenantId)
      );
    }
    
    const result = await db.query.customers.findFirst({
      where: whereCondition
    });
    return result;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const result = await db.insert(schema.customers).values({
      ...customer,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateCustomer(id: number, customerData: Partial<Customer>): Promise<Customer | undefined> {
    const result = await db.update(schema.customers)
      .set(customerData)
      .where(eq(schema.customers.id, id))
      .returning();
    return result[0];
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const result = await db.delete(schema.customers)
      .where(eq(schema.customers.id, id))
      .returning();
    return result.length > 0;
  }

  async getAllCustomers(tenantId?: number): Promise<Customer[]> {
    if (tenantId !== undefined) {
      return await db.query.customers.findMany({
        where: eq(schema.customers.tenantId, tenantId)
      });
    }
    return await db.query.customers.findMany();
  }

  // Project methods
  async getProject(id: number, tenantId?: number): Promise<Project | undefined> {
    let whereCondition: any = eq(schema.projects.id, id);
    
    // Add tenant filtering if tenantId is provided
    if (tenantId !== undefined) {
      whereCondition = and(
        whereCondition,
        eq(schema.projects.tenantId, tenantId)
      );
    }
    
    const result = await db.query.projects.findFirst({
      where: whereCondition
    });
    return result;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const result = await db.insert(schema.projects).values({
      ...project,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateProject(id: number, projectData: Partial<Project>): Promise<Project | undefined> {
    const result = await db.update(schema.projects)
      .set(projectData)
      .where(eq(schema.projects.id, id))
      .returning();
    return result[0];
  }

  async deleteProject(id: number): Promise<boolean> {
    try {
      // First check if project exists
      const project = await this.getProject(id);
      if (!project) {
        return false;
      }
      
      // Delete related file attachments
      const projectAttachments = await this.getFileAttachmentsByRelatedEntity('project', id);
      for (const attachment of projectAttachments) {
        await db.delete(schema.fileAttachments)
          .where(eq(schema.fileAttachments.id, attachment.id));
      }
      
      // Delete related surveys first
      await db.delete(schema.surveys)
        .where(eq(schema.surveys.projectId, id));
      
      // Delete related installations
      await db.delete(schema.installations)
        .where(eq(schema.installations.projectId, id));
      
      // Delete related quotes (and their items)
      const quotes = await this.getQuotesByProject(id);
      for (const quote of quotes) {
        // Delete quote items first
        await db.delete(schema.quoteItems)
          .where(eq(schema.quoteItems.quoteId, quote.id));
        
        // Delete quote attachments
        const quoteAttachments = await this.getFileAttachmentsByRelatedEntity('quote', quote.id);
        for (const attachment of quoteAttachments) {
          await db.delete(schema.fileAttachments)
            .where(eq(schema.fileAttachments.id, attachment.id));
        }
        
        // Then delete the quote itself
        await db.delete(schema.quotes)
          .where(eq(schema.quotes.id, quote.id));
      }
      
      // Delete related invoices (and their items)
      const invoices = await this.getInvoicesByProject(id);
      for (const invoice of invoices) {
        // Delete invoice items first
        await db.delete(schema.invoiceItems)
          .where(eq(schema.invoiceItems.invoiceId, invoice.id));
        
        // Delete invoice attachments
        const invoiceAttachments = await this.getFileAttachmentsByRelatedEntity('invoice', invoice.id);
        for (const attachment of invoiceAttachments) {
          await db.delete(schema.fileAttachments)
            .where(eq(schema.fileAttachments.id, attachment.id));
        }
        
        // Then delete the invoice itself
        await db.delete(schema.invoices)
          .where(eq(schema.invoices.id, invoice.id));
      }
      
      // Delete related timesheets
      await db.delete(schema.timesheets)
        .where(eq(schema.timesheets.projectId, id));
      
      // Delete related task lists
      await db.delete(schema.taskLists)
        .where(eq(schema.taskLists.projectId, id));
      
      // Delete related expenses
      await db.delete(schema.expenses)
        .where(eq(schema.expenses.projectId, id));
      
      // Delete related inventory transactions
      await db.delete(schema.inventoryTransactions)
        .where(eq(schema.inventoryTransactions.projectId, id));
      
      // Delete related purchase orders (and their items)
      const purchaseOrders = await this.getPurchaseOrdersByProject(id);
      for (const po of purchaseOrders) {
        // Delete purchase order items first
        await db.delete(schema.purchaseOrderItems)
          .where(eq(schema.purchaseOrderItems.purchaseOrderId, po.id));
        
        // Delete purchase order attachments
        const poAttachments = await this.getFileAttachmentsByRelatedEntity('purchaseOrder', po.id);
        for (const attachment of poAttachments) {
          await db.delete(schema.fileAttachments)
            .where(eq(schema.fileAttachments.id, attachment.id));
        }
        
        // Then delete the purchase order itself
        await db.delete(schema.purchaseOrders)
          .where(eq(schema.purchaseOrders.id, po.id));
      }
      
      // Finally delete the project itself
      const result = await db.delete(schema.projects)
        .where(eq(schema.projects.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.query.projects.findMany();
  }

  async getProjectsByCustomer(customerId: number): Promise<Project[]> {
    return await db.query.projects.findMany({
      where: eq(schema.projects.customerId, customerId)
    });
  }

  async getProjectsByStatus(status: string): Promise<Project[]> {
    return await db.query.projects.findMany({
      where: eq(schema.projects.status, status)
    });
  }

  // Quote methods
  async getQuote(id: number, tenantId?: number): Promise<Quote | undefined> {
    let whereCondition: any = eq(schema.quotes.id, id);
    
    // Add tenant filtering if tenantId is provided
    if (tenantId !== undefined) {
      whereCondition = and(
        whereCondition,
        eq(schema.quotes.tenantId, tenantId)
      );
    }
    
    const result = await db.query.quotes.findFirst({
      where: whereCondition
    });
    return result;
  }

  async getQuoteByNumber(quoteNumber: string, tenantId?: number): Promise<Quote | undefined> {
    let whereCondition: any = eq(schema.quotes.quoteNumber, quoteNumber);
    
    // Add tenant filtering if tenantId is provided
    if (tenantId !== undefined) {
      whereCondition = and(
        whereCondition,
        eq(schema.quotes.tenantId, tenantId)
      );
    }
    
    const result = await db.query.quotes.findFirst({
      where: whereCondition
    });
    return result;
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    console.log("Storage: Creating quote with data:", quote);
    try {
      const result = await db.insert(schema.quotes).values({
        ...quote,
        createdAt: new Date()
      }).returning();
      console.log("Storage: Created quote:", result[0]);
      return result[0];
    } catch (error) {
      console.error("Storage: Error creating quote:", error);
      throw error;
    }
  }

  async updateQuote(id: number, quoteData: Partial<Quote>): Promise<Quote | undefined> {
    const result = await db.update(schema.quotes)
      .set(quoteData)
      .where(eq(schema.quotes.id, id))
      .returning();
    return result[0];
  }

  async deleteQuote(id: number): Promise<boolean> {
    const result = await db.delete(schema.quotes)
      .where(eq(schema.quotes.id, id))
      .returning();
    return result.length > 0;
  }

  async getAllQuotes(filter?: TenantFilter): Promise<Quote[]> {
    if (filter?.tenantId) {
      return await db.query.quotes.findMany({
        where: eq(schema.quotes.tenantId, filter.tenantId)
      });
    }
    return await db.query.quotes.findMany();
  }

  async getQuotesByProject(projectId: number, filter?: TenantFilter): Promise<Quote[]> {
    let query = eq(schema.quotes.projectId, projectId);
    
    if (filter?.tenantId) {
      query = and(query, eq(schema.quotes.tenantId, filter.tenantId));
    }
    
    return await db.query.quotes.findMany({
      where: query
    });
  }

  async getQuotesByCustomer(customerId: number, filter?: TenantFilter): Promise<Quote[]> {
    let query = eq(schema.quotes.customerId, customerId);
    
    if (filter?.tenantId) {
      query = and(query, eq(schema.quotes.tenantId, filter.tenantId));
    }
    
    return await db.query.quotes.findMany({
      where: query
    });
  }

  async getQuotesByStatus(status: string, filter?: TenantFilter): Promise<Quote[]> {
    let query = eq(schema.quotes.status, status);
    
    if (filter?.tenantId) {
      query = and(query, eq(schema.quotes.tenantId, filter.tenantId));
    }
    
    return await db.query.quotes.findMany({
      where: query
    });
  }

  // Quote Items methods
  async getQuoteItem(id: number): Promise<QuoteItem | undefined> {
    const result = await db.query.quoteItems.findFirst({
      where: eq(schema.quoteItems.id, id)
    });
    return result;
  }

  async createQuoteItem(quoteItem: InsertQuoteItem): Promise<QuoteItem> {
    const result = await db.insert(schema.quoteItems).values(quoteItem).returning();
    return result[0];
  }

  async updateQuoteItem(id: number, quoteItemData: Partial<QuoteItem>): Promise<QuoteItem | undefined> {
    const result = await db.update(schema.quoteItems)
      .set(quoteItemData)
      .where(eq(schema.quoteItems.id, id))
      .returning();
    return result[0];
  }

  async deleteQuoteItem(id: number): Promise<boolean> {
    const result = await db.delete(schema.quoteItems)
      .where(eq(schema.quoteItems.id, id))
      .returning();
    return result.length > 0;
  }

  async getQuoteItemsByQuote(quoteId: number): Promise<QuoteItem[]> {
    return await db.query.quoteItems.findMany({
      where: eq(schema.quoteItems.quoteId, quoteId)
    });
  }

  // Invoice methods
  async getInvoice(id: number, tenantId?: number): Promise<Invoice | undefined> {
    let whereCondition: any = eq(schema.invoices.id, id);
    
    // Add tenant filtering if tenantId is provided
    if (tenantId !== undefined) {
      whereCondition = and(
        whereCondition,
        eq(schema.invoices.tenantId, tenantId)
      );
    }
    
    const result = await db.query.invoices.findFirst({
      where: whereCondition
    });
    return result;
  }

  async getInvoiceByNumber(invoiceNumber: string, tenantId?: number): Promise<Invoice | undefined> {
    let whereCondition: any = eq(schema.invoices.invoiceNumber, invoiceNumber);
    
    // Add tenant filtering if tenantId is provided
    if (tenantId !== undefined) {
      whereCondition = and(
        whereCondition,
        eq(schema.invoices.tenantId, tenantId)
      );
    }
    
    const result = await db.query.invoices.findFirst({
      where: whereCondition
    });
    return result;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const result = await db.insert(schema.invoices).values({
      ...invoice,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateInvoice(id: number, invoiceData: Partial<Invoice>): Promise<Invoice | undefined> {
    const result = await db.update(schema.invoices)
      .set(invoiceData)
      .where(eq(schema.invoices.id, id))
      .returning();
    return result[0];
  }

  async deleteInvoice(id: number): Promise<boolean> {
    const result = await db.delete(schema.invoices)
      .where(eq(schema.invoices.id, id))
      .returning();
    return result.length > 0;
  }

  async getAllInvoices(filter?: TenantFilter): Promise<Invoice[]> {
    if (filter && filter.tenantId !== undefined) {
      return await db.query.invoices.findMany({
        where: eq(schema.invoices.tenantId, filter.tenantId)
      });
    }
    return await db.query.invoices.findMany();
  }

  async getInvoicesByProject(projectId: number): Promise<Invoice[]> {
    return await db.query.invoices.findMany({
      where: eq(schema.invoices.projectId, projectId)
    });
  }

  async getInvoicesByCustomer(customerId: number): Promise<Invoice[]> {
    return await db.query.invoices.findMany({
      where: eq(schema.invoices.customerId, customerId)
    });
  }

  async getInvoicesByStatus(status: string): Promise<Invoice[]> {
    return await db.query.invoices.findMany({
      where: eq(schema.invoices.status, status)
    });
  }

  // Invoice Items methods
  async getInvoiceItem(id: number): Promise<InvoiceItem | undefined> {
    const result = await db.query.invoiceItems.findFirst({
      where: eq(schema.invoiceItems.id, id)
    });
    return result;
  }

  async createInvoiceItem(invoiceItem: InsertInvoiceItem): Promise<InvoiceItem> {
    const result = await db.insert(schema.invoiceItems).values(invoiceItem).returning();
    return result[0];
  }

  async updateInvoiceItem(id: number, invoiceItemData: Partial<InvoiceItem>): Promise<InvoiceItem | undefined> {
    const result = await db.update(schema.invoiceItems)
      .set(invoiceItemData)
      .where(eq(schema.invoiceItems.id, id))
      .returning();
    return result[0];
  }

  async deleteInvoiceItem(id: number): Promise<boolean> {
    const result = await db.delete(schema.invoiceItems)
      .where(eq(schema.invoiceItems.id, id))
      .returning();
    return result.length > 0;
  }

  async getInvoiceItemsByInvoice(invoiceId: number): Promise<InvoiceItem[]> {
    return await db.query.invoiceItems.findMany({
      where: eq(schema.invoiceItems.invoiceId, invoiceId)
    });
  }

  // Employee methods
  async getEmployee(id: number): Promise<Employee | undefined> {
    const result = await db.query.employees.findFirst({
      where: eq(schema.employees.id, id)
    });
    return result;
  }

  async getEmployeeByUserId(userId: number): Promise<Employee | undefined> {
    const result = await db.query.employees.findFirst({
      where: eq(schema.employees.userId, userId)
    });
    return result;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const result = await db.insert(schema.employees).values({
      ...employee,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateEmployee(id: number, employeeData: Partial<Employee>): Promise<Employee | undefined> {
    const result = await db.update(schema.employees)
      .set(employeeData)
      .where(eq(schema.employees.id, id))
      .returning();
    return result[0];
  }

  async deleteEmployee(id: number): Promise<boolean> {
    const result = await db.delete(schema.employees)
      .where(eq(schema.employees.id, id))
      .returning();
    return result.length > 0;
  }

  async getAllEmployees(): Promise<Employee[]> {
    return await db.query.employees.findMany();
  }

  // Timesheet methods
  async getTimesheet(id: number): Promise<Timesheet | undefined> {
    const result = await db.query.timesheets.findFirst({
      where: eq(schema.timesheets.id, id)
    });
    return result;
  }

  async createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet> {
    const result = await db.insert(schema.timesheets).values({
      ...timesheet,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateTimesheet(id: number, timesheetData: Partial<Timesheet>): Promise<Timesheet | undefined> {
    const result = await db.update(schema.timesheets)
      .set(timesheetData)
      .where(eq(schema.timesheets.id, id))
      .returning();
    return result[0];
  }

  async deleteTimesheet(id: number): Promise<boolean> {
    const result = await db.delete(schema.timesheets)
      .where(eq(schema.timesheets.id, id))
      .returning();
    return result.length > 0;
  }

  async getAllTimesheets(): Promise<Timesheet[]> {
    return await db.query.timesheets.findMany();
  }

  async getTimesheetsByEmployee(employeeId: number): Promise<Timesheet[]> {
    return await db.query.timesheets.findMany({
      where: eq(schema.timesheets.employeeId, employeeId)
    });
  }

  async getTimesheetsByProject(projectId: number): Promise<Timesheet[]> {
    return await db.query.timesheets.findMany({
      where: eq(schema.timesheets.projectId, projectId)
    });
  }

  async getTimesheetsByDateRange(startDate: Date, endDate: Date): Promise<Timesheet[]> {
    // Convert dates to ISO strings to avoid Date object serialization issues
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`Querying timesheets between: ${startDateStr} and ${endDateStr}`);
    
    try {
      // Safely construct the query with serialized dates
      const result = await db.query.timesheets.findMany({
        where: sql`${schema.timesheets.date} BETWEEN ${startDateStr}::date AND ${endDateStr}::date`
      });
      console.log(`Found ${result.length} timesheets in date range`);
      return result;
    } catch (error) {
      console.error("Error in getTimesheetsByDateRange:", error);
      // Return empty array rather than failing
      return [];
    }
  }

  // Survey methods
  async getSurvey(id: number): Promise<Survey | undefined> {
    const result = await db.query.surveys.findFirst({
      where: eq(schema.surveys.id, id)
    });
    return result;
  }

  async createSurvey(survey: InsertSurvey): Promise<Survey> {
    const result = await db.insert(schema.surveys).values({
      ...survey,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateSurvey(id: number, surveyData: Partial<Survey>): Promise<Survey | undefined> {
    const result = await db.update(schema.surveys)
      .set(surveyData)
      .where(eq(schema.surveys.id, id))
      .returning();
    return result[0];
  }

  async deleteSurvey(id: number): Promise<boolean> {
    const result = await db.delete(schema.surveys)
      .where(eq(schema.surveys.id, id))
      .returning();
    return result.length > 0;
  }

  async getAllSurveys(): Promise<Survey[]> {
    return await db.query.surveys.findMany();
  }

  async getSurveysByProject(projectId: number): Promise<Survey[]> {
    return await db.query.surveys.findMany({
      where: eq(schema.surveys.projectId, projectId)
    });
  }

  async getSurveysByStatus(status: string): Promise<Survey[]> {
    return await db.query.surveys.findMany({
      where: eq(schema.surveys.status, status)
    });
  }

  async getSurveysByDateRange(startDate: Date, endDate: Date): Promise<Survey[]> {
    // Convert dates to ISO strings to avoid Date object serialization issues
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`Querying surveys between: ${startDateStr} and ${endDateStr}`);
    
    try {
      // Safely construct the query with serialized dates
      const result = await db.query.surveys.findMany({
        where: sql`${schema.surveys.scheduledDate} BETWEEN ${startDateStr}::date AND ${endDateStr}::date`
      });
      console.log(`Found ${result.length} surveys in date range`);
      return result;
    } catch (error) {
      console.error("Error in getSurveysByDateRange:", error);
      // Return empty array rather than failing
      return [];
    }
  }

  // Installation methods
  async getInstallation(id: number): Promise<Installation | undefined> {
    const result = await db.query.installations.findFirst({
      where: eq(schema.installations.id, id)
    });
    return result;
  }

  async createInstallation(installation: InsertInstallation): Promise<Installation> {
    const result = await db.insert(schema.installations).values({
      ...installation,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateInstallation(id: number, installationData: Partial<Installation>): Promise<Installation | undefined> {
    const result = await db.update(schema.installations)
      .set(installationData)
      .where(eq(schema.installations.id, id))
      .returning();
    return result[0];
  }

  async deleteInstallation(id: number): Promise<boolean> {
    const result = await db.delete(schema.installations)
      .where(eq(schema.installations.id, id))
      .returning();
    return result.length > 0;
  }

  async getAllInstallations(): Promise<Installation[]> {
    return await db.query.installations.findMany();
  }

  async getInstallationsByProject(projectId: number): Promise<Installation[]> {
    return await db.query.installations.findMany({
      where: eq(schema.installations.projectId, projectId)
    });
  }

  async getInstallationsByStatus(status: string): Promise<Installation[]> {
    return await db.query.installations.findMany({
      where: eq(schema.installations.status, status)
    });
  }

  async getInstallationsByDateRange(startDate: Date, endDate: Date): Promise<Installation[]> {
    // Convert dates to ISO strings to avoid Date object serialization issues
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`Querying installations between: ${startDateStr} and ${endDateStr}`);
    
    try {
      // Safely construct the query with serialized dates
      const result = await db.query.installations.findMany({
        where: sql`${schema.installations.scheduledDate} BETWEEN ${startDateStr}::date AND ${endDateStr}::date`
      });
      console.log(`Found ${result.length} installations in date range`);
      return result;
    } catch (error) {
      console.error("Error in getInstallationsByDateRange:", error);
      // Return empty array rather than failing
      return [];
    }
  }

  // Task List methods
  async getTaskList(id: number): Promise<TaskList | undefined> {
    const result = await db.query.taskLists.findFirst({
      where: eq(schema.taskLists.id, id)
    });
    return result;
  }

  async createTaskList(taskList: InsertTaskList): Promise<TaskList> {
    const result = await db.insert(schema.taskLists).values({
      ...taskList,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateTaskList(id: number, taskListData: Partial<TaskList>): Promise<TaskList | undefined> {
    const result = await db.update(schema.taskLists)
      .set(taskListData)
      .where(eq(schema.taskLists.id, id))
      .returning();
    return result[0];
  }

  async deleteTaskList(id: number): Promise<boolean> {
    const result = await db.delete(schema.taskLists)
      .where(eq(schema.taskLists.id, id))
      .returning();
    return result.length > 0;
  }

  async getAllTaskLists(): Promise<TaskList[]> {
    return await db.query.taskLists.findMany();
  }

  async getTaskListsByProject(projectId: number): Promise<TaskList[]> {
    return await db.query.taskLists.findMany({
      where: eq(schema.taskLists.projectId, projectId)
    });
  }

  // Task methods
  async getTask(id: number): Promise<Task | undefined> {
    const result = await db.query.tasks.findFirst({
      where: eq(schema.tasks.id, id)
    });
    return result;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(schema.tasks).values({
      ...task,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateTask(id: number, taskData: Partial<Task>): Promise<Task | undefined> {
    const result = await db.update(schema.tasks)
      .set(taskData)
      .where(eq(schema.tasks.id, id))
      .returning();
    return result[0];
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(schema.tasks)
      .where(eq(schema.tasks.id, id))
      .returning();
    return result.length > 0;
  }

  async getTasksByTaskList(taskListId: number): Promise<Task[]> {
    return await db.query.tasks.findMany({
      where: eq(schema.tasks.taskListId, taskListId)
    });
  }

  async getTasksByAssignee(userId: number): Promise<Task[]> {
    return await db.query.tasks.findMany({
      where: eq(schema.tasks.assignedTo, userId)
    });
  }

  // Catalog Item methods
  async getCatalogItem(id: number, tenantId?: number): Promise<CatalogItem | undefined> {
    let query = eq(schema.catalogItems.id, id);
    
    // Apply tenant filter if provided
    if (tenantId !== undefined) {
      query = and(query, eq(schema.catalogItems.tenantId, tenantId));
    }
    
    const result = await db.query.catalogItems.findFirst({
      where: query
    });
    return result;
  }

  async createCatalogItem(item: InsertCatalogItem): Promise<CatalogItem> {
    // Ensure tenantId is provided
    if (!item.tenantId) {
      throw new Error("Tenant ID is required when creating a catalog item");
    }
    
    const result = await db.insert(schema.catalogItems).values({
      ...item,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateCatalogItem(id: number, itemData: Partial<CatalogItem>, tenantId?: number): Promise<CatalogItem | undefined> {
    let query = eq(schema.catalogItems.id, id);
    
    // Apply tenant filter if provided
    if (tenantId !== undefined) {
      query = and(query, eq(schema.catalogItems.tenantId, tenantId));
    }
    
    const result = await db.update(schema.catalogItems)
      .set(itemData)
      .where(query)
      .returning();
    return result[0];
  }

  async deleteCatalogItem(id: number, tenantId?: number): Promise<boolean> {
    let query = eq(schema.catalogItems.id, id);
    
    // Apply tenant filter if provided
    if (tenantId !== undefined) {
      query = and(query, eq(schema.catalogItems.tenantId, tenantId));
    }
    
    const result = await db.delete(schema.catalogItems)
      .where(query)
      .returning();
    return result.length > 0;
  }

  async getAllCatalogItems(tenantId?: number): Promise<CatalogItem[]> {
    if (tenantId !== undefined) {
      return await db.query.catalogItems.findMany({
        where: eq(schema.catalogItems.tenantId, tenantId)
      });
    }
    return await db.query.catalogItems.findMany();
  }

  async getCatalogItemsByCategory(category: string, tenantId?: number): Promise<CatalogItem[]> {
    let query = eq(schema.catalogItems.category, category);
    
    // Apply tenant filter if provided
    if (tenantId !== undefined) {
      query = and(query, eq(schema.catalogItems.tenantId, tenantId));
    }
    
    return await db.query.catalogItems.findMany({
      where: query
    });
  }

  async getCatalogItemsByType(type: string, tenantId?: number): Promise<CatalogItem[]> {
    let query = eq(schema.catalogItems.type, type);
    
    // Apply tenant filter if provided
    if (tenantId !== undefined) {
      query = and(query, eq(schema.catalogItems.tenantId, tenantId));
    }
    
    return await db.query.catalogItems.findMany({
      where: query
    });
  }

  async getCatalogItemsByUser(userId: number, tenantId?: number): Promise<CatalogItem[]> {
    let query = eq(schema.catalogItems.createdBy, userId);
    
    // Apply tenant filter if provided
    if (tenantId !== undefined) {
      query = and(query, eq(schema.catalogItems.tenantId, tenantId));
    }
    
    return await db.query.catalogItems.findMany({
      where: query
    });
  }

  // Company Settings methods
  async getCompanySettings(): Promise<CompanySettings | undefined> {
    const result = await db.query.companySettings.findFirst();
    return result;
  }

  async createCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings> {
    const result = await db.insert(schema.companySettings).values({
      ...settings,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateCompanySettings(id: number, settingsData: Partial<CompanySettings>): Promise<CompanySettings | undefined> {
    const result = await db.update(schema.companySettings)
      .set(settingsData)
      .where(eq(schema.companySettings.id, id))
      .returning();
    return result[0];
  }
  
  // System Settings methods
  async getSystemSettings(): Promise<SystemSettings | undefined> {
    const result = await db.query.systemSettings.findFirst();
    return result;
  }

  async createSystemSettings(settings: InsertSystemSettings): Promise<SystemSettings> {
    const result = await db.insert(schema.systemSettings).values({
      ...settings,
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async updateSystemSettings(id: number, settingsData: Partial<SystemSettings>): Promise<SystemSettings | undefined> {
    const result = await db.update(schema.systemSettings)
      .set(settingsData)
      .where(eq(schema.systemSettings.id, id))
      .returning();
    return result[0];
  }

  // Supplier methods
  async getSupplier(id: number): Promise<Supplier | undefined> {
    const result = await db.query.suppliers.findFirst({
      where: eq(schema.suppliers.id, id)
    });
    return result;
  }

  async getSupplierByName(name: string): Promise<Supplier | undefined> {
    const result = await db.query.suppliers.findFirst({
      where: eq(schema.suppliers.name, name)
    });
    return result;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const result = await db.insert(schema.suppliers).values({
      ...supplier,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateSupplier(id: number, supplierData: Partial<Supplier>): Promise<Supplier | undefined> {
    const result = await db.update(schema.suppliers)
      .set(supplierData)
      .where(eq(schema.suppliers.id, id))
      .returning();
    return result[0];
  }

  async deleteSupplier(id: number): Promise<boolean> {
    const result = await db.delete(schema.suppliers)
      .where(eq(schema.suppliers.id, id))
      .returning();
    return result.length > 0;
  }

  async getAllSuppliers(): Promise<Supplier[]> {
    return await db.query.suppliers.findMany();
  }

  async getSuppliersByCategory(category: string): Promise<Supplier[]> {
    return await db.query.suppliers.findMany({
      where: eq(schema.suppliers.category, category)
    });
  }

  // Expense methods
  async getExpense(id: number): Promise<Expense | undefined> {
    const result = await db.query.expenses.findFirst({
      where: eq(schema.expenses.id, id)
    });
    return result;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const result = await db.insert(schema.expenses).values({
      ...expense,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateExpense(id: number, expenseData: Partial<Expense>): Promise<Expense | undefined> {
    const result = await db.update(schema.expenses)
      .set(expenseData)
      .where(eq(schema.expenses.id, id))
      .returning();
    return result[0];
  }

  async deleteExpense(id: number): Promise<boolean> {
    const result = await db.delete(schema.expenses)
      .where(eq(schema.expenses.id, id))
      .returning();
    return result.length > 0;
  }

  async getAllExpenses(): Promise<Expense[]> {
    return await db.query.expenses.findMany();
  }

  async getExpensesByProject(projectId: number): Promise<Expense[]> {
    return await db.query.expenses.findMany({
      where: eq(schema.expenses.projectId, projectId)
    });
  }

  async getExpensesBySupplier(supplierId: number): Promise<Expense[]> {
    return await db.query.expenses.findMany({
      where: eq(schema.expenses.supplierId, supplierId)
    });
  }

  async getExpensesByCategory(category: string): Promise<Expense[]> {
    return await db.query.expenses.findMany({
      where: eq(schema.expenses.category, category)
    });
  }

  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    // Convert dates to ISO strings to avoid Date object serialization issues
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`Querying expenses between: ${startDateStr} and ${endDateStr}`);
    
    try {
      // Safely construct the query with serialized dates
      const result = await db.query.expenses.findMany({
        where: sql`${schema.expenses.date} BETWEEN ${startDateStr}::date AND ${endDateStr}::date`
      });
      console.log(`Found ${result.length} expenses in date range`);
      return result;
    } catch (error) {
      console.error("Error in getExpensesByDateRange:", error);
      // Return empty array rather than failing
      return [];
    }
  }

  // Purchase Order methods
  async getPurchaseOrder(id: number, filter?: TenantFilter): Promise<PurchaseOrder | undefined> {
    let whereCondition: any = eq(schema.purchaseOrders.id, id);
    
    // Add tenant filtering if tenantId is provided
    if (filter?.tenantId !== undefined) {
      whereCondition = and(
        whereCondition,
        eq(schema.purchaseOrders.tenantId, filter.tenantId)
      );
    }
    
    const result = await db.query.purchaseOrders.findFirst({
      where: whereCondition
    });
    return result;
  }

  async getPurchaseOrderByNumber(poNumber: string): Promise<PurchaseOrder | undefined> {
    const result = await db.query.purchaseOrders.findFirst({
      where: eq(schema.purchaseOrders.poNumber, poNumber)
    });
    return result;
  }

  async createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const result = await db.insert(schema.purchaseOrders).values({
      ...po,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updatePurchaseOrder(id: number, poData: Partial<PurchaseOrder>): Promise<PurchaseOrder | undefined> {
    const result = await db.update(schema.purchaseOrders)
      .set(poData)
      .where(eq(schema.purchaseOrders.id, id))
      .returning();
    return result[0];
  }

  async deletePurchaseOrder(id: number): Promise<boolean> {
    const result = await db.delete(schema.purchaseOrders)
      .where(eq(schema.purchaseOrders.id, id))
      .returning();
    return result.length > 0;
  }

  async getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
    return await db.query.purchaseOrders.findMany();
  }

  async getPurchaseOrdersByProject(projectId: number): Promise<PurchaseOrder[]> {
    return await db.query.purchaseOrders.findMany({
      where: eq(schema.purchaseOrders.projectId, projectId)
    });
  }

  async getPurchaseOrdersBySupplier(supplierId: number): Promise<PurchaseOrder[]> {
    return await db.query.purchaseOrders.findMany({
      where: eq(schema.purchaseOrders.supplierId, supplierId)
    });
  }

  async getPurchaseOrdersByStatus(status: string): Promise<PurchaseOrder[]> {
    return await db.query.purchaseOrders.findMany({
      where: eq(schema.purchaseOrders.status, status)
    });
  }

  // Purchase Order Item methods
  async getPurchaseOrderItem(id: number): Promise<PurchaseOrderItem | undefined> {
    const result = await db.query.purchaseOrderItems.findFirst({
      where: eq(schema.purchaseOrderItems.id, id)
    });
    return result;
  }

  async createPurchaseOrderItem(item: InsertPurchaseOrderItem): Promise<PurchaseOrderItem> {
    const result = await db.insert(schema.purchaseOrderItems).values(item).returning();
    return result[0];
  }

  async updatePurchaseOrderItem(id: number, itemData: Partial<PurchaseOrderItem>): Promise<PurchaseOrderItem | undefined> {
    const result = await db.update(schema.purchaseOrderItems)
      .set(itemData)
      .where(eq(schema.purchaseOrderItems.id, id))
      .returning();
    return result[0];
  }

  async deletePurchaseOrderItem(id: number): Promise<boolean> {
    const result = await db.delete(schema.purchaseOrderItems)
      .where(eq(schema.purchaseOrderItems.id, id))
      .returning();
    return result.length > 0;
  }

  async getPurchaseOrderItemsByPO(purchaseOrderId: number, filter?: TenantFilter): Promise<PurchaseOrderItem[]> {
    // If tenant filtering is needed, we first check if the purchase order belongs to the tenant
    if (filter?.tenantId) {
      const po = await this.getPurchaseOrder(purchaseOrderId, filter);
      if (!po) {
        return []; // Purchase order not found or doesn't belong to tenant
      }
    }
    
    // Get purchase order items
    return await db.query.purchaseOrderItems.findMany({
      where: eq(schema.purchaseOrderItems.purchaseOrderId, purchaseOrderId)
    });
  }

  // Inventory Item methods
  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    const result = await db.query.inventoryItems.findFirst({
      where: eq(schema.inventoryItems.id, id)
    });
    return result;
  }

  async getInventoryItemBySku(sku: string): Promise<InventoryItem | undefined> {
    const result = await db.query.inventoryItems.findFirst({
      where: eq(schema.inventoryItems.sku, sku)
    });
    return result;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const result = await db.insert(schema.inventoryItems).values({
      ...item,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateInventoryItem(id: number, itemData: Partial<InventoryItem>): Promise<InventoryItem | undefined> {
    const result = await db.update(schema.inventoryItems)
      .set(itemData)
      .where(eq(schema.inventoryItems.id, id))
      .returning();
    return result[0];
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    const result = await db.delete(schema.inventoryItems)
      .where(eq(schema.inventoryItems.id, id))
      .returning();
    return result.length > 0;
  }

  async getAllInventoryItems(): Promise<InventoryItem[]> {
    return await db.query.inventoryItems.findMany();
  }

  async getInventoryItemsByCategory(category: string): Promise<InventoryItem[]> {
    return await db.query.inventoryItems.findMany({
      where: eq(schema.inventoryItems.category, category)
    });
  }

  async getInventoryItemsBySupplier(supplierId: number): Promise<InventoryItem[]> {
    return await db.query.inventoryItems.findMany({
      where: eq(schema.inventoryItems.preferredSupplierId, supplierId)
    });
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    return await db.query.inventoryItems.findMany({
      where: sql`${schema.inventoryItems.currentStock} <= ${schema.inventoryItems.reorderPoint}`
    });
  }

  // Inventory Transaction methods
  async getInventoryTransaction(id: number): Promise<InventoryTransaction | undefined> {
    const result = await db.query.inventoryTransactions.findFirst({
      where: eq(schema.inventoryTransactions.id, id)
    });
    return result;
  }

  async createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction> {
    const result = await db.insert(schema.inventoryTransactions).values({
      ...transaction,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateInventoryTransaction(id: number, transactionData: Partial<InventoryTransaction>): Promise<InventoryTransaction | undefined> {
    const result = await db.update(schema.inventoryTransactions)
      .set(transactionData)
      .where(eq(schema.inventoryTransactions.id, id))
      .returning();
    return result[0];
  }

  async deleteInventoryTransaction(id: number): Promise<boolean> {
    const result = await db.delete(schema.inventoryTransactions)
      .where(eq(schema.inventoryTransactions.id, id))
      .returning();
    return result.length > 0;
  }

  async getInventoryTransactionsByItem(inventoryItemId: number): Promise<InventoryTransaction[]> {
    return await db.query.inventoryTransactions.findMany({
      where: eq(schema.inventoryTransactions.inventoryItemId, inventoryItemId)
    });
  }

  async getInventoryTransactionsByProject(projectId: number): Promise<InventoryTransaction[]> {
    return await db.query.inventoryTransactions.findMany({
      where: eq(schema.inventoryTransactions.projectId, projectId)
    });
  }

  async getInventoryTransactionsByPO(purchaseOrderId: number): Promise<InventoryTransaction[]> {
    return await db.query.inventoryTransactions.findMany({
      where: eq(schema.inventoryTransactions.purchaseOrderId, purchaseOrderId)
    });
  }

  async getInventoryTransactionsByType(type: string): Promise<InventoryTransaction[]> {
    return await db.query.inventoryTransactions.findMany({
      where: eq(schema.inventoryTransactions.transactionType, type)
    });
  }

  async getInventoryTransactionsByDateRange(startDate: Date, endDate: Date): Promise<InventoryTransaction[]> {
    // Convert dates to ISO strings to avoid Date object serialization issues
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`Querying inventory transactions between: ${startDateStr} and ${endDateStr}`);
    
    try {
      // Safely construct the query with serialized dates
      const result = await db.query.inventoryTransactions.findMany({
        where: sql`${schema.inventoryTransactions.transactionDate} BETWEEN ${startDateStr}::date AND ${endDateStr}::date`
      });
      console.log(`Found ${result.length} inventory transactions in date range`);
      return result;
    } catch (error) {
      console.error("Error in getInventoryTransactionsByDateRange:", error);
      // Return empty array rather than failing
      return [];
    }
  }

  // File Attachment methods
  async getFileAttachment(id: number): Promise<FileAttachment | undefined> {
    const result = await db.query.fileAttachments.findFirst({
      where: eq(schema.fileAttachments.id, id)
    });
    return result;
  }

  async createFileAttachment(file: InsertFileAttachment): Promise<FileAttachment> {
    const result = await db.insert(schema.fileAttachments).values({
      ...file,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async deleteFileAttachment(id: number): Promise<boolean> {
    const result = await db.delete(schema.fileAttachments)
      .where(eq(schema.fileAttachments.id, id))
      .returning();
    return result.length > 0;
  }

  async getFileAttachmentsByRelatedEntity(relatedType: string, relatedId: number): Promise<FileAttachment[]> {
    return await db.query.fileAttachments.findMany({
      where: and(
        eq(schema.fileAttachments.relatedType, relatedType),
        eq(schema.fileAttachments.relatedId, relatedId)
      )
    });
  }

  // User Invitation methods
  async getUserInvitation(id: number): Promise<UserInvitation | undefined> {
    return await db.query.userInvitations.findFirst({
      where: eq(schema.userInvitations.id, id)
    });
  }

  async getUserInvitationByToken(token: string): Promise<UserInvitation | undefined> {
    return await db.query.userInvitations.findFirst({
      where: eq(schema.userInvitations.token, token)
    });
  }

  async getUserInvitationsByTenant(tenantId: number): Promise<UserInvitation[]> {
    return await db.query.userInvitations.findMany({
      where: eq(schema.userInvitations.tenantId, tenantId)
    });
  }

  async getUserInvitationsByEmail(email: string, tenantId: number): Promise<UserInvitation[]> {
    return await db.query.userInvitations.findMany({
      where: and(
        eq(schema.userInvitations.email, email),
        eq(schema.userInvitations.tenantId, tenantId)
      )
    });
  }

  async createUserInvitation(invitation: InsertUserInvitation): Promise<UserInvitation> {
    const result = await db.insert(schema.userInvitations)
      .values(invitation)
      .returning();
    
    return result[0];
  }

  async updateUserInvitation(id: number, invitation: Partial<UserInvitation>): Promise<UserInvitation | undefined> {
    const result = await db.update(schema.userInvitations)
      .set(invitation)
      .where(eq(schema.userInvitations.id, id))
      .returning();
    
    return result[0];
  }

  async deleteUserInvitation(id: number): Promise<boolean> {
    const result = await db.delete(schema.userInvitations)
      .where(eq(schema.userInvitations.id, id))
      .returning();
    
    return result.length > 0;
  }
}

// Export the storage instance - change from MemStorage to DatabaseStorage
export const storage = new DatabaseStorage();
