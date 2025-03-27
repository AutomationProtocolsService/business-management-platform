import { pgTable, text, serial, integer, boolean, date, timestamp, doublePrecision, jsonb, foreignKey, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users and Authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("employee"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Customers
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  customerId: integer("customer_id").references(() => customers.id),
  status: text("status").notNull().default("pending"), // pending, quoted, surveyed, fabrication, installation, snagging, completed
  startDate: date("start_date"),
  deadline: date("deadline"),
  completedDate: date("completed_date"),
  budget: doublePrecision("budget"),
  fabricationDrawingsUrl: text("fabrication_drawings_url"), // URL to stored fabrication drawings
  snaggingRequired: boolean("snagging_required").default(false),
  depositInvoiceId: integer("deposit_invoice_id"), // Will be set after deposit invoice is created
  finalInvoiceId: integer("final_invoice_id"), // Will be set after final invoice is created
  depositPaid: boolean("deposit_paid").default(false),
  finalPaid: boolean("final_paid").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Quotes
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  quoteNumber: text("quote_number").notNull().unique(),
  reference: text("reference"),
  projectId: integer("project_id").references(() => projects.id),
  customerId: integer("customer_id").references(() => customers.id),
  issueDate: date("issue_date").notNull(),
  expiryDate: date("expiry_date"),
  status: text("status").notNull().default("draft"), // draft, sent, accepted, rejected, converted
  clientAcceptedAt: timestamp("client_accepted_at"), // When client accepted the quote
  clientRejectedAt: timestamp("client_rejected_at"), // When client rejected the quote
  clientAcceptedBy: text("client_accepted_by"), // Name of person who accepted the quote
  surveyScheduled: boolean("survey_scheduled").default(false), // Whether survey has been scheduled
  surveyId: integer("survey_id").references(() => surveys.id), // Link to the associated survey
  fabricationDrawingsReady: boolean("fabrication_drawings_ready").default(false), // Whether fabrication drawings are ready
  subtotal: doublePrecision("subtotal").notNull(),
  tax: doublePrecision("tax"),
  discount: doublePrecision("discount"),
  total: doublePrecision("total").notNull(),
  notes: text("notes"),
  terms: text("terms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Quote Items
export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").references(() => quotes.id).notNull(),
  description: text("description").notNull(),
  quantity: doublePrecision("quantity").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  total: doublePrecision("total").notNull(),
});

// Invoices
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  reference: text("reference"),
  projectId: integer("project_id").references(() => projects.id),
  customerId: integer("customer_id").references(() => customers.id),
  quoteId: integer("quote_id").references(() => quotes.id),
  type: text("type").notNull().default("final"), // deposit or final
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  status: text("status").notNull().default("draft"), // draft, sent, partially_paid, paid, overdue, cancelled
  paymentDate: date("payment_date"), // Date when invoice was paid
  paymentAmount: doublePrecision("payment_amount"), // Amount paid
  paymentMethod: text("payment_method"), // Method of payment (bank transfer, credit card, etc.)
  paymentReference: text("payment_reference"), // Reference number for payment transaction
  fabricationDrawingsIncluded: boolean("fabrication_drawings_included").default(false), // Whether fabrication drawings were included with this invoice
  installationRequested: boolean("installation_requested").default(false), // Whether installation was requested after this invoice
  installationId: integer("installation_id").references(() => installations.id), // Link to installation scheduled after this invoice was paid
  subtotal: doublePrecision("subtotal").notNull(),
  tax: doublePrecision("tax"),
  discount: doublePrecision("discount"),
  total: doublePrecision("total").notNull(),
  notes: text("notes"),
  terms: text("terms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Invoice Items
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  description: text("description").notNull(),
  quantity: doublePrecision("quantity").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  total: doublePrecision("total").notNull(),
});

// Employees
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).unique(),
  position: text("position"),
  department: text("department"),
  hireDate: date("hire_date"),
  terminationDate: date("termination_date"),
  hourlyRate: doublePrecision("hourly_rate"),
  salary: doublePrecision("salary"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Timesheets
export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  projectId: integer("project_id").references(() => projects.id),
  date: date("date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  breakDuration: integer("break_duration"),
  notes: text("notes"),
  status: text("status").default("pending"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Surveys
export const surveys = pgTable("surveys", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  quoteId: integer("quote_id").references(() => quotes.id), // Link to the quote that led to this survey
  scheduledDate: date("scheduled_date").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled
  notes: text("notes"),
  measurementsCollected: boolean("measurements_collected").default(false), // Whether measurements were collected during survey
  photosCollected: boolean("photos_collected").default(false), // Whether photos were collected during survey
  clientPresent: boolean("client_present").default(false), // Whether client was present during survey
  depositInvoiceRequested: boolean("deposit_invoice_requested").default(false), // Whether deposit invoice was requested after survey
  assignedTo: integer("assigned_to").references(() => users.id),
  completedBy: integer("completed_by").references(() => users.id),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Installations
export const installations = pgTable("installations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  depositInvoiceId: integer("deposit_invoice_id").references(() => invoices.id), // Link to the deposit invoice that enabled scheduling this installation
  scheduledDate: date("scheduled_date").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled, snagging
  notes: text("notes"),
  assignedTo: jsonb("assigned_to").$type<number[]>(), // Team members assigned to installation
  clientSignoff: boolean("client_signoff").default(false), // Whether client signed off on the installation
  snaggingRequired: boolean("snagging_required").default(false), // Whether snagging work is required
  snaggingTaskListId: integer("snagging_task_list_id").references(() => taskLists.id), // Link to snagging task list if required
  finalInvoiceRequested: boolean("final_invoice_requested").default(false), // Whether final invoice was requested after installation
  completedBy: integer("completed_by").references(() => users.id),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Task Lists (for snagging items)
export const taskLists = pgTable("task_lists", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  installationId: integer("installation_id").references(() => installations.id), // Link to the installation that generated snagging
  name: text("name").notNull(),
  description: text("description"),
  dueDate: date("due_date"),
  status: text("status").notNull().default("open"), // open, in_progress, completed, cancelled
  finalInvoiceBlocked: boolean("final_invoice_blocked").default(true), // Whether final invoice is blocked until this task list is completed
  allTasksCompleted: boolean("all_tasks_completed").default(false), // Whether all tasks in this list are completed
  clientSignoff: boolean("client_signoff").default(false), // Whether client has signed off on completed snagging work
  clientSignoffDate: timestamp("client_signoff_date"), // Date when client signed off on snagging work
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Tasks
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  taskListId: integer("task_list_id").references(() => taskLists.id).notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  priority: text("priority").default("medium"), // low, medium, high
  dueDate: date("due_date"),
  estimatedHours: doublePrecision("estimated_hours"), // Estimated hours to complete task
  actualHours: doublePrecision("actual_hours"), // Actual hours taken to complete task
  assignedTo: integer("assigned_to").references(() => users.id),
  clientApproved: boolean("client_approved").default(false), // Whether client has approved the completed task
  photosRequired: boolean("photos_required").default(false), // Whether photos are required as proof of completion
  photoUrls: jsonb("photo_urls").$type<string[]>(), // URLs of photos uploaded as proof of completion
  completedBy: integer("completed_by").references(() => users.id),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Catalog Items (reusable items for quotes and invoices)
export const catalogItems = pgTable("catalog_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  category: text("category"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Company Settings
export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  companyLogo: text("company_logo"), // URL to the stored logo image
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  vatNumber: text("vat_number"),
  registrationNumber: text("registration_number"),
  certifications: jsonb("certifications").$type<string[]>(), // Array of certification URLs or descriptions
  defaultInvoiceTerms: text("default_invoice_terms"),
  defaultQuoteTerms: text("default_quote_terms"),
  bankDetails: text("bank_details"),
  footerText: text("footer_text"),
  primaryColor: text("primary_color").default("#2563eb"), // Default brand color for documents
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id),
});

// Schema for inserts
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
});

export const insertQuoteItemSchema = createInsertSchema(quoteItems).omit({
  id: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
});

export const insertTimesheetSchema = createInsertSchema(timesheets).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
});

export const insertSurveySchema = createInsertSchema(surveys).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertInstallationSchema = createInsertSchema(installations).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertTaskListSchema = createInsertSchema(taskLists).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertCatalogItemSchema = createInsertSchema(catalogItems).omit({
  id: true,
  createdAt: true,
});

export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({
  id: true,
  updatedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;
export type QuoteItem = typeof quoteItems.$inferSelect;

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;
export type Timesheet = typeof timesheets.$inferSelect;

export type InsertSurvey = z.infer<typeof insertSurveySchema>;
export type Survey = typeof surveys.$inferSelect;

export type InsertInstallation = z.infer<typeof insertInstallationSchema>;
export type Installation = typeof installations.$inferSelect;

export type InsertTaskList = z.infer<typeof insertTaskListSchema>;
export type TaskList = typeof taskLists.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export type InsertCatalogItem = z.infer<typeof insertCatalogItemSchema>;
export type CatalogItem = typeof catalogItems.$inferSelect;

export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
export type CompanySettings = typeof companySettings.$inferSelect;
