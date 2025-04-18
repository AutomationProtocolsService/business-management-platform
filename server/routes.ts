import { Express, Request, Response, NextFunction } from "express";
import { Server, createServer } from "http";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { StreamBuffers } from "stream-buffers";
import PDFDocument from "pdfkit";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import multer from "multer";
import { createInsertSchema } from "drizzle-zod";
import { PDFKit } from "pdfkit";
import { 
  insertCustomerSchema, 
  insertQuoteSchema,
  insertQuoteItemSchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
  insertProjectSchema,
  insertJobSchema,
  insertCatalogItemSchema,
  insertCompanySettingsSchema,
  insertTenantSchema,
  insertUserRoleSchema
} from "../shared/schema";
import { storage } from "./storage";
import { getWebSocketManager } from "./websocket";
import EmailService from "./services/email-service";
import PDFService from "./services/pdf-service";
import FileService from "./services/file-service";
import SecurityService from "./services/security-service";
import { 
  getNumberedDocument, 
  countInvoicesForTenant,
  countQuotesForTenant
} from "./utils/document-numbering";

/**
 * Helper to get a tenant filter object from a request
 * Returns { tenantId: number } or undefined
 */
function getTenantFilterFromRequest(req: Request): { tenantId: number } | undefined {
  return req.tenant?.id ? { tenantId: req.tenant.id } : undefined;
}

/**
 * Helper to get just the tenant ID number from a request
 * Returns the tenant ID or undefined
 */
function getTenantIdFromRequest(req: Request): number | undefined {
  return req.tenant?.id;
}

/**
 * Validate request body against a schema
 */
function validateBody(schema: z.ZodType<any, any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      next(error);
    }
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up middleware for file uploads
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    }
  });

  // Public tenant endpoint - no auth required
  app.get("/api/public/tenants", async (req: Request, res: Response) => {
    try {
      const tenants = await storage.getActiveTenants();
      res.json(tenants);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  // Authentication middleware - checks if user is logged in
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Role-based access control middleware
  const requireRole = (requiredRole: string) => {
    return (req: Request, res: Response, next: Function) => {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get user's role from req.user
      const userRole = req.user.role || 'user';
      
      // Simple role hierarchy
      const roleHierarchy: { [key: string]: number } = {
        'owner': 100,
        'admin': 80,
        'manager': 60,
        'user': 40,
        'guest': 20
      };
      
      const userRoleLevel = roleHierarchy[userRole] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
      
      if (userRoleLevel < requiredRoleLevel) {
        return res.status(403).json({ 
          message: "Access denied",
          currentRole: userRole,
          requiredRole: requiredRole
        });
      }
      
      next();
    };
  };

  // Current tenant info endpoint
  app.get("/api/tenant", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant context available" });
      }
      
      const tenant = await storage.getTenant(tenantId);
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      res.json(tenant);
    } catch (error) {
      console.error('Error fetching tenant:', error);
      res.status(500).json({ message: "Failed to fetch tenant information" });
    }
  });

  // Tenant settings endpoints
  app.get("/api/tenant/settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant context available" });
      }
      
      const settings = await storage.getTenantSettings(tenantId);
      
      if (!settings) {
        return res.status(404).json({ message: "Tenant settings not found" });
      }
      
      res.json(settings);
    } catch (error) {
      console.error('Error fetching tenant settings:', error);
      res.status(500).json({ message: "Failed to fetch tenant settings" });
    }
  });

  app.patch("/api/tenant/settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant context available" });
      }
      
      const settings = await storage.updateTenantSettings(tenantId, req.body);
      
      if (!settings) {
        return res.status(404).json({ message: "Failed to update tenant settings" });
      }
      
      res.json(settings);
    } catch (error) {
      console.error('Error updating tenant settings:', error);
      res.status(500).json({ message: "Failed to update tenant settings" });
    }
  });

  // Customer routes
  app.get("/api/customers", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      
      console.log(`Fetching customers for tenant ID: ${tenantId}`);
      const customers = await storage.getAllCustomers(tenantId);
      
      // Get related data for reporting
      for (const customer of customers) {
        customer.stats = {
          quoteCount: 0,
          invoiceCount: 0,
          projectCount: 0,
          totalValue: 0
        };
      }
      
      res.json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", requireAuth, validateBody(insertCustomerSchema), async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      
      const customer = await storage.createCustomer({
        ...req.body,
        createdBy: req.user?.id,
        tenantId: tenantId
      });
      
      res.status(201).json(customer);
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.get("/api/customers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const customerId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const customer = await storage.getCustomer(customerId, tenantId);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(customer.tenantId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(customer);
    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.put("/api/customers/:id", requireAuth, validateBody(insertCustomerSchema), async (req: Request, res: Response) => {
    try {
      const customerId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const customer = await storage.getCustomer(customerId, tenantId);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(customer.tenantId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedCustomer = await storage.updateCustomer(customerId, req.body, tenantId);
      res.json(updatedCustomer);
    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const customerId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const customer = await storage.getCustomer(customerId, tenantId);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(customer.tenantId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const deleted = await storage.deleteCustomer(customerId, tenantId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete customer" });
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Project routes
  app.get("/api/projects", requireAuth, async (req: Request, res: Response) => {
    try {
      const { status, customerId } = req.query;
      const tenantId = getTenantIdFromRequest(req);
      
      let projects;
      if (status) {
        projects = await storage.getProjectsByStatus(status as string, tenantId);
      } else if (customerId) {
        projects = await storage.getProjectsByCustomer(Number(customerId), tenantId);
      } else {
        const tenantId = getTenantIdFromRequest(req); 
        projects = await storage.getAllProjects(tenantId);
      }
      
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", requireAuth, validateBody(insertProjectSchema), async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      
      const project = await storage.createProject({
        ...req.body,
        createdBy: req.user?.id,
        tenantId: tenantId
      });
      
      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.get("/api/projects/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const project = await storage.getProject(projectId, tenantId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(project.tenantId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.put("/api/projects/:id", requireAuth, validateBody(insertProjectSchema), async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const project = await storage.getProject(projectId, tenantId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(project.tenantId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedProject = await storage.updateProject(projectId, req.body, tenantId);
      res.json(updatedProject);
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const project = await storage.getProject(projectId, tenantId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(project.tenantId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const deleted = await storage.deleteProject(projectId, tenantId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete project" });
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Quote routes
  app.get("/api/quotes", requireAuth, async (req: Request, res: Response) => {
    try {
      const { status, customerId, projectId } = req.query;
      const tenantId = getTenantIdFromRequest(req);
      
      let quotes;
      if (status) {
        quotes = await storage.getQuotesByStatus(status as string, tenantId);
      } else if (customerId) {
        quotes = await storage.getQuotesByCustomer(Number(customerId), tenantId);
      } else if (projectId) {
        quotes = await storage.getQuotesByProject(Number(projectId), tenantId);
      } else {
        const tenantId = getTenantIdFromRequest(req);
        quotes = await storage.getAllQuotes(tenantId);
      }
      
      res.json(quotes);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.post("/api/quotes", requireAuth, validateBody(insertQuoteSchema), async (req: Request, res: Response) => {
    try {
      // Extract items from the request body if present
      const { items, ...quoteData } = req.body;
      const tenantId = getTenantIdFromRequest(req);
      
      // Generate quote number
      const quoteNumber = await getNumberedDocument("QUO", tenantId);
      
      // Create the quote without items first
      const quote = await storage.createQuote({
        ...quoteData,
        quoteNumber,
        createdBy: req.user?.id,
        status: quoteData.status || "draft",
        tenantId: tenantId // Add tenant ID to the quote
      });
      
      // Now add items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          await storage.createQuoteItem({
            ...item,
            quoteId: quote.id
          });
        }
      }
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcast("quote:created", {
          id: quote.id,
          data: quote,
          message: `New quote created: ${quoteNumber}`,
          timestamp: new Date().toISOString(),
          tenantId: tenantId // Include tenant ID in the notification
        }, tenantId); // Pass tenant ID to limit broadcast scope
      }
      
      res.status(201).json(quote);
    } catch (error) {
      console.error("Failed to create quote:", error);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  app.get("/api/quotes/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const quoteId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const quote = await storage.getQuote(quoteId, tenantId);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(quote.tenantId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get quote items
      const quoteItems = await storage.getQuoteItemsByQuote(quoteId);
      
      res.json({ ...quote, items: quoteItems });
    } catch (error) {
      console.error('Error fetching quote:', error);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  // Get quote items for a specific quote
  app.get("/api/quotes/:id/items", requireAuth, async (req: Request, res: Response) => {
    try {
      const quoteId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      // First check if the quote exists and the user has access
      const quote = await storage.getQuote(quoteId, tenantId);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(quote.tenantId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get quote items
      const quoteItems = await storage.getQuoteItemsByQuote(quoteId);
      console.log(`Fetched ${quoteItems.length} items for quote ${quoteId}`);
      
      res.json(quoteItems);
    } catch (error) {
      console.error('Error fetching quote items:', error);
      res.status(500).json({ message: 'Failed to fetch quote items' });
    }
  });

  // Update quote status only - no schema validation for status-only updates
  app.patch("/api/quotes/:id/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const quoteId = Number(req.params.id);
      const { status } = req.body;
      const tenantId = getTenantIdFromRequest(req);
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      // Validate status
      const validStatuses = ["draft", "sent", "accepted", "rejected", "converted"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: "Invalid status",
          validValues: validStatuses
        });
      }
      
      const quote = await storage.getQuote(quoteId, tenantId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(quote.tenantId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Update just the status field
      const updatedQuote = await storage.updateQuote(quoteId, { status }, tenantId);
      console.log(`Updated quote ${quoteId} status to ${status}`);
      
      res.json(updatedQuote);
    } catch (error) {
      console.error('Error updating quote status:', error);
      res.status(500).json({ message: "Failed to update quote status" });
    }
  });

  app.put("/api/quotes/:id", requireAuth, validateBody(insertQuoteSchema), async (req: Request, res: Response) => {
    try {
      const quoteId = Number(req.params.id);
      const { items, ...quoteData } = req.body;
      const tenantId = getTenantIdFromRequest(req);
      
      const quote = await storage.getQuote(quoteId, tenantId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(quote.tenantId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedQuote = await storage.updateQuote(quoteId, quoteData, tenantId);
      
      // If items are provided, update them
      if (items && Array.isArray(items)) {
        // First delete existing items
        const existingItems = await storage.getQuoteItemsByQuote(quoteId);
        for (const item of existingItems) {
          await storage.deleteQuoteItem(item.id);
        }
        
        // Then add new items
        for (const item of items) {
          await storage.createQuoteItem({
            ...item,
            quoteId
          });
        }
      }
      
      res.json(updatedQuote);
    } catch (error) {
      console.error('Error updating quote:', error);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  app.delete("/api/quotes/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const quoteId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const quote = await storage.getQuote(quoteId, tenantId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(quote.tenantId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Delete associated items first
      const quoteItems = await storage.getQuoteItemsByQuote(quoteId);
      for (const item of quoteItems) {
        await storage.deleteQuoteItem(item.id);
      }
      
      const deleted = await storage.deleteQuote(quoteId, tenantId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete quote" });
      }
    } catch (error) {
      console.error('Error deleting quote:', error);
      res.status(500).json({ message: "Failed to delete quote" });
    }
  });

  // Quote items
  app.post("/api/quotes/:id/items", requireAuth, validateBody(insertQuoteItemSchema), async (req: Request, res: Response) => {
    try {
      const quoteId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const quote = await storage.getQuote(quoteId, tenantId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(quote.tenantId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const quoteItem = await storage.createQuoteItem({
        ...req.body,
        quoteId
      });
      
      // Update quote totals
      const quoteItems = await storage.getQuoteItemsByQuote(quoteId);
      const subtotal = quoteItems.reduce((sum, item) => sum + item.total, 0);
      const total = subtotal - (quote.discount || 0) + (quote.tax || 0);
      
      await storage.updateQuote(quoteId, { subtotal, total }, tenantId);
      
      res.status(201).json(quoteItem);
    } catch (error) {
      console.error('Error adding quote item:', error);
      res.status(500).json({ message: "Failed to add quote item" });
    }
  });

  app.delete("/api/quotes/:quoteId/items/:itemId", requireAuth, async (req: Request, res: Response) => {
    try {
      const quoteId = Number(req.params.quoteId);
      const itemId = Number(req.params.itemId);
      const tenantId = getTenantIdFromRequest(req);
      
      const quote = await storage.getQuote(quoteId, tenantId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(quote.tenantId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const deleted = await storage.deleteQuoteItem(itemId);
      
      if (deleted) {
        // Update quote totals
        const quoteItems = await storage.getQuoteItemsByQuote(quoteId);
        const subtotal = quoteItems.reduce((sum, item) => sum + item.total, 0);
        const total = subtotal - (quote.discount || 0) + (quote.tax || 0);
        
        await storage.updateQuote(quoteId, { subtotal, total }, tenantId);
        
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete quote item" });
      }
    } catch (error) {
      console.error('Error deleting quote item:', error);
      res.status(500).json({ message: "Failed to delete quote item" });
    }
  });

  // Generate quote PDF
  app.get("/api/quotes/:id/pdf", requireAuth, async (req: Request, res: Response) => {
    try {
      const quoteId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      console.log(`[PDF Route] Generating PDF for Quote ID: ${quoteId}`);
      console.log(`[PDF Route] Tenant ID: ${tenantId}`);
      
      // Fetch the quote data with tenant context
      const quote = await storage.getQuote(quoteId, tenantId);
      
      if (!quote) {
        console.log(`[PDF Route] Quote not found with ID: ${quoteId}`);
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Check if user has access to this resource - using tenantId to verify access
      if (req.isTenantResource && !req.isTenantResource(quote.tenantId)) {
        console.log(`[PDF Route] Access denied for user to Quote ID: ${quoteId}`);
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Log basic quote info
      console.log(`[PDF Route] Quote found:`);
      console.log(`  - ID: ${quote.id}`);
      console.log(`  - Number: ${quote.quoteNumber}`);
      console.log(`  - Customer ID: ${quote.customerId}`);
      console.log(`  - Project ID: ${quote.projectId}`);
      
      // Get quote items
      const quoteItems = await storage.getQuoteItemsByQuote(quoteId);
      console.log(`[PDF Route] Found ${quoteItems.length} quote items`);
      
      // Get customer and project information for the PDF - using explicit approach
      let customer = null;
      let project = null;
      
      // Fetch customer if we have a customer ID
      if (quote.customerId) {
        try {
          console.log(`[PDF Route] Fetching customer with ID: ${quote.customerId}`);
          customer = await storage.getCustomer(quote.customerId, tenantId);
          if (customer) {
            console.log(`[PDF Route] Customer found: ${customer.name} (ID: ${customer.id})`);
          } else {
            console.log(`[PDF Route] No customer found with ID: ${quote.customerId}`);
          }
        } catch (err) {
          console.error(`[PDF Route] Error fetching customer:`, err);
        }
      } else {
        console.log(`[PDF Route] No customer ID on quote`);
      }
      
      // Fetch project if we have a project ID
      if (quote.projectId) {
        try {
          console.log(`[PDF Route] Fetching project with ID: ${quote.projectId}`);
          project = await storage.getProject(quote.projectId, tenantId);
          if (project) {
            console.log(`[PDF Route] Project found: ${project.name} (ID: ${project.id})`);
          } else {
            console.log(`[PDF Route] No project found with ID: ${quote.projectId}`);
          }
        } catch (err) {
          console.error(`[PDF Route] Error fetching project:`, err);
        }
      } else {
        console.log(`[PDF Route] No project ID on quote`);
      }
      
      // Create a properly structured combined object 
      const completeQuoteData = {
        ...quote,
        items: quoteItems,
        customer: customer, // Explicitly assign customer
        project: project    // Explicitly assign project
      };
      
      // Log the final data structure we're passing to the PDF generator
      console.log('[PDF Route] Final data for PDF generation:');
      console.log(`  - Quote number: ${completeQuoteData.quoteNumber}`);
      console.log(`  - Items count: ${completeQuoteData.items.length}`);
      console.log(`  - Has customer: ${completeQuoteData.customer !== null}`);
      console.log(`  - Has project: ${completeQuoteData.project !== null}`);
      
      // Generate PDF using the PDFService with all related data
      const pdfBuffer = await PDFService.generateQuotePDF(completeQuoteData);
      
      // Set appropriate headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Quote_${quote.quoteNumber}.pdf`);
      
      // Send the PDF buffer to the client
      console.log(`[PDF Route] PDF generated successfully, sending to client`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('[PDF Route] Error generating quote PDF:', error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  app.post("/api/quotes/:id/email", requireAuth, async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      const { recipientEmail, subject, message, includePdf = true } = req.body;
      
      console.log('Email request:', { quoteId, recipientEmail, subject, hasMessage: !!message, includePdf });
      
      if (!recipientEmail) {
        return res.status(400).json({ message: "Recipient email is required" });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      const quote = await storage.getQuote(quoteId, tenantId);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Check if user has access to this resource - using tenantId for proper tenant isolation
      if (req.isTenantResource && !req.isTenantResource(quote.tenantId)) {
        console.log(`[Email Quote] Access denied for user. Quote tenant ID: ${quote.tenantId}`);
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get quote items
      const quoteItems = await storage.getQuoteItemsByQuote(quoteId);
      console.log(`Retrieved ${quoteItems.length} items for quote ${quoteId}`);
      
      // Get customer and project information for the PDF
      let customer = null;
      let project = null;
      
      console.log(`[Email Route] Quote ID: ${quoteId}`);
      console.log(`[Email Route] Quote Customer ID: ${quote.customerId}`);
      console.log(`[Email Route] Quote Project ID: ${quote.projectId}`);
      
      if (quote.customerId) {
        customer = await storage.getCustomer(quote.customerId, tenantId);
        console.log(`[Email Route] Fetched Customer:`, customer ? { name: customer.name, id: customer.id } : null);
      }
      
      if (quote.projectId) {
        project = await storage.getProject(quote.projectId, tenantId);
        console.log(`[Email Route] Fetched Project:`, project ? { name: project.name, id: project.id } : null);
      }
      
      // Get verified sender email from environment or fall back to company settings
      const verifiedSenderEmail = process.env.SENDGRID_SENDER_EMAIL;
      const companySettings = await storage.getCompanySettings();
      const senderEmail = verifiedSenderEmail || companySettings?.email || 'noreply@example.com';
      console.log(`Sending email from ${senderEmail} to ${recipientEmail}`);
      
      // Check SendGrid API key
      if (!process.env.SENDGRID_API_KEY) {
        console.error('SendGrid API key not configured. Please set SENDGRID_API_KEY environment variable.');
        return res.status(500).json({ message: "Email service not properly configured" });
      }
      
      // Send email with PDF using EmailService
      const success = await EmailService.sendQuote(
        { 
          ...quote, 
          items: quoteItems,
          customer,
          project
        },
        recipientEmail,
        senderEmail,
        { subject, message, includePdf }
      );
      
      if (success) {
        res.json({ message: "Quote sent successfully via email" });
      } else {
        res.status(500).json({ message: "Failed to send quote via email" });
      }
    } catch (error) {
      console.error('Error emailing quote:', error);
      res.status(500).json({ message: "Failed to send quote via email" });
    }
  });

  // Convert quote to invoice
  app.post("/api/quotes/:id/convert-to-invoice", requireAuth, async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      // Log more information for debugging
      console.log(`Converting quote ID ${quoteId} to invoice. Tenant ID: ${tenantId}, User ID: ${req.user?.id}`);
      
      // Fetch quote with tenant context
      const quote = await storage.getQuote(quoteId, tenantId);
      
      if (!quote) {
        console.log(`Quote not found: ID ${quoteId}, Tenant ID ${tenantId}`);
        return res.status(404).json({ message: "Quote not found" });
      }
      
      console.log(`Found quote: ${JSON.stringify(quote, null, 2)}`);
      
      // Check if user has access to this resource - using tenantId instead of createdBy
      // to ensure proper tenant isolation
      if (req.isTenantResource && !req.isTenantResource(quote.tenantId)) {
        console.log(`Convert to Invoice - Access denied for user. Quote tenant ID: ${quote.tenantId}`);
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now().toString().substr(-6)}`;
      
      // Create invoice from quote
      const newInvoice = {
        invoiceNumber,
        projectId: quote.projectId || null,
        customerId: quote.customerId || null,
        quoteId: quote.id,
        type: "final", // Ensure the type field is set correctly
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: "issued",
        subtotal: quote.subtotal || 0,
        tax: quote.tax || 0,
        discount: quote.discount || 0,
        total: quote.total || 0,
        notes: quote.notes || "",
        terms: quote.terms || "",
        createdBy: req.user?.id,
        tenantId: tenantId // Add tenant ID to the invoice
      };
      
      console.log(`Creating invoice: ${JSON.stringify(newInvoice, null, 2)}`);
      
      const invoice = await storage.createInvoice(newInvoice);
      
      // Copy quote items to invoice items
      const quoteItems = await storage.getQuoteItemsByQuote(quoteId);
      console.log(`Found ${quoteItems.length} quote items to copy`);
      
      for (const item of quoteItems) {
        await storage.createInvoiceItem({
          invoiceId: invoice.id,
          description: item.description || "",
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || 0,
          total: item.total || 0,
          catalogItemId: item.catalogItemId || null
        });
      }
      
      // Update quote status
      await storage.updateQuote(quoteId, { status: "converted" }, tenantId);
      
      console.log(`Successfully converted quote ${quoteId} to invoice ${invoice.id}`);
      res.status(201).json(invoice);
    } catch (error) {
      console.error('Error converting quote to invoice:', error);
      res.status(500).json({ message: "Failed to convert quote to invoice", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Invoice routes
  app.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      const { status, customerId, projectId } = req.query;
      const tenantId = getTenantIdFromRequest(req);
      
      let invoices;
      if (status) {
        invoices = await storage.getInvoicesByStatus(status as string, tenantId);
      } else if (customerId) {
        invoices = await storage.getInvoicesByCustomer(Number(customerId), tenantId);
      } else if (projectId) {
        invoices = await storage.getInvoicesByProject(Number(projectId), tenantId);
      } else {
        const tenantId = getTenantIdFromRequest(req);
        invoices = await storage.getAllInvoices(tenantId);
      }
      
      res.json(invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoiceId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const invoice = await storage.getInvoice(invoiceId, tenantId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(invoice.tenantId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get invoice items
      const invoiceItems = await storage.getInvoiceItemsByInvoice(invoice.id);
      
      res.json({ ...invoice, items: invoiceItems });
    } catch (error) {
      console.error('Error fetching invoice:', error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", requireAuth, validateBody(insertInvoiceSchema), async (req, res) => {
    try {
      // Extract items from the request body if present
      const { items, ...invoiceData } = req.body;
      const tenantId = getTenantIdFromRequest(req);
      
      // Generate invoice number
      console.log("Creating invoice with body:", invoiceData);
      const invoiceNumber = `INV-${Date.now().toString().substr(-6)}`;
      
      // Create the invoice without items first
      const invoice = await storage.createInvoice({
        ...invoiceData,
        invoiceNumber,
        createdBy: req.user?.id,
        status: invoiceData.status || "draft",
        tenantId: tenantId // Add tenant ID to the invoice
      });
      
      console.log("Created invoice:", invoice);
      
      // Now add items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        console.log("Adding items to invoice:", items);
        
        for (const item of items) {
          await storage.createInvoiceItem({
            invoiceId: invoice.id,
            description: item.description || '',
            quantity: typeof item.quantity === 'number' ? item.quantity : 0,
            unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
            total: typeof item.total === 'number' ? item.total : 0,
            catalogItemId: item.catalogItemId || null
          });
        }
      }
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcast("invoice:created", {
          id: invoice.id,
          data: invoice,
          message: `New invoice created: ${invoice.invoiceNumber}`,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Failed to create invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.post("/api/invoices/:id/items", requireAuth, validateBody(insertInvoiceItemSchema), async (req, res) => {
    try {
      const invoiceId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const invoice = await storage.getInvoice(invoiceId, tenantId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(invoice.tenantId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const invoiceItem = await storage.createInvoiceItem({
        ...req.body,
        invoiceId
      });
      
      // Update invoice totals
      const invoiceItems = await storage.getInvoiceItemsByInvoice(invoiceId);
      const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
      const total = subtotal - (invoice.discount || 0) + (invoice.tax || 0);
      
      await storage.updateInvoice(invoiceId, { subtotal, total }, tenantId);
      
      res.status(201).json(invoiceItem);
    } catch (error) {
      console.error('Error adding invoice item:', error);
      res.status(500).json({ message: "Failed to add invoice item" });
    }
  });

  app.put("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoiceId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const invoice = await storage.getInvoice(invoiceId, tenantId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(invoice.tenantId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedInvoice = await storage.updateInvoice(invoiceId, req.body, tenantId);
      res.json(updatedInvoice);
    } catch (error) {
      console.error('Error updating invoice:', error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoiceId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const invoice = await storage.getInvoice(invoiceId, tenantId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(invoice.tenantId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Delete associated invoice items first
      const invoiceItems = await storage.getInvoiceItemsByInvoice(invoiceId);
      for (const item of invoiceItems) {
        await storage.deleteInvoiceItem(item.id);
      }
      
      const deleted = await storage.deleteInvoice(invoiceId, tenantId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete invoice" });
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // Generate invoice PDF
  app.get("/api/invoices/:id/pdf", requireAuth, async (req, res) => {
    try {
      const invoiceId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      console.log(`[PDF Route] Generating PDF for Invoice ID: ${invoiceId}`);
      console.log(`[PDF Route] Tenant ID: ${tenantId}`);
      
      // Fetch the invoice data with tenant context
      const invoice = await storage.getInvoice(invoiceId, tenantId);
      
      if (!invoice) {
        console.log(`[PDF Route] Invoice not found with ID: ${invoiceId}`);
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if user has access to this resource - using tenantId for proper tenant isolation
      if (req.isTenantResource && !req.isTenantResource(invoice.tenantId)) {
        console.log(`[PDF Route] Access denied for user to Invoice ID: ${invoiceId}`);
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get invoice items
      const invoiceItems = await storage.getInvoiceItemsByInvoice(invoiceId);
      console.log(`[PDF Route] Found ${invoiceItems.length} invoice items`);
      
      // Get customer and project information for the PDF
      let customer = null;
      let project = null;
      
      if (invoice.customerId) {
        customer = await storage.getCustomer(invoice.customerId, tenantId);
        console.log(`[PDF Route] Customer:`, customer ? { id: customer.id, name: customer.name } : 'Not found');
      }
      
      if (invoice.projectId) {
        project = await storage.getProject(invoice.projectId, tenantId);
        console.log(`[PDF Route] Project:`, project ? { id: project.id, name: project.name } : 'Not found');
      }
      
      const completeInvoiceData = {
        ...invoice,
        items: invoiceItems,
        customer,
        project
      };
      
      console.log('[PDF Route] Generating PDF with data:', {
        invoiceNumber: completeInvoiceData.invoiceNumber,
        items: invoiceItems.length,
        hasCustomer: !!customer,
        hasProject: !!project
      });
      
      // Generate PDF using the PDFService
      const pdfBuffer = await PDFService.generateInvoicePDF(completeInvoiceData);
      
      // Set appropriate headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Invoice_${invoice.invoiceNumber}.pdf`);
      
      // Send the PDF buffer to the client
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  app.post("/api/invoices/:id/email", requireAuth, async (req, res) => {
    try {
      const invoiceId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      const { recipientEmail, subject, message, includePdf = true } = req.body;
      
      console.log(`[Email Route] Starting email process for invoice ID: ${invoiceId}`);
      console.log(`[Email Route] Recipient: ${recipientEmail}`);
      
      if (!recipientEmail) {
        return res.status(400).json({ message: "Recipient email is required" });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      const invoice = await storage.getInvoice(invoiceId, tenantId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if user has access to this resource - using tenantId for proper tenant isolation
      if (req.isTenantResource && !req.isTenantResource(invoice.tenantId)) {
        console.log(`[Email Invoice] Access denied for user. Invoice tenant ID: ${invoice.tenantId}`);
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get invoice items
      const invoiceItems = await storage.getInvoiceItemsByInvoice(invoiceId);
      console.log(`Retrieved ${invoiceItems.length} items for invoice ${invoiceId}`);
      
      // Get customer data
      let customer = null;
      if (invoice.customerId) {
        customer = await storage.getCustomer(invoice.customerId, tenantId);
      }
      
      // Get project data
      let project = null;
      if (invoice.projectId) {
        project = await storage.getProject(invoice.projectId, tenantId);
      }
      
      // Get verified sender email from environment or fall back to company settings
      const verifiedSenderEmail = process.env.SENDGRID_SENDER_EMAIL;
      const companySettings = await storage.getCompanySettings();
      const senderEmail = verifiedSenderEmail || companySettings?.email || 'noreply@example.com';
      console.log(`Sending email from ${senderEmail} to ${recipientEmail}`);
      
      // Check SendGrid API key
      if (!process.env.SENDGRID_API_KEY) {
        console.error('SendGrid API key not configured. Please set SENDGRID_API_KEY environment variable.');
        return res.status(500).json({ message: "Email service not properly configured" });
      }
      
      // Send email with PDF using EmailService
      const success = await EmailService.sendInvoice(
        { 
          ...invoice, 
          items: invoiceItems,
          customer,
          project
        },
        recipientEmail,
        senderEmail,
        { subject, message, includePdf }
      );
      
      if (success) {
        // Update invoice status to "sent" if successful
        await storage.updateInvoice(invoiceId, { status: "sent" }, tenantId);
        
        res.json({ message: "Invoice sent successfully via email" });
      } else {
        res.status(500).json({ message: "Failed to send invoice via email" });
      }
    } catch (error) {
      console.error('Error emailing invoice:', error);
      res.status(500).json({ message: "Failed to send invoice via email" });
    }
  });

  // Survey routes
  app.get("/api/surveys", requireAuth, async (req, res) => {
    try {
      const { status, projectId } = req.query;
      const tenantId = getTenantIdFromRequest(req);
      
      let surveys;
      if (status) {
        surveys = await storage.getSurveysByStatus(status as string);
      } else if (projectId) {
        surveys = await storage.getSurveysByProject(Number(projectId));
      } else {
        surveys = await storage.getAllSurveys();
      }
      
      // Filter surveys by tenant ID for security
      surveys = surveys.filter(survey => survey.tenantId === tenantId);
      
      res.json(surveys);
    } catch (error) {
      console.error('Error fetching surveys:', error);
      res.status(500).json({ message: "Failed to fetch surveys" });
    }
  });

  app.post("/api/surveys", requireAuth, async (req, res) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      console.log("Creating survey with data:", req.body);
      
      const survey = await storage.createSurvey({
        ...req.body,
        tenantId: tenantId,
        createdBy: req.user?.id
      });
      
      res.status(201).json(survey);
    } catch (error) {
      console.error('Error creating survey:', error);
      res.status(500).json({ message: "Failed to create survey" });
    }
  });

  app.get("/api/surveys/:id", requireAuth, async (req, res) => {
    try {
      const surveyId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const survey = await storage.getSurvey(surveyId);
      
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      // Security check - ensure survey belongs to the tenant
      if (survey.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(survey);
    } catch (error) {
      console.error('Error fetching survey:', error);
      res.status(500).json({ message: "Failed to fetch survey" });
    }
  });

  app.put("/api/surveys/:id", requireAuth, async (req, res) => {
    try {
      const surveyId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const survey = await storage.getSurvey(surveyId);
      
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      // Security check - ensure survey belongs to the tenant
      if (survey.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedSurvey = await storage.updateSurvey(surveyId, req.body);
      res.json(updatedSurvey);
    } catch (error) {
      console.error('Error updating survey:', error);
      res.status(500).json({ message: "Failed to update survey" });
    }
  });

  app.delete("/api/surveys/:id", requireAuth, async (req, res) => {
    try {
      const surveyId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const survey = await storage.getSurvey(surveyId);
      
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      // Security check - ensure survey belongs to the tenant
      if (survey.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const deleted = await storage.deleteSurvey(surveyId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete survey" });
      }
    } catch (error) {
      console.error('Error deleting survey:', error);
      res.status(500).json({ message: "Failed to delete survey" });
    }
  });

  // Installation routes
  app.get("/api/installations", requireAuth, async (req, res) => {
    try {
      const { status, projectId } = req.query;
      const tenantId = getTenantIdFromRequest(req);
      
      let installations;
      if (status) {
        installations = await storage.getInstallationsByStatus(status as string);
      } else if (projectId) {
        installations = await storage.getInstallationsByProject(Number(projectId));
      } else {
        installations = await storage.getAllInstallations();
      }
      
      // Filter installations by tenant ID for security
      installations = installations.filter(installation => installation.tenantId === tenantId);
      
      res.json(installations);
    } catch (error) {
      console.error('Error fetching installations:', error);
      res.status(500).json({ message: "Failed to fetch installations" });
    }
  });

  app.post("/api/installations", requireAuth, async (req, res) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      console.log("Creating installation with data:", req.body);
      
      const installation = await storage.createInstallation({
        ...req.body,
        tenantId: tenantId,
        createdBy: req.user?.id
      });
      
      res.status(201).json(installation);
    } catch (error) {
      console.error('Error creating installation:', error);
      res.status(500).json({ message: "Failed to create installation" });
    }
  });

  app.get("/api/installations/:id", requireAuth, async (req, res) => {
    try {
      const installationId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const installation = await storage.getInstallation(installationId);
      
      if (!installation) {
        return res.status(404).json({ message: "Installation not found" });
      }
      
      // Security check - ensure installation belongs to the tenant
      if (installation.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(installation);
    } catch (error) {
      console.error('Error fetching installation:', error);
      res.status(500).json({ message: "Failed to fetch installation" });
    }
  });

  app.put("/api/installations/:id", requireAuth, async (req, res) => {
    try {
      const installationId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const installation = await storage.getInstallation(installationId);
      
      if (!installation) {
        return res.status(404).json({ message: "Installation not found" });
      }
      
      // Security check - ensure installation belongs to the tenant
      if (installation.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedInstallation = await storage.updateInstallation(installationId, req.body);
      res.json(updatedInstallation);
    } catch (error) {
      console.error('Error updating installation:', error);
      res.status(500).json({ message: "Failed to update installation" });
    }
  });

  app.delete("/api/installations/:id", requireAuth, async (req, res) => {
    try {
      const installationId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const installation = await storage.getInstallation(installationId);
      
      if (!installation) {
        return res.status(404).json({ message: "Installation not found" });
      }
      
      // Security check - ensure installation belongs to the tenant
      if (installation.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const deleted = await storage.deleteInstallation(installationId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete installation" });
      }
    } catch (error) {
      console.error('Error deleting installation:', error);
      res.status(500).json({ message: "Failed to delete installation" });
    }
  });

  // Register additional API routes here

  // We'll create a server in index.ts
  console.log('API routes registered successfully');
  
  // Create and return an HTTP server instance but don't start listening
  return createServer(app);
}