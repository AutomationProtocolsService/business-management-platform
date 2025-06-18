import { pgTable, text, serial, integer, boolean, date, timestamp, doublePrecision, jsonb, foreignKey, uniqueIndex, numeric, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, and, eq, sql } from "drizzle-orm";

// Tenants 
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  status: text("status").default("active"), // 'active', 'suspended', 'trial'
  companyName: text("company_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  logoUrl: text("logo_url"),
  customDomain: text("custom_domain").unique(),
  primaryColor: text("primary_color").default("#1E40AF"), // Default to blue
  active: boolean("active").notNull().default(true),
  plan: text("plan").notNull().default("basic"), // basic, professional, enterprise
  trialEnds: timestamp("trial_ends"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
  customTerminology: jsonb("custom_terminology").$type<Record<string, string>>(), // For custom term mapping
  settings: jsonb("settings").$type<Record<string, any>>(), // For tenant-specific settings
});

// Organizations (for multi-tenant grouping)
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Users and Authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(), // Link to tenant
  username: text("username").notNull(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("employee"), // admin, manager, employee - within tenant context
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLogin: timestamp("last_login"),
}, (users) => ({
  // Create a unique constraint for username within each tenant
  uniqueUsername: uniqueIndex("username_tenant_unique").on(users.username, users.tenantId),
}));

// User-Organization relationships (for multi-tenancy)
export const userOrganizations = pgTable("user_organizations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  role: text("role").notNull().default("member"), // member, admin, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    userOrgUnique: uniqueIndex("user_org_unique").on(table.userId, table.organizationId),
  };
});

// Customers
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(), // Link to tenant
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
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(), // Link to tenant
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
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(), // Link to tenant
  quoteNumber: text("quote_number").notNull(),
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
}, (quotes) => ({
  // Create a unique constraint for quote number within each tenant
  uniqueQuoteNumber: uniqueIndex("quote_number_tenant_unique").on(quotes.quoteNumber, quotes.tenantId),
}));

// Quote Items
export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").references(() => quotes.id).notNull(),
  description: text("description").notNull(),
  quantity: doublePrecision("quantity").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  total: doublePrecision("total").notNull(),
  catalogItemId: integer("catalog_item_id").references(() => catalogItems.id)
});

// Invoices
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(), // Link to tenant
  invoiceNumber: text("invoice_number").notNull(),
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
}, (invoices) => ({
  // Create a unique constraint for invoice number within each tenant
  uniqueInvoiceNumber: uniqueIndex("invoice_number_tenant_unique").on(invoices.invoiceNumber, invoices.tenantId),
}));

// Invoice Items
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  description: text("description").notNull(),
  quantity: doublePrecision("quantity").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  total: doublePrecision("total").notNull(),
  catalogItemId: integer("catalog_item_id").references(() => catalogItems.id),
});

// Employees
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(), // For multi-tenant isolation
  userId: integer("user_id").references(() => users.id).unique(),
  fullName: text("full_name"),
  email: text("email"),
  phone: text("phone"),
  position: text("position"),
  department: text("department"),
  hireDate: date("hire_date"),
  terminationDate: date("termination_date"),
  hourlyRate: doublePrecision("hourly_rate"),
  salary: doublePrecision("salary"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Timesheets
export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(), // For multi-tenant isolation
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  projectId: integer("project_id").references(() => projects.id),
  date: date("date").notNull(),
  startTime: timestamp("start_time", { mode: 'string' }), // Made optional
  endTime: timestamp("end_time", { mode: 'string' }),     // Made optional
  breakDuration: integer("break_duration"),
  notes: text("notes"),
  status: text("status").default("pending"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  hours: numeric("hours"), // Calculated or manually entered hours
  billable: boolean("billable").default(true), // Whether the time is billable
  taskDescription: text("task_description"), // Description of the task performed
});

// Surveys
export const surveys = pgTable("surveys", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(), // Link to tenant
  projectId: integer("project_id").references(() => projects.id).notNull(),
  quoteId: integer("quote_id").references(() => quotes.id), // Link to the quote that led to this survey
  scheduledDate: date("scheduled_date").notNull(),
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
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(), // Link to tenant
  projectId: integer("project_id").references(() => projects.id).notNull(),
  quoteId: integer("quote_id").references(() => quotes.id), // Link to the quote that this installation is for
  depositInvoiceId: integer("deposit_invoice_id").references(() => invoices.id), // Link to the deposit invoice that enabled scheduling this installation
  scheduledDate: date("scheduled_date").notNull(),
  startTime: timestamp("start_time"), // Start time for installation
  endTime: timestamp("end_time"), // End time for installation
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
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(), // Link to tenant
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
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(), // Link to tenant
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
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(), // Link to tenant
  name: text("name").notNull(),
  description: text("description").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  category: text("category"),
  sku: text("sku"), // Stock Keeping Unit for inventory tracking
  type: text("type").default("product"), // product or service
  active: boolean("active").default(true), // Whether item is active and available for use
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Suppliers
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(), // Link to tenant
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country"),
  website: text("website"),
  taxId: text("tax_id"), // VAT number or tax ID
  paymentTerms: text("payment_terms"), // e.g., "Net 30", "Net 60"
  category: text("category"), // e.g., "Materials", "Services", "Equipment"
  rating: integer("rating"), // 1-5 star rating
  preferredSupplier: boolean("preferred_supplier").default(false),
  notes: text("notes"),
  bankDetails: text("bank_details"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Expenses
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(), // For multi-tenant isolation
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull(),
  date: date("date").notNull(),
  category: text("category").notNull(), // e.g., "Materials", "Labor", "Transport", "Office", "Other"
  projectId: integer("project_id").references(() => projects.id), // Optional link to a project
  supplierId: integer("supplier_id").references(() => suppliers.id), // Optional link to a supplier
  paymentMethod: text("payment_method"), // e.g., "Cash", "Credit Card", "Bank Transfer"
  receiptUrl: text("receipt_url"), // URL to stored receipt image
  reimbursable: boolean("reimbursable").default(false), // Whether the expense is reimbursable to employee
  reimbursedAt: timestamp("reimbursed_at"), // When the expense was reimbursed
  approved: boolean("approved").default(false),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Purchase Orders
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(), // For multi-tenant isolation
  poNumber: text("po_number").notNull(), // Purchase order number
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  projectId: integer("project_id").references(() => projects.id), // Optional link to a project
  issueDate: date("issue_date").notNull(),
  expectedDeliveryDate: date("expected_delivery_date"),
  deliveryAddress: text("delivery_address"),
  status: text("status").notNull().default("draft"), // draft, sent, confirmed, received, cancelled, partially_received
  subtotal: doublePrecision("subtotal").notNull(),
  tax: doublePrecision("tax"),
  shipping: doublePrecision("shipping"),
  total: doublePrecision("total").notNull(),
  notes: text("notes"),
  terms: text("terms"),
  supplierReference: text("supplier_reference"), // Reference number from supplier
  receivedDate: date("received_date"), // Date when goods were received
  receivedBy: integer("received_by").references(() => users.id), // Who received the goods
  invoiceReceived: boolean("invoice_received").default(false), // Whether invoice was received from supplier
  invoicePaid: boolean("invoice_paid").default(false), // Whether invoice was paid
  invoiceAmount: doublePrecision("invoice_amount"), // Amount of invoice from supplier
  invoiceDate: date("invoice_date"), // Date of invoice from supplier
  invoiceNumber: text("invoice_number"), // Invoice number from supplier
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
}, (purchaseOrders) => ({
  // Create a unique constraint for PO number within each tenant
  uniquePoNumberInTenant: uniqueIndex("po_number_tenant_unique").on(purchaseOrders.poNumber, purchaseOrders.tenantId),
}));

// Inventory Items
export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id), // Link to tenant
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku"), // Internal SKU
  category: text("category"),
  unitOfMeasure: text("unit_of_measure").default("each"), // each, kg, m, etc.
  currentStock: doublePrecision("current_stock").default(0),
  reorderPoint: doublePrecision("reorder_point"), // When to reorder
  reorderQuantity: doublePrecision("reorder_quantity"), // How much to reorder
  location: text("location"), // Where the item is stored
  cost: doublePrecision("cost"), // Average cost per unit
  lastPurchasePrice: doublePrecision("last_purchase_price"), // Last price paid
  taxRate: doublePrecision("tax_rate").default(0.1), // Tax rate as decimal (0.1 = 10%)
  preferredSupplierId: integer("preferred_supplier_id").references(() => suppliers.id), // Preferred supplier for this item
  notes: text("notes"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Purchase Order Items
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id).notNull(),
  description: text("description").notNull(),
  sku: text("sku"), // Supplier SKU or part number
  quantity: doublePrecision("quantity").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  unit: text("unit").default("each"), // each, kg, m, etc.
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id), // Link to inventory item if applicable
  total: doublePrecision("total").notNull(),
  receivedQuantity: doublePrecision("received_quantity").default(0), // How much of this item has been received
  notes: text("notes"),
});

// Inventory Transactions (stock movements)
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id), // Link to tenant
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id).notNull(),
  transactionType: text("transaction_type").notNull(), // purchase, sale, adjustment, transfer, return, write-off
  quantity: doublePrecision("quantity").notNull(), // Positive for in, negative for out
  projectId: integer("project_id").references(() => projects.id), // If this transaction is linked to a project
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id), // If this is a purchase
  unitCost: doublePrecision("unit_cost"), // Cost per unit for this transaction
  notes: text("notes"),
  reference: text("reference"), // Reference number (e.g., invoice number, PO number)
  transactionDate: timestamp("transaction_date").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
});

// File Attachments
export const fileAttachments = pgTable("file_attachments", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  fileUrl: text("file_url").notNull(),
  description: text("description"),
  relatedId: integer("related_id"), // ID of related entity (project, quote, invoice, etc.)
  relatedType: text("related_type"), // Type of related entity (project, quote, invoice, etc.)
  uploadedBy: integer("uploaded_by").references(() => users.id),
  tenantId: integer("tenant_id").references(() => tenants.id), // Tenant ID for multi-tenant isolation
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
  termsAndConditions: text("terms_and_conditions"), // General terms and conditions
  bankDetails: text("bank_details"),
  bankAccountName: text("bank_account_name"),
  bankSortCode: text("bank_sort_code"),
  bankAccountNumber: text("bank_account_number"),
  bankName: text("bank_name"),
  footerText: text("footer_text"),
  primaryColor: text("primary_color").default("#2563eb"), // Default brand color for documents
  currency: text("currency").default("USD"), // Default currency for quotes and invoices
  currencyCode: text("currency_code").default("USD"), // Currency code (USD, EUR, GBP)
  currencySymbol: text("currency_symbol").default("$"), // Default currency symbol
  // Custom terminology
  customTerminology: jsonb("custom_terminology").$type<{
    survey?: string;
    installation?: string;
    quote?: string;
    invoice?: string;
    project?: string;
    customer?: string;
    employee?: string;
    timesheet?: string;
    supplier?: string;
    expense?: string;
    purchaseOrder?: string;
    inventory?: string;
    task?: string;
    payment?: string;
    service?: string;
    product?: string;
    lead?: string;
    opportunity?: string;
    contract?: string;
    milestone?: string;
  }>(), // Custom terms for different modules
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id),
});

// System Settings
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  darkMode: boolean("dark_mode").default(false),
  emailNotifications: boolean("email_notifications").default(true),
  autoSave: boolean("auto_save").default(true),
  defaultPageSize: integer("default_page_size").default(10),
  // Terminology settings
  termCustomer: text("term_customer").default("Customer"),
  termProject: text("term_project").default("Project"),
  termQuote: text("term_quote").default("Quote"),
  termInvoice: text("term_invoice").default("Invoice"),
  termSurvey: text("term_survey").default("Survey"),
  termInstallation: text("term_installation").default("Installation"),
  termSupplier: text("term_supplier").default("Supplier"),
  termExpense: text("term_expense").default("Expense"),
  termPurchaseOrder: text("term_purchase_order").default("Purchase Order"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id),
});

// Schema for inserts
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  customTerminology: true,
  settings: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
}).extend({
  tenantId: z.number().optional(), // Allow server to set tenantId from authenticated user
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
}).extend({
  tenantId: z.number().optional(), // Allow server to set tenantId from authenticated user
});

export const insertQuoteSchema = createInsertSchema(quotes, {
  // Override Zod schema for specific fields
  issueDate: z.string(), // Allow string date format
  expiryDate: z.string().nullable().optional(), // Make optional and nullable
  clientAcceptedAt: z.string().nullable().optional(),
  clientRejectedAt: z.string().nullable().optional(),
  surveyId: z.number().nullable().optional(),
  tax: z.number().optional().default(0), // Default to 0
  discount: z.number().optional().default(0), // Default to 0
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  tenantId: z.number().optional(), // Allow server to set tenantId from authenticated user
  
  // Support for items array
  items: z.array(z.object({
    catalogItemId: z.number().nullable().optional(),
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    // total is optional as it will be calculated server-side
    total: z.number().optional(),
  })).optional(),
  
  // Tax and discount as percentages
  taxPercent: z.number().optional(),
  discountPercent: z.number().optional(),
  
  // Support for reference number provided by client
  reference: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  quoteNumber: true, // Generated on the server
  subtotal: true,    // Calculated on the server
  total: true,       // Calculated on the server
});

export const insertQuoteItemSchema = createInsertSchema(quoteItems).omit({
  id: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices, {
  // Override Zod schema for specific fields
  issueDate: z.string(), // Allow string date format
  dueDate: z.string().nullable().optional(), // Make optional and nullable
  paidAt: z.string().nullable().optional(),
  tax: z.number().optional().default(0), // Default to 0
  discount: z.number().optional().default(0), // Default to 0
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  tenantId: z.number().optional(), // Allow server to set tenantId from authenticated user
  
  // Items will be handled separately
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    total: z.number()
  })).optional(),
}).omit({
  id: true,
  createdAt: true,
  invoiceNumber: true, // Generated on the server
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
});

export const insertEmployeeSchema = createInsertSchema(employees, {
  hireDate: z.string().optional(),
  terminationDate: z.string().optional(),
  tenantId: z.number().optional(), // Allow server to set tenantId from authenticated user
  createdBy: z.number().optional(), // Allow server to set createdBy from authenticated user
}).omit({
  id: true,
  createdAt: true,
});

export const insertTimesheetSchema = createInsertSchema(timesheets).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
  tenantId: true, // Will be set by the API based on authenticated user
});

export const insertSurveySchema = createInsertSchema(surveys, {
  scheduledDate: z.string().optional(),
  notes: z.string().nullable().optional(),
  assignedTo: z.number().nullable().optional(), // Explicitly allow null
  status: z.enum(['scheduled', 'in-progress', 'completed']).default("scheduled"),
  quoteId: z.number().nullable().optional(), // Make quoteId optional since surveys can exist without quotes
  tenantId: z.number().optional(), // Allow server to set tenantId from authenticated user
}).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  completedBy: true,
  measurementsCollected: true,
  photosCollected: true,
  clientPresent: true,
  depositInvoiceRequested: true,
});

export const insertInstallationSchema = createInsertSchema(installations, {
  scheduledDate: z.string().optional(),
  startTime: z.string().datetime().optional().nullable(),
  notes: z.string().nullable().optional(),
  assignedTo: z.union([
    z.array(z.number()), 
    z.null(),
    z.undefined()
  ]).optional().transform(val => val || []), // Default to empty array if null/undefined
  status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled', 'rescheduled']).default("scheduled"),
  quoteId: z.number().optional(), // Made optional for cases where it's not needed
  projectId: z.number(), // Required field
  tenantId: z.number().optional(), // Allow server to set tenantId from authenticated user
}).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  completedBy: true,
  depositInvoiceId: true,
  clientSignoff: true,
  snaggingRequired: true,
  snaggingTaskListId: true,
  finalInvoiceRequested: true,
});

export const insertTaskListSchema = createInsertSchema(taskLists).omit({
  id: true,
  createdAt: true,
  tenantId: true, // Will be set by the API based on authenticated user
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  tenantId: true, // Will be set by the API based on authenticated user
});

export const insertCatalogItemSchema = createInsertSchema(catalogItems).omit({
  id: true,
  createdAt: true,
}).extend({
  tenantId: z.number().optional(), // Allow server to set tenantId from authenticated user
  type: z.enum(['product', 'service']).default('product'),
});

export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({
  id: true,
  updatedAt: true,
});

// Insert schemas for Suppliers Module
export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
  reimbursedAt: true,
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders, {
  // Override Zod schema for specific fields
  issueDate: z.string(), // Allow string date format
  expectedDeliveryDate: z.string().nullable().optional(), // Make optional and nullable
  receivedDate: z.string().nullable().optional(),
  tax: z.number().nullable().optional(), // Default to null
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  shippingMethod: z.string().nullable().optional(),
  deliveryAddress: z.string().nullable().optional(),
  tenantId: z.number().optional(), // Allow server to set tenantId from authenticated user
  
  // Items will be handled separately
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    total: z.number(),
    unit: z.string().nullable().optional(),
    sku: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    inventoryItemId: z.number().nullable().optional(),
    receivedQuantity: z.number().nullable().optional()
  })).optional(),
}).omit({
  id: true,
  createdAt: true,
  poNumber: true, // Generated on the server
});

export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({
  id: true,
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
}).extend({
  tenantId: z.number().optional(), // Allow server to set tenantId from authenticated user
});

export const insertInventoryTransactionSchema = createInsertSchema(inventoryTransactions).omit({
  id: true,
  transactionDate: true,
}).extend({
  tenantId: z.number().optional(), // Allow server to set tenantId from authenticated user
});

export const insertFileAttachmentSchema = createInsertSchema(fileAttachments).omit({
  id: true,
  createdAt: true,
}).extend({
  tenantId: z.number().optional(), // Allow server to set tenantId from authenticated user
});

export const insertSystemSettingsSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

// Types
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

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

// Supplier Module Types
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;

export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;

export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

export type InsertInventoryTransaction = z.infer<typeof insertInventoryTransactionSchema>;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;

export type InsertFileAttachment = z.infer<typeof insertFileAttachmentSchema>;
export type FileAttachment = typeof fileAttachments.$inferSelect;

export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;
export type SystemSettings = typeof systemSettings.$inferSelect;

// User Invitations
export const userInvitations = pgTable("user_invitations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  role: text("role").notNull().default("employee"),
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, expired
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
}, (userInvitations) => ({
  // Create index on token for faster lookups
  tokenIndex: uniqueIndex("user_invitations_token_idx").on(userInvitations.token),
  // Create index on email for checking duplicates
  emailIndex: uniqueIndex("user_invitations_email_tenant_idx").on(userInvitations.email, userInvitations.tenantId),
}));

// Establish relations
export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id]
  }),
  organizations: many(userOrganizations)
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  invitations: many(userInvitations),
  organizations: many(organizations)
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(userOrganizations)
}));

export const userOrganizationsRelations = relations(userOrganizations, ({ one }) => ({
  user: one(users, {
    fields: [userOrganizations.userId],
    references: [users.id]
  }),
  organization: one(organizations, {
    fields: [userOrganizations.organizationId],
    references: [organizations.id]
  })
}));

export const userInvitationsRelations = relations(userInvitations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [userInvitations.tenantId],
    references: [tenants.id]
  }),
  createdByUser: one(users, {
    fields: [userInvitations.createdBy],
    references: [users.id]
  })
}));

// Export types for the invitations
export type UserInvitation = typeof userInvitations.$inferSelect;
export type InsertUserInvitation = typeof userInvitations.$inferInsert;
export const insertUserInvitationSchema = createInsertSchema(userInvitations)
  .omit({ 
    id: true, 
    createdAt: true
  });
export type UserInvitationInsert = z.infer<typeof insertUserInvitationSchema>;

// Password Reset Tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  token: uuid("token").notNull().unique(), // Secure random UUID token
  expiresAt: timestamp("expires_at").notNull(), // Expiration timestamp
  used: boolean("used").default(false), // Flag to mark if token was used
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Establish relations for password reset tokens
export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id]
  }),
  tenant: one(tenants, {
    fields: [passwordResetTokens.tenantId],
    references: [tenants.id]
  })
}));

// Export types for organizations
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;
export const insertOrganizationSchema = createInsertSchema(organizations)
  .omit({
    id: true,
    createdAt: true
  });
export type OrganizationInsert = z.infer<typeof insertOrganizationSchema>;

// Export types for user-organization relationships
export type UserOrganization = typeof userOrganizations.$inferSelect;
export type InsertUserOrganization = typeof userOrganizations.$inferInsert;
export const insertUserOrganizationSchema = createInsertSchema(userOrganizations)
  .omit({
    id: true,
    createdAt: true
  });
export type UserOrganizationInsert = z.infer<typeof insertUserOrganizationSchema>;

// Export types for password reset tokens
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens)
  .omit({
    id: true,
    createdAt: true
  });
export type PasswordResetTokenInsert = z.infer<typeof insertPasswordResetTokenSchema>;
