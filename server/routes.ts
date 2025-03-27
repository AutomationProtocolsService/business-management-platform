import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { generatePdf } from "./services/pdf-service";
import { sendEmail } from "./services/email-service";
import { 
  insertCustomerSchema, 
  insertProjectSchema, 
  insertQuoteSchema, 
  insertQuoteItemSchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
  insertEmployeeSchema,
  insertTimesheetSchema,
  insertSurveySchema,
  insertInstallationSchema,
  insertTaskListSchema,
  insertTaskSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Common authentication middleware for protected routes
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Helper for validating request body with Zod schema
  const validateBody = <T>(schema: z.ZodType<T>) => {
    return (req: Request, res: Response, next: Function) => {
      try {
        schema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Validation failed", errors: error.errors });
        }
        next(error);
      }
    };
  };

  // Customer routes
  app.get("/api/customers", requireAuth, async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const customer = await storage.getCustomer(Number(req.params.id));
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", requireAuth, validateBody(insertCustomerSchema), async (req, res) => {
    try {
      const customer = await storage.createCustomer({
        ...req.body,
        createdBy: req.user?.id
      });
      res.status(201).json(customer);
    } catch (error) {
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.put("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const customerId = Number(req.params.id);
      const customer = await storage.getCustomer(customerId);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const updatedCustomer = await storage.updateCustomer(customerId, req.body);
      res.json(updatedCustomer);
    } catch (error) {
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const customerId = Number(req.params.id);
      const customer = await storage.getCustomer(customerId);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const deleted = await storage.deleteCustomer(customerId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete customer" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Project routes
  app.get("/api/projects", requireAuth, async (req, res) => {
    try {
      const { status, customerId } = req.query;
      
      let projects;
      if (status) {
        projects = await storage.getProjectsByStatus(status as string);
      } else if (customerId) {
        projects = await storage.getProjectsByCustomer(Number(customerId));
      } else {
        projects = await storage.getAllProjects();
      }
      
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(Number(req.params.id));
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", requireAuth, validateBody(insertProjectSchema), async (req, res) => {
    try {
      const project = await storage.createProject({
        ...req.body,
        createdBy: req.user?.id
      });
      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const projectId = Number(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const updatedProject = await storage.updateProject(projectId, req.body);
      res.json(updatedProject);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const projectId = Number(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const deleted = await storage.deleteProject(projectId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete project" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Quote routes
  app.get("/api/quotes", requireAuth, async (req, res) => {
    try {
      const { status, customerId, projectId } = req.query;
      
      let quotes;
      if (status) {
        quotes = await storage.getQuotesByStatus(status as string);
      } else if (customerId) {
        quotes = await storage.getQuotesByCustomer(Number(customerId));
      } else if (projectId) {
        quotes = await storage.getQuotesByProject(Number(projectId));
      } else {
        quotes = await storage.getAllQuotes();
      }
      
      res.json(quotes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.get("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      const quote = await storage.getQuote(Number(req.params.id));
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Get quote items
      const quoteItems = await storage.getQuoteItemsByQuote(quote.id);
      
      res.json({ ...quote, items: quoteItems });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  app.post("/api/quotes", requireAuth, validateBody(insertQuoteSchema), async (req, res) => {
    try {
      // Generate quote number
      const quoteNumber = `Q-${Date.now().toString().substr(-6)}`;
      
      const quote = await storage.createQuote({
        ...req.body,
        quoteNumber,
        createdBy: req.user?.id
      });
      
      res.status(201).json(quote);
    } catch (error) {
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  app.post("/api/quotes/:id/items", requireAuth, validateBody(insertQuoteItemSchema), async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const quote = await storage.getQuote(quoteId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      const quoteItem = await storage.createQuoteItem({
        ...req.body,
        quoteId
      });
      
      // Update quote totals
      const quoteItems = await storage.getQuoteItemsByQuote(quoteId);
      const subtotal = quoteItems.reduce((sum, item) => sum + item.total, 0);
      const total = subtotal - (quote.discount || 0) + (quote.tax || 0);
      
      await storage.updateQuote(quoteId, { subtotal, total });
      
      res.status(201).json(quoteItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to add quote item" });
    }
  });

  app.put("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const quote = await storage.getQuote(quoteId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      const updatedQuote = await storage.updateQuote(quoteId, req.body);
      res.json(updatedQuote);
    } catch (error) {
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  app.delete("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const quote = await storage.getQuote(quoteId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Delete associated quote items first
      const quoteItems = await storage.getQuoteItemsByQuote(quoteId);
      for (const item of quoteItems) {
        await storage.deleteQuoteItem(item.id);
      }
      
      const deleted = await storage.deleteQuote(quoteId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete quote" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete quote" });
    }
  });

  // Quote PDF generation and email
  app.get("/api/quotes/:id/pdf", requireAuth, async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const quote = await storage.getQuote(quoteId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      const quoteItems = await storage.getQuoteItemsByQuote(quoteId);
      const customer = quote.customerId ? await storage.getCustomer(quote.customerId) : null;
      
      const pdfBuffer = await generatePdf('quote', { quote, items: quoteItems, customer });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=quote-${quote.quoteNumber}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  app.post("/api/quotes/:id/email", requireAuth, async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const quote = await storage.getQuote(quoteId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      const quoteItems = await storage.getQuoteItemsByQuote(quoteId);
      const customer = quote.customerId ? await storage.getCustomer(quote.customerId) : null;
      
      if (!customer || !customer.email) {
        return res.status(400).json({ message: "Customer email is required" });
      }
      
      const pdfBuffer = await generatePdf('quote', { quote, items: quoteItems, customer });
      
      await sendEmail({
        to: customer.email,
        subject: `Quote ${quote.quoteNumber}`,
        text: `Please find attached your quote ${quote.quoteNumber}.`,
        attachments: [
          {
            filename: `quote-${quote.quoteNumber}.pdf`,
            content: pdfBuffer
          }
        ]
      });
      
      res.json({ message: "Quote email sent successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to send quote email" });
    }
  });

  // Convert quote to invoice
  app.post("/api/quotes/:id/convert-to-invoice", requireAuth, async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const quote = await storage.getQuote(quoteId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now().toString().substr(-6)}`;
      
      // Create invoice from quote
      const invoice = await storage.createInvoice({
        invoiceNumber,
        projectId: quote.projectId,
        customerId: quote.customerId,
        quoteId: quote.id,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: "issued",
        subtotal: quote.subtotal,
        tax: quote.tax,
        discount: quote.discount,
        total: quote.total,
        notes: quote.notes,
        terms: quote.terms,
        createdBy: req.user?.id
      });
      
      // Copy quote items to invoice items
      const quoteItems = await storage.getQuoteItemsByQuote(quoteId);
      
      for (const item of quoteItems) {
        await storage.createInvoiceItem({
          invoiceId: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        });
      }
      
      // Update quote status
      await storage.updateQuote(quoteId, { status: "converted" });
      
      res.status(201).json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to convert quote to invoice" });
    }
  });

  // Invoice routes
  app.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      const { status, customerId, projectId } = req.query;
      
      let invoices;
      if (status) {
        invoices = await storage.getInvoicesByStatus(status as string);
      } else if (customerId) {
        invoices = await storage.getInvoicesByCustomer(Number(customerId));
      } else if (projectId) {
        invoices = await storage.getInvoicesByProject(Number(projectId));
      } else {
        invoices = await storage.getAllInvoices();
      }
      
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(Number(req.params.id));
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Get invoice items
      const invoiceItems = await storage.getInvoiceItemsByInvoice(invoice.id);
      
      res.json({ ...invoice, items: invoiceItems });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", requireAuth, validateBody(insertInvoiceSchema), async (req, res) => {
    try {
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now().toString().substr(-6)}`;
      
      const invoice = await storage.createInvoice({
        ...req.body,
        invoiceNumber,
        createdBy: req.user?.id
      });
      
      res.status(201).json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.post("/api/invoices/:id/items", requireAuth, validateBody(insertInvoiceItemSchema), async (req, res) => {
    try {
      const invoiceId = Number(req.params.id);
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const invoiceItem = await storage.createInvoiceItem({
        ...req.body,
        invoiceId
      });
      
      // Update invoice totals
      const invoiceItems = await storage.getInvoiceItemsByInvoice(invoiceId);
      const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
      const total = subtotal - (invoice.discount || 0) + (invoice.tax || 0);
      
      await storage.updateInvoice(invoiceId, { subtotal, total });
      
      res.status(201).json(invoiceItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to add invoice item" });
    }
  });

  app.put("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoiceId = Number(req.params.id);
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const updatedInvoice = await storage.updateInvoice(invoiceId, req.body);
      res.json(updatedInvoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoiceId = Number(req.params.id);
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Delete associated invoice items first
      const invoiceItems = await storage.getInvoiceItemsByInvoice(invoiceId);
      for (const item of invoiceItems) {
        await storage.deleteInvoiceItem(item.id);
      }
      
      const deleted = await storage.deleteInvoice(invoiceId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete invoice" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // Invoice PDF generation and email
  app.get("/api/invoices/:id/pdf", requireAuth, async (req, res) => {
    try {
      const invoiceId = Number(req.params.id);
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const invoiceItems = await storage.getInvoiceItemsByInvoice(invoiceId);
      const customer = invoice.customerId ? await storage.getCustomer(invoice.customerId) : null;
      
      const pdfBuffer = await generatePdf('invoice', { invoice, items: invoiceItems, customer });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  app.post("/api/invoices/:id/email", requireAuth, async (req, res) => {
    try {
      const invoiceId = Number(req.params.id);
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const invoiceItems = await storage.getInvoiceItemsByInvoice(invoiceId);
      const customer = invoice.customerId ? await storage.getCustomer(invoice.customerId) : null;
      
      if (!customer || !customer.email) {
        return res.status(400).json({ message: "Customer email is required" });
      }
      
      const pdfBuffer = await generatePdf('invoice', { invoice, items: invoiceItems, customer });
      
      await sendEmail({
        to: customer.email,
        subject: `Invoice ${invoice.invoiceNumber}`,
        text: `Please find attached your invoice ${invoice.invoiceNumber}.`,
        attachments: [
          {
            filename: `invoice-${invoice.invoiceNumber}.pdf`,
            content: pdfBuffer
          }
        ]
      });
      
      res.json({ message: "Invoice email sent successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to send invoice email" });
    }
  });

  // Employees routes
  app.get("/api/employees", requireAuth, async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:id", requireAuth, async (req, res) => {
    try {
      const employee = await storage.getEmployee(Number(req.params.id));
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", requireAuth, validateBody(insertEmployeeSchema), async (req, res) => {
    try {
      const employee = await storage.createEmployee(req.body);
      res.status(201).json(employee);
    } catch (error) {
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  app.put("/api/employees/:id", requireAuth, async (req, res) => {
    try {
      const employeeId = Number(req.params.id);
      const employee = await storage.getEmployee(employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const updatedEmployee = await storage.updateEmployee(employeeId, req.body);
      res.json(updatedEmployee);
    } catch (error) {
      res.status(500).json({ message: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", requireAuth, async (req, res) => {
    try {
      const employeeId = Number(req.params.id);
      const employee = await storage.getEmployee(employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const deleted = await storage.deleteEmployee(employeeId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete employee" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Timesheet routes
  app.get("/api/timesheets", requireAuth, async (req, res) => {
    try {
      const { employeeId, projectId, startDate, endDate } = req.query;
      
      let timesheets;
      if (employeeId) {
        timesheets = await storage.getTimesheetsByEmployee(Number(employeeId));
      } else if (projectId) {
        timesheets = await storage.getTimesheetsByProject(Number(projectId));
      } else if (startDate && endDate) {
        timesheets = await storage.getTimesheetsByDateRange(new Date(startDate as string), new Date(endDate as string));
      } else {
        timesheets = await storage.getAllTimesheets();
      }
      
      res.json(timesheets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch timesheets" });
    }
  });

  app.get("/api/timesheets/:id", requireAuth, async (req, res) => {
    try {
      const timesheet = await storage.getTimesheet(Number(req.params.id));
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      res.json(timesheet);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch timesheet" });
    }
  });

  app.post("/api/timesheets", requireAuth, validateBody(insertTimesheetSchema), async (req, res) => {
    try {
      const timesheet = await storage.createTimesheet(req.body);
      res.status(201).json(timesheet);
    } catch (error) {
      res.status(500).json({ message: "Failed to create timesheet" });
    }
  });

  app.put("/api/timesheets/:id", requireAuth, async (req, res) => {
    try {
      const timesheetId = Number(req.params.id);
      const timesheet = await storage.getTimesheet(timesheetId);
      
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      
      const updatedTimesheet = await storage.updateTimesheet(timesheetId, req.body);
      res.json(updatedTimesheet);
    } catch (error) {
      res.status(500).json({ message: "Failed to update timesheet" });
    }
  });

  app.delete("/api/timesheets/:id", requireAuth, async (req, res) => {
    try {
      const timesheetId = Number(req.params.id);
      const timesheet = await storage.getTimesheet(timesheetId);
      
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      
      const deleted = await storage.deleteTimesheet(timesheetId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete timesheet" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete timesheet" });
    }
  });

  // Approve timesheet route
  app.post("/api/timesheets/:id/approve", requireAuth, async (req, res) => {
    try {
      const timesheetId = Number(req.params.id);
      const timesheet = await storage.getTimesheet(timesheetId);
      
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      
      // Check if the current user has manager/admin role
      const user = req.user;
      if (!user || (user.role !== 'manager' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Unauthorized: Only managers or admins can approve timesheets" });
      }
      
      const updatedTimesheet = await storage.updateTimesheet(timesheetId, { 
        status: "approved",
        approvedBy: user.id,
        approvedAt: new Date()
      });
      
      res.json(updatedTimesheet);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve timesheet" });
    }
  });

  // Survey routes
  app.get("/api/surveys", requireAuth, async (req, res) => {
    try {
      const { projectId, status, startDate, endDate } = req.query;
      
      let surveys;
      if (projectId) {
        surveys = await storage.getSurveysByProject(Number(projectId));
      } else if (status) {
        surveys = await storage.getSurveysByStatus(status as string);
      } else if (startDate && endDate) {
        surveys = await storage.getSurveysByDateRange(new Date(startDate as string), new Date(endDate as string));
      } else {
        surveys = await storage.getAllSurveys();
      }
      
      res.json(surveys);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch surveys" });
    }
  });

  app.get("/api/surveys/:id", requireAuth, async (req, res) => {
    try {
      const survey = await storage.getSurvey(Number(req.params.id));
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      res.json(survey);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch survey" });
    }
  });

  app.post("/api/surveys", requireAuth, validateBody(insertSurveySchema), async (req, res) => {
    try {
      const survey = await storage.createSurvey({
        ...req.body,
        createdBy: req.user?.id
      });
      res.status(201).json(survey);
    } catch (error) {
      res.status(500).json({ message: "Failed to create survey" });
    }
  });

  app.put("/api/surveys/:id", requireAuth, async (req, res) => {
    try {
      const surveyId = Number(req.params.id);
      const survey = await storage.getSurvey(surveyId);
      
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      const updatedSurvey = await storage.updateSurvey(surveyId, req.body);
      res.json(updatedSurvey);
    } catch (error) {
      res.status(500).json({ message: "Failed to update survey" });
    }
  });

  app.delete("/api/surveys/:id", requireAuth, async (req, res) => {
    try {
      const surveyId = Number(req.params.id);
      const survey = await storage.getSurvey(surveyId);
      
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      const deleted = await storage.deleteSurvey(surveyId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete survey" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete survey" });
    }
  });

  // Complete survey route
  app.post("/api/surveys/:id/complete", requireAuth, async (req, res) => {
    try {
      const surveyId = Number(req.params.id);
      const survey = await storage.getSurvey(surveyId);
      
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      const updatedSurvey = await storage.updateSurvey(surveyId, { 
        status: "completed",
        completedBy: req.user?.id,
        completedAt: new Date(),
        ...req.body
      });
      
      res.json(updatedSurvey);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete survey" });
    }
  });

  // Installation routes
  app.get("/api/installations", requireAuth, async (req, res) => {
    try {
      const { projectId, status, startDate, endDate } = req.query;
      
      let installations;
      if (projectId) {
        installations = await storage.getInstallationsByProject(Number(projectId));
      } else if (status) {
        installations = await storage.getInstallationsByStatus(status as string);
      } else if (startDate && endDate) {
        installations = await storage.getInstallationsByDateRange(new Date(startDate as string), new Date(endDate as string));
      } else {
        installations = await storage.getAllInstallations();
      }
      
      res.json(installations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch installations" });
    }
  });

  app.get("/api/installations/:id", requireAuth, async (req, res) => {
    try {
      const installation = await storage.getInstallation(Number(req.params.id));
      if (!installation) {
        return res.status(404).json({ message: "Installation not found" });
      }
      res.json(installation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch installation" });
    }
  });

  app.post("/api/installations", requireAuth, validateBody(insertInstallationSchema), async (req, res) => {
    try {
      const installation = await storage.createInstallation({
        ...req.body,
        createdBy: req.user?.id
      });
      res.status(201).json(installation);
    } catch (error) {
      res.status(500).json({ message: "Failed to create installation" });
    }
  });

  app.put("/api/installations/:id", requireAuth, async (req, res) => {
    try {
      const installationId = Number(req.params.id);
      const installation = await storage.getInstallation(installationId);
      
      if (!installation) {
        return res.status(404).json({ message: "Installation not found" });
      }
      
      const updatedInstallation = await storage.updateInstallation(installationId, req.body);
      res.json(updatedInstallation);
    } catch (error) {
      res.status(500).json({ message: "Failed to update installation" });
    }
  });

  app.delete("/api/installations/:id", requireAuth, async (req, res) => {
    try {
      const installationId = Number(req.params.id);
      const installation = await storage.getInstallation(installationId);
      
      if (!installation) {
        return res.status(404).json({ message: "Installation not found" });
      }
      
      const deleted = await storage.deleteInstallation(installationId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete installation" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete installation" });
    }
  });

  // Complete installation route
  app.post("/api/installations/:id/complete", requireAuth, async (req, res) => {
    try {
      const installationId = Number(req.params.id);
      const installation = await storage.getInstallation(installationId);
      
      if (!installation) {
        return res.status(404).json({ message: "Installation not found" });
      }
      
      const updatedInstallation = await storage.updateInstallation(installationId, { 
        status: "completed",
        completedBy: req.user?.id,
        completedAt: new Date(),
        ...req.body
      });
      
      res.json(updatedInstallation);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete installation" });
    }
  });

  // Task List routes
  app.get("/api/task-lists", requireAuth, async (req, res) => {
    try {
      const { projectId } = req.query;
      
      let taskLists;
      if (projectId) {
        taskLists = await storage.getTaskListsByProject(Number(projectId));
      } else {
        taskLists = await storage.getAllTaskLists();
      }
      
      res.json(taskLists);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task lists" });
    }
  });

  app.get("/api/task-lists/:id", requireAuth, async (req, res) => {
    try {
      const taskList = await storage.getTaskList(Number(req.params.id));
      if (!taskList) {
        return res.status(404).json({ message: "Task list not found" });
      }
      
      // Get tasks for this task list
      const tasks = await storage.getTasksByTaskList(taskList.id);
      
      res.json({ ...taskList, tasks });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task list" });
    }
  });

  app.post("/api/task-lists", requireAuth, validateBody(insertTaskListSchema), async (req, res) => {
    try {
      const taskList = await storage.createTaskList({
        ...req.body,
        createdBy: req.user?.id
      });
      res.status(201).json(taskList);
    } catch (error) {
      res.status(500).json({ message: "Failed to create task list" });
    }
  });

  app.put("/api/task-lists/:id", requireAuth, async (req, res) => {
    try {
      const taskListId = Number(req.params.id);
      const taskList = await storage.getTaskList(taskListId);
      
      if (!taskList) {
        return res.status(404).json({ message: "Task list not found" });
      }
      
      const updatedTaskList = await storage.updateTaskList(taskListId, req.body);
      res.json(updatedTaskList);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task list" });
    }
  });

  app.delete("/api/task-lists/:id", requireAuth, async (req, res) => {
    try {
      const taskListId = Number(req.params.id);
      const taskList = await storage.getTaskList(taskListId);
      
      if (!taskList) {
        return res.status(404).json({ message: "Task list not found" });
      }
      
      // Delete all tasks in this list first
      const tasks = await storage.getTasksByTaskList(taskListId);
      for (const task of tasks) {
        await storage.deleteTask(task.id);
      }
      
      const deleted = await storage.deleteTaskList(taskListId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete task list" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task list" });
    }
  });

  // Task routes
  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const { taskListId, assignedTo } = req.query;
      
      let tasks;
      if (taskListId) {
        tasks = await storage.getTasksByTaskList(Number(taskListId));
      } else if (assignedTo) {
        tasks = await storage.getTasksByAssignee(Number(assignedTo));
      } else {
        // This is a placeholder as we don't have a getAllTasks method
        // but we could add one if needed
        return res.status(400).json({ message: "taskListId or assignedTo query parameter is required" });
      }
      
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const task = await storage.getTask(Number(req.params.id));
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", requireAuth, validateBody(insertTaskSchema), async (req, res) => {
    try {
      const task = await storage.createTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const taskId = Number(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const updatedTask = await storage.updateTask(taskId, req.body);
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const taskId = Number(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const deleted = await storage.deleteTask(taskId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete task" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Complete task route
  app.post("/api/tasks/:id/complete", requireAuth, async (req, res) => {
    try {
      const taskId = Number(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const updatedTask = await storage.updateTask(taskId, { 
        status: "completed",
        completedBy: req.user?.id,
        completedAt: new Date()
      });
      
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  // Dashboard summary route
  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      // Get counts and summaries for dashboard widgets
      const projects = await storage.getAllProjects();
      const quotes = await storage.getAllQuotes();
      const invoices = await storage.getAllInvoices();
      const surveys = await storage.getAllSurveys();
      
      // Project stats
      const totalProjects = projects.length;
      const projectsByStatus = {
        pending: projects.filter(p => p.status === 'pending').length,
        inProgress: projects.filter(p => p.status === 'in-progress').length,
        completed: projects.filter(p => p.status === 'completed').length,
        delayed: projects.filter(p => p.status === 'delayed').length
      };
      
      // Quote stats
      const pendingQuotesCount = quotes.filter(q => q.status === 'pending').length;
      
      // Invoice stats
      const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);
      
      // Survey stats
      const upcomingSurveys = surveys.filter(s => {
        const surveyDate = new Date(s.scheduledDate);
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        return s.status === 'scheduled' && surveyDate >= today && surveyDate <= nextWeek;
      }).length;
      
      // Get recent activities (placeholder for a real activity log)
      // In a real app, you'd have an activities table to track this
      const recentProjects = projects.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 5);
      
      // Get upcoming schedule (combine surveys and installations)
      const installations = await storage.getAllInstallations();
      
      const upcomingEvents = [
        ...surveys.map(s => ({
          type: 'survey',
          id: s.id,
          projectId: s.projectId,
          date: s.scheduledDate,
          status: s.status
        })),
        ...installations.map(i => ({
          type: 'installation',
          id: i.id,
          projectId: i.projectId,
          date: i.scheduledDate,
          status: i.status
        }))
      ]
      .filter(event => {
        const eventDate = new Date(event.date);
        const today = new Date();
        const threeWeeksLater = new Date();
        threeWeeksLater.setDate(threeWeeksLater.getDate() + 21);
        
        return event.status === 'scheduled' && eventDate >= today && eventDate <= threeWeeksLater;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
      
      // Enhance upcoming events with project details
      const upcomingEventsWithDetails = await Promise.all(upcomingEvents.map(async event => {
        const project = await storage.getProject(event.projectId);
        return {
          ...event,
          projectName: project?.name || 'Unknown Project'
        };
      }));
      
      res.json({
        stats: {
          projects: {
            total: totalProjects,
            byStatus: projectsByStatus
          },
          quotes: {
            pendingCount: pendingQuotesCount
          },
          invoices: {
            totalAmount: totalInvoiceAmount
          },
          surveys: {
            upcomingCount: upcomingSurveys
          }
        },
        recentProjects,
        upcomingEvents: upcomingEventsWithDetails
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Calendar events route
  app.get("/api/calendar", requireAuth, async (req, res) => {
    try {
      const { start, end } = req.query;
      
      if (!start || !end) {
        return res.status(400).json({ message: "start and end date parameters are required" });
      }
      
      const startDate = new Date(start as string);
      const endDate = new Date(end as string);
      
      // Get surveys and installations in the date range
      const surveys = await storage.getSurveysByDateRange(startDate, endDate);
      const installations = await storage.getInstallationsByDateRange(startDate, endDate);
      
      // Format data for calendar
      const events = [
        ...surveys.map(survey => ({
          id: `survey-${survey.id}`,
          title: `Survey`,
          start: survey.startTime || new Date(survey.scheduledDate).toISOString(),
          end: survey.endTime || new Date(survey.scheduledDate).toISOString(),
          type: 'survey',
          status: survey.status,
          projectId: survey.projectId,
          assignedTo: survey.assignedTo
        })),
        ...installations.map(installation => ({
          id: `installation-${installation.id}`,
          title: `Installation`,
          start: installation.startTime || new Date(installation.scheduledDate).toISOString(),
          end: installation.endTime || new Date(installation.scheduledDate).toISOString(),
          type: 'installation',
          status: installation.status,
          projectId: installation.projectId,
          assignedTo: installation.assignedTo
        }))
      ];
      
      // Enhance events with project details
      const eventsWithProjectDetails = await Promise.all(events.map(async event => {
        const project = await storage.getProject(event.projectId);
        return {
          ...event,
          projectName: project?.name || 'Unknown Project'
        };
      }));
      
      res.json(eventsWithProjectDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
