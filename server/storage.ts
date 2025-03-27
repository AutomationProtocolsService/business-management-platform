import { 
  users, 
  customers, 
  projects, 
  quotes, 
  quoteItems, 
  invoices, 
  invoiceItems, 
  employees,
  timesheets,
  surveys,
  installations,
  taskLists,
  tasks,
  catalogItems,
  companySettings,
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
  type InsertCompanySettings
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Interface for storage operations
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Customers
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByName(name: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;
  getAllCustomers(): Promise<Customer[]>;
  
  // Projects
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  getAllProjects(): Promise<Project[]>;
  getProjectsByCustomer(customerId: number): Promise<Project[]>;
  getProjectsByStatus(status: string): Promise<Project[]>;
  
  // Quotes
  getQuote(id: number): Promise<Quote | undefined>;
  getQuoteByNumber(quoteNumber: string): Promise<Quote | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: number, quote: Partial<Quote>): Promise<Quote | undefined>;
  deleteQuote(id: number): Promise<boolean>;
  getAllQuotes(): Promise<Quote[]>;
  getQuotesByProject(projectId: number): Promise<Quote[]>;
  getQuotesByCustomer(customerId: number): Promise<Quote[]>;
  getQuotesByStatus(status: string): Promise<Quote[]>;
  
  // Quote Items
  getQuoteItem(id: number): Promise<QuoteItem | undefined>;
  createQuoteItem(quoteItem: InsertQuoteItem): Promise<QuoteItem>;
  updateQuoteItem(id: number, quoteItem: Partial<QuoteItem>): Promise<QuoteItem | undefined>;
  deleteQuoteItem(id: number): Promise<boolean>;
  getQuoteItemsByQuote(quoteId: number): Promise<QuoteItem[]>;
  
  // Invoices
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<Invoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;
  getAllInvoices(): Promise<Invoice[]>;
  getInvoicesByProject(projectId: number): Promise<Invoice[]>;
  getInvoicesByCustomer(customerId: number): Promise<Invoice[]>;
  getInvoicesByStatus(status: string): Promise<Invoice[]>;
  
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
  getCatalogItem(id: number): Promise<CatalogItem | undefined>;
  createCatalogItem(item: InsertCatalogItem): Promise<CatalogItem>;
  updateCatalogItem(id: number, item: Partial<CatalogItem>): Promise<CatalogItem | undefined>;
  deleteCatalogItem(id: number): Promise<boolean>;
  getAllCatalogItems(): Promise<CatalogItem[]>;
  getCatalogItemsByCategory(category: string): Promise<CatalogItem[]>;
  getCatalogItemsByUser(userId: number): Promise<CatalogItem[]>;
  
  // Company Settings
  getCompanySettings(): Promise<CompanySettings | undefined>;
  createCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings>;
  updateCompanySettings(id: number, settings: Partial<CompanySettings>): Promise<CompanySettings | undefined>;
  
  // Session store
  sessionStore: session.SessionStore;
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
  catalogItemId: number;
  private companySettingsId: number;
  
  // Session store
  sessionStore: session.SessionStore;

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
  async getQuote(id: number): Promise<Quote | undefined> {
    return this.quotes.get(id);
  }

  async getQuoteByNumber(quoteNumber: string): Promise<Quote | undefined> {
    return Array.from(this.quotes.values()).find(quote => quote.quoteNumber === quoteNumber);
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

  async getAllInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values());
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

  async getCatalogItem(id: number): Promise<CatalogItem | undefined> {
    return this.catalogItems.get(id);
  }

  async createCatalogItem(item: InsertCatalogItem): Promise<CatalogItem> {
    const id = this.catalogItemId ? this.catalogItemId++ : 1;
    if (!this.catalogItemId) this.catalogItemId = 2;
    const newItem: CatalogItem = { ...item, id, createdAt: new Date() };
    this.catalogItems.set(id, newItem);
    return newItem;
  }

  async updateCatalogItem(id: number, itemData: Partial<CatalogItem>): Promise<CatalogItem | undefined> {
    const item = this.catalogItems.get(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...itemData };
    this.catalogItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteCatalogItem(id: number): Promise<boolean> {
    return this.catalogItems.delete(id);
  }

  async getAllCatalogItems(): Promise<CatalogItem[]> {
    return Array.from(this.catalogItems.values());
  }

  async getCatalogItemsByCategory(category: string): Promise<CatalogItem[]> {
    return Array.from(this.catalogItems.values()).filter(item => item.category === category);
  }

  async getCatalogItemsByUser(userId: number): Promise<CatalogItem[]> {
    return Array.from(this.catalogItems.values()).filter(item => item.createdBy === userId);
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
}

// Export a single instance for use across the application
export const storage = new MemStorage();
