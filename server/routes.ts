import { Express, Request, Response, NextFunction } from "express";
import { Server, createServer } from "http";
import { z } from "zod";
import { eq } from "drizzle-orm";
// Remove StreamBuffers import as it's causing issues
import PDFDocument from "pdfkit";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import multer from "multer";
import sharp from "sharp";
import { createInsertSchema } from "drizzle-zod";
import { uploadFile, deleteFromS3 } from "./services/s3-service";
import { 
  insertCustomerSchema, 
  insertQuoteSchema,
  insertQuoteItemSchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
  insertProjectSchema,
  insertCatalogItemSchema,
  insertCompanySettingsSchema,
  insertTenantSchema,
  insertEmployeeSchema
} from "../shared/schema";
import { storage } from "./storage";
import { getWebSocketManager } from "./websocket";
import EmailService from "./services/email-service";
import PDFService from "./services/pdf-service";

import FileService from "./services/file-service";
import SecurityService from "./services/security-service";
// Removed Puppeteer PDF service - now using PDFKit service
import { 
  getNumberedDocument, 
  countInvoicesForTenant,
  countQuotesForTenant
} from "./utils/document-numbering";
import { registerQuoteRoutes } from "./routes/quotes";
import { registerDelegatedAdminRoutes } from "./routes/delegated-admin";

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

// Import the routes configuration from our modular route files
import configureModularRoutes from './routes/index';

// PDF Generation function temporarily removed to fix compilation issues

export async function registerRoutes(app: Express): Promise<Server> {
  // Register modular route handlers
  registerQuoteRoutes(app);
  
  // Register delegated admin routes
  registerDelegatedAdminRoutes(app);
  
  // Register our new survey and installation routes
  configureModularRoutes(app);
  
  // Set up middleware for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    },
  });

  // Legacy file upload setup for other file types
  const fileUpload = multer({
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

  // Company settings endpoints
  app.get("/api/settings/company", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getCompanySettings();
      res.json(settings || null);
    } catch (error) {
      console.error('Error fetching company settings:', error);
      res.status(500).json({ message: "Failed to fetch company settings" });
    }
  });

  app.patch("/api/settings/company", requireAuth, async (req: Request, res: Response) => {
    try {
      const existingSettings = await storage.getCompanySettings();
      
      // Filter out fields that shouldn't be updated by client
      const { id, updatedAt, updatedBy, ...updateData } = req.body;
      
      let updatedSettings;
      if (existingSettings) {
        updatedSettings = await storage.updateCompanySettings(existingSettings.id, updateData);
      } else {
        updatedSettings = await storage.createCompanySettings(updateData);
      }
      
      if (!updatedSettings) {
        return res.status(404).json({ message: "Failed to update company settings" });
      }
      
      res.json(updatedSettings);
    } catch (error) {
      console.error('Error updating company settings:', error);
      res.status(500).json({ message: "Failed to update company settings" });
    }
  });

  app.post("/api/settings/company", requireAuth, async (req: Request, res: Response) => {
    try {
      const newSettings = await storage.createCompanySettings(req.body);
      res.json(newSettings);
    } catch (error) {
      console.error('Error creating company settings:', error);
      res.status(500).json({ message: "Failed to create company settings" });
    }
  });

  // Logo upload endpoint
  app.post("/api/settings/logo", requireAuth, upload.single('logo'), 
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No file provided' });
        }

        // Validate file type
        if (!req.file.mimetype.startsWith('image/')) {
          return res.status(415).json({ 
            error: 'Unsupported file type. Only images are allowed.' 
          });
        }

        // Process image with Sharp - resize to max 400x100
        const processedBuffer = await sharp(req.file.buffer)
          .resize({ width: 400, height: 100, fit: 'contain' })
          .png()
          .toBuffer();

        // Upload to S3 or local storage
        const logoUrl = await uploadFile(
          processedBuffer, 
          req.file.originalname, 
          'image/png'
        );

        // Update company settings with new logo URL
        const existingSettings = await storage.getCompanySettings();
        let updatedSettings;

        if (existingSettings) {
          // Delete old logo if it exists
          if (existingSettings.companyLogo) {
            await deleteFromS3(existingSettings.companyLogo);
          }
          
          updatedSettings = await storage.updateCompanySettings(
            existingSettings.id, 
            { companyLogo: logoUrl }
          );
        } else {
          updatedSettings = await storage.createCompanySettings({ 
            companyName: "Company Name",
            companyLogo: logoUrl 
          });
        }

        res.json({ logoUrl, settings: updatedSettings });
      } catch (error) {
        console.error('Logo upload error:', error);
        res.status(500).json({ 
          error: 'Failed to upload logo' 
        });
      }
    }
  );

  // Logo deletion endpoint
  app.delete("/api/settings/logo", requireAuth, async (req: Request, res: Response) => {
    try {
      const existingSettings = await storage.getCompanySettings();
      
      if (!existingSettings || !existingSettings.companyLogo) {
        return res.status(404).json({ error: 'No logo found to delete' });
      }

      // Delete logo file from storage
      await deleteFromS3(existingSettings.companyLogo);

      // Update company settings to remove logo URL
      const updatedSettings = await storage.updateCompanySettings(
        existingSettings.id, 
        { companyLogo: null }
      );

      res.json({ message: 'Logo deleted successfully', settings: updatedSettings });
    } catch (error) {
      console.error('Logo deletion error:', error);
      res.status(500).json({ 
        error: 'Failed to delete logo' 
      });
    }
  });

  // System settings endpoints
  app.get("/api/settings/system", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings || null);
    } catch (error) {
      console.error('Error fetching system settings:', error);
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });

  app.patch("/api/settings/system", requireAuth, async (req: Request, res: Response) => {
    try {
      const existingSettings = await storage.getSystemSettings();
      
      let updatedSettings;
      if (existingSettings) {
        updatedSettings = await storage.updateSystemSettings(existingSettings.id, req.body);
      } else {
        updatedSettings = await storage.createSystemSettings(req.body);
      }
      
      if (!updatedSettings) {
        return res.status(404).json({ message: "Failed to update system settings" });
      }
      
      res.json(updatedSettings);
    } catch (error) {
      console.error('Error updating system settings:', error);
      res.status(500).json({ message: "Failed to update system settings" });
    }
  });

  app.post("/api/settings/system", requireAuth, async (req: Request, res: Response) => {
    try {
      const newSettings = await storage.createSystemSettings(req.body);
      res.json(newSettings);
    } catch (error) {
      console.error('Error creating system settings:', error);
      res.status(500).json({ message: "Failed to create system settings" });
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
      // Extract items and percentage-based values from the request body
      const { items, taxPercent, discountPercent, ...quoteData } = req.body;
      const tenantId = getTenantIdFromRequest(req);
      
      // Calculate subtotal and totals
      let subtotal = 0;
      let processedItems = [];
      
      if (items && Array.isArray(items) && items.length > 0) {
        // Calculate item totals and overall subtotal
        processedItems = items.map(item => {
          const quantity = item.quantity || 0;
          const unitPrice = item.unitPrice || 0;
          const itemTotal = quantity * unitPrice;
          subtotal += itemTotal;
          
          return {
            ...item,
            total: itemTotal,
            quoteId: null // Will be set after quote is created
          };
        });
      }
      
      // Calculate tax and discount amounts based on percentages if provided
      const taxAmount = taxPercent ? (subtotal * (taxPercent / 100)) : (quoteData.tax || 0);
      const discountAmount = discountPercent ? (subtotal * (discountPercent / 100)) : (quoteData.discount || 0);
      const total = subtotal + taxAmount - discountAmount;
      
      // Generate unique quote number with retry
      let quoteNumber;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          // Add timestamp to make number more unique
          quoteNumber = await getNumberedDocument(`QUO-${new Date().getTime().toString().slice(-4)}`, tenantId);
          break; // If successful, exit the loop
        } catch (err) {
          console.log(`Retry ${retryCount + 1} for quote number generation`);
          retryCount++;
          if (retryCount >= maxRetries) {
            throw new Error("Failed to generate a unique quote number after multiple attempts");
          }
          // Wait a small amount of time before retrying
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Create the quote with calculated values
      const quote = await storage.createQuote({
        ...quoteData,
        quoteNumber,
        subtotal,
        tax: taxAmount,
        discount: discountAmount,
        total,
        createdBy: req.user?.id,
        status: quoteData.status || "draft",
        tenantId // Add tenant ID to the quote
      });
      
      // Now add items with the proper quoteId reference
      const createdItems = [];
      if (processedItems.length > 0) {
        for (const item of processedItems) {
          const createdItem = await storage.createQuoteItem({
            ...item,
            quoteId: quote.id
          });
          createdItems.push(createdItem);
        }
      }
      
      // Return the quote with its items
      const quoteWithItems = {
        ...quote,
        items: createdItems
      };
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcast("quote:created", {
          id: quote.id,
          data: quoteWithItems,
          message: `New quote created: ${quoteNumber}`,
          timestamp: new Date().toISOString(),
          tenantId // Include tenant ID in the notification
        }, tenantId); // Pass tenant ID to limit broadcast scope
      }
      
      res.status(201).json(quoteWithItems);
    } catch (error) {
      console.error("Failed to create quote:", error);
      res.status(500).json({ 
        message: "Failed to create quote",
        error: error instanceof Error ? error.message : "Unknown error"
      });
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

  // Calendar API - unified view of surveys and installations
  app.get("/api/calendar", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      const { start, end } = req.query;

      // Refresh materialized view to get latest data
      await storage.execQuery(`REFRESH MATERIALIZED VIEW calendar_events`, []);

      let query = `
        SELECT 
          id,
          type,
          tenant_id,
          project_id,
          event_date,
          status
        FROM calendar_events
        WHERE tenant_id = $1
      `;
      
      const params = [tenantId];

      // Add date range filtering if provided
      if (start && end) {
        query += ` AND event_date BETWEEN $2 AND $3`;
        params.push(start as string, end as string);
      }

      query += ` ORDER BY event_date ASC`;

      const events = await storage.execQuery(query, params);
      res.json(events);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  // Employee routes
  app.get("/api/employees", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantFilter = getTenantFilterFromRequest(req);
      const employees = await storage.getAllEmployees(tenantFilter);
      res.json(employees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.post("/api/employees", requireAuth, validateBody(insertEmployeeSchema), async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      const employeeData = {
        ...req.body,
        tenantId,
        createdBy: req.user?.id
      };
      
      const employee = await storage.createEmployee(employeeData);
      res.status(201).json(employee);
    } catch (error) {
      console.error('Error creating employee:', error);
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  app.get("/api/employees/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const employee = await storage.getEmployee(employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // Check tenant access
      if (tenantId !== undefined && employee.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(employee);
    } catch (error) {
      console.error('Error fetching employee:', error);
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  app.put("/api/employees/:id", requireAuth, validateBody(insertEmployeeSchema), async (req: Request, res: Response) => {
    try {
      const employeeId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const employee = await storage.getEmployee(employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // Check tenant access
      if (tenantId !== undefined && employee.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedEmployee = await storage.updateEmployee(employeeId, req.body, tenantId);
      res.json(updatedEmployee);
    } catch (error) {
      console.error('Error updating employee:', error);
      res.status(500).json({ message: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const employee = await storage.getEmployee(employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // Check tenant access
      if (tenantId !== undefined && employee.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const deleted = await storage.deleteEmployee(employeeId, tenantId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete employee" });
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Inventory routes
  app.get("/api/inventory", requireAuth, async (req, res) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }
      
      const inventoryItems = await storage.getAllInventoryItems({ tenantId });
      res.json(inventoryItems);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.post("/api/inventory", requireAuth, async (req, res) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }
      
      const inventoryData = {
        ...req.body,
        tenantId,
        createdBy: req.user?.id
      };
      
      const newItem = await storage.createInventoryItem(inventoryData);
      res.status(201).json(newItem);
    } catch (error) {
      console.error('Error creating inventory item:', error);
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  app.get("/api/inventory/:id", requireAuth, async (req, res) => {
    try {
      const itemId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const item = await storage.getInventoryItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      // Check tenant access
      if (tenantId !== undefined && item.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(item);
    } catch (error) {
      console.error('Error fetching inventory item:', error);
      res.status(500).json({ message: "Failed to fetch inventory item" });
    }
  });

  app.put("/api/inventory/:id", requireAuth, async (req, res) => {
    try {
      const itemId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }
      
      const item = await storage.getInventoryItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      // Check tenant access
      if (item.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedItem = await storage.updateInventoryItem(itemId, req.body, tenantId);
      res.json(updatedItem);
    } catch (error) {
      console.error('Error updating inventory item:', error);
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  app.delete("/api/inventory/:id", requireAuth, async (req, res) => {
    try {
      const itemId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const item = await storage.getInventoryItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      // Check tenant access
      if (tenantId !== undefined && item.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const deleted = await storage.deleteInventoryItem(itemId, tenantId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete inventory item" });
      }
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  // Timesheet routes
  app.get("/api/timesheets", requireAuth, async (req, res) => {
    try {
      const { employeeId, status, date } = req.query;
      const tenantId = getTenantIdFromRequest(req);
      
      let timesheets;
      if (employeeId) {
        timesheets = await storage.getTimesheetsByEmployee(Number(employeeId), tenantId);
      } else {
        timesheets = await storage.getAllTimesheets(tenantId ? { tenantId } : undefined);
      }
      
      // Additional filtering by status or date if provided
      if (status && typeof status === 'string') {
        timesheets = timesheets.filter(t => t.status === status);
      }
      if (date && typeof date === 'string') {
        timesheets = timesheets.filter(t => t.date === date);
      }
      
      res.json(timesheets);
    } catch (error) {
      console.error('Error fetching timesheets:', error);
      res.status(500).json({ message: "Failed to fetch timesheets" });
    }
  });

  app.post("/api/timesheets", requireAuth, async (req, res) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }
      
      // Add tenant ID to the timesheet data
      const timesheetData = {
        ...req.body,
        tenantId
      };
      
      console.log('Creating timesheet with data:', timesheetData);
      
      const newTimesheet = await storage.createTimesheet(timesheetData);
      res.status(201).json(newTimesheet);
    } catch (error) {
      console.error('Error creating timesheet:', error);
      res.status(500).json({ message: "Failed to create timesheet" });
    }
  });

  app.get("/api/timesheets/:id", requireAuth, async (req, res) => {
    try {
      const timesheetId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const timesheet = await storage.getTimesheet(timesheetId);
      
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      
      // Security check - ensure timesheet belongs to the tenant
      if (timesheet.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(timesheet);
    } catch (error) {
      console.error('Error fetching timesheet:', error);
      res.status(500).json({ message: "Failed to fetch timesheet" });
    }
  });

  app.put("/api/timesheets/:id", requireAuth, async (req, res) => {
    try {
      const timesheetId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const timesheet = await storage.getTimesheet(timesheetId);
      
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      
      // Security check - ensure timesheet belongs to the tenant
      if (timesheet.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedTimesheet = await storage.updateTimesheet(timesheetId, req.body, tenantId);
      res.json(updatedTimesheet);
    } catch (error) {
      console.error('Error updating timesheet:', error);
      res.status(500).json({ message: "Failed to update timesheet" });
    }
  });

  app.delete("/api/timesheets/:id", requireAuth, async (req, res) => {
    try {
      const timesheetId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const timesheet = await storage.getTimesheet(timesheetId);
      
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      
      // Security check - ensure timesheet belongs to the tenant
      if (timesheet.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const deleted = await storage.deleteTimesheet(timesheetId, tenantId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete timesheet" });
      }
    } catch (error) {
      console.error('Error deleting timesheet:', error);
      res.status(500).json({ message: "Failed to delete timesheet" });
    }
  });

  app.put("/api/timesheets/:id", requireAuth, async (req, res) => {
    try {
      const timesheetId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const timesheet = await storage.getTimesheet(timesheetId);
      
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      
      // Security check - ensure timesheet belongs to the tenant
      if (timesheet.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedTimesheet = await storage.updateTimesheet(timesheetId, req.body, tenantId);
      res.json(updatedTimesheet);
    } catch (error) {
      console.error('Error updating timesheet:', error);
      res.status(500).json({ message: "Failed to update timesheet" });
    }
  });

  app.post("/api/timesheets/:id/approve", requireAuth, async (req, res) => {
    try {
      const timesheetId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(400).json({ message: "User context required" });
      }
      
      const timesheet = await storage.getTimesheet(timesheetId);
      
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      
      // Security check - ensure timesheet belongs to the tenant
      if (timesheet.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const approvedTimesheet = await storage.updateTimesheet(timesheetId, {
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date().toISOString()
      }, tenantId);
      
      res.json(approvedTimesheet);
    } catch (error) {
      console.error('Error approving timesheet:', error);
      res.status(500).json({ message: "Failed to approve timesheet" });
    }
  });

  // Catalog Items routes
  app.get("/api/catalog-items", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      console.log('>>> HIT catalog-items route, tenant:', tenantId);
      
      const catalogItems = await storage.getAllCatalogItems(tenantId);
      res.json(catalogItems);
    } catch (error) {
      console.error('Error fetching catalog items:', error);
      res.status(500).json({ message: "Failed to fetch catalog items" });
    }
  });

  app.post("/api/catalog-items", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }

      const catalogItemData = {
        ...req.body,
        tenantId,
        createdBy: req.user?.id
      };

      const newCatalogItem = await storage.createCatalogItem(catalogItemData);
      res.status(201).json(newCatalogItem);
    } catch (error) {
      console.error('Error creating catalog item:', error);
      res.status(500).json({ message: "Failed to create catalog item" });
    }
  });

  app.get("/api/catalog-items/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const catalogItemId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const catalogItem = await storage.getCatalogItem(catalogItemId);
      
      if (!catalogItem) {
        return res.status(404).json({ message: "Catalog item not found" });
      }
      
      // Security check - ensure catalog item belongs to the tenant
      if (catalogItem.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(catalogItem);
    } catch (error) {
      console.error('Error fetching catalog item:', error);
      res.status(500).json({ message: "Failed to fetch catalog item" });
    }
  });

  app.put("/api/catalog-items/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const catalogItemId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const catalogItem = await storage.getCatalogItem(catalogItemId);
      
      if (!catalogItem) {
        return res.status(404).json({ message: "Catalog item not found" });
      }
      
      // Security check - ensure catalog item belongs to the tenant
      if (catalogItem.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedCatalogItem = await storage.updateCatalogItem(catalogItemId, req.body);
      res.json(updatedCatalogItem);
    } catch (error) {
      console.error('Error updating catalog item:', error);
      res.status(500).json({ message: "Failed to update catalog item" });
    }
  });

  app.delete("/api/catalog-items/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const catalogItemId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const catalogItem = await storage.getCatalogItem(catalogItemId);
      
      if (!catalogItem) {
        return res.status(404).json({ message: "Catalog item not found" });
      }
      
      // Security check - ensure catalog item belongs to the tenant
      if (catalogItem.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteCatalogItem(catalogItemId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting catalog item:', error);
      res.status(500).json({ message: "Failed to delete catalog item" });
    }
  });

  // Suppliers routes
  app.get("/api/suppliers", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      console.log('>>> HIT suppliers route, tenant:', tenantId);
      
      const suppliers = await storage.getAllSuppliers(tenantId);
      res.json(suppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.post("/api/suppliers", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      console.log('>>> HIT suppliers POST route, body:', req.body);
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }

      const supplierData = {
        ...req.body,
        tenantId,
        createdBy: req.user?.id
      };

      const newSupplier = await storage.createSupplier(supplierData);
      res.status(201).json(newSupplier);
    } catch (error) {
      console.error('Error creating supplier:', error);
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  app.get("/api/suppliers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const supplierId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const supplier = await storage.getSupplier(supplierId);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      // Security check - ensure supplier belongs to the tenant
      if (supplier.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(supplier);
    } catch (error) {
      console.error('Error fetching supplier:', error);
      res.status(500).json({ message: "Failed to fetch supplier" });
    }
  });

  app.put("/api/suppliers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const supplierId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const supplier = await storage.getSupplier(supplierId);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      // Security check - ensure supplier belongs to the tenant
      if (supplier.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedSupplier = await storage.updateSupplier(supplierId, req.body);
      res.json(updatedSupplier);
    } catch (error) {
      console.error('Error updating supplier:', error);
      res.status(500).json({ message: "Failed to update supplier" });
    }
  });

  app.delete("/api/suppliers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const supplierId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const supplier = await storage.getSupplier(supplierId);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      // Security check - ensure supplier belongs to the tenant
      if (supplier.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteSupplier(supplierId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });

  // Reports API endpoints
  app.get("/api/reports/hours-by-employee", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      const { start, end } = req.query;
      
      if (!start || !end) {
        return res.status(400).json({ message: "Start and end dates are required" });
      }

      const hoursData = await storage.execQuery(`
        SELECT 
          e.full_name as employee,
          COALESCE(SUM(CAST(t.hours AS NUMERIC)), 0) as hours
        FROM employees e
        LEFT JOIN timesheets t ON e.id = t.employee_id 
          AND t.date BETWEEN $2 AND $3
          AND t.tenant_id = $1
        WHERE e.tenant_id = $1
        GROUP BY e.id, e.full_name
        ORDER BY hours DESC
      `, [tenantId, start, end]);

      res.json(hoursData);
    } catch (error) {
      console.error('Error fetching hours by employee:', error);
      res.status(500).json({ message: "Failed to fetch hours data" });
    }
  });

  app.get("/api/reports/projects-per-employee", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      const { status = 'active' } = req.query;

      const projectData = await storage.execQuery(`
        SELECT 
          e.full_name as employee,
          COUNT(p.id) as projects
        FROM employees e
        LEFT JOIN projects p ON e.id = p.created_by 
          AND p.status = $2
          AND p.tenant_id = $1
        WHERE e.tenant_id = $1
        GROUP BY e.id, e.full_name
        ORDER BY projects DESC
      `, [tenantId, status]);

      res.json(projectData);
    } catch (error) {
      console.error('Error fetching projects per employee:', error);
      res.status(500).json({ message: "Failed to fetch projects data" });
    }
  });

  app.get("/api/reports/sales", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      const { year = new Date().getFullYear() } = req.query;

      const salesData = await storage.execQuery(`
        SELECT 
          DATE_TRUNC('month', i.issue_date) as month,
          SUM(i.total) as total
        FROM invoices i
        WHERE i.tenant_id = $1 
          AND EXTRACT(YEAR FROM i.issue_date) = $2
          AND i.status = 'paid'
        GROUP BY DATE_TRUNC('month', i.issue_date)
        ORDER BY month
      `, [tenantId, year]);

      // Format the response for frontend consumption
      const formattedData = salesData.map(row => ({
        month: new Date(row.month).toLocaleDateString('en-US', { month: 'short' }),
        total: parseFloat(row.total) || 0
      }));

      res.json(formattedData);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      res.status(500).json({ message: "Failed to fetch sales data" });
    }
  });

  app.get("/api/reports/schedule-load", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      const { start, end } = req.query;
      
      if (!start || !end) {
        return res.status(400).json({ message: "Start and end dates are required" });
      }

      const scheduleData = await storage.execQuery(`
        SELECT 
          date_scheduled as date,
          SUM(CASE WHEN type = 'installation' THEN 1 ELSE 0 END) as installations,
          SUM(CASE WHEN type = 'survey' THEN 1 ELSE 0 END) as surveys
        FROM (
          SELECT scheduled_date as date_scheduled, 'installation' as type 
          FROM installations 
          WHERE tenant_id = $1 AND scheduled_date BETWEEN $2 AND $3
          UNION ALL
          SELECT scheduled_date as date_scheduled, 'survey' as type 
          FROM surveys 
          WHERE tenant_id = $1 AND scheduled_date BETWEEN $2 AND $3
        ) combined
        GROUP BY date_scheduled
        ORDER BY date_scheduled
      `, [tenantId, start, end]);

      // Format dates for frontend
      const formattedData = scheduleData.map(row => ({
        date: new Date(row.date).toISOString().split('T')[0],
        installations: parseInt(row.installations) || 0,
        surveys: parseInt(row.surveys) || 0
      }));

      res.json(formattedData);
    } catch (error) {
      console.error('Error fetching schedule load:', error);
      res.status(500).json({ message: "Failed to fetch schedule data" });
    }
  });

  app.get("/api/reports/employee-performance", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      
      const performanceData = await storage.execQuery(`
        SELECT 
          e.full_name as employee,
          COUNT(DISTINCT p.id) as projects_managed,
          COALESCE(SUM(CAST(t.hours AS NUMERIC)), 0) as total_hours,
          COUNT(DISTINCT t.id) as timesheet_entries
        FROM employees e
        LEFT JOIN projects p ON e.id = p.created_by AND p.tenant_id = $1
        LEFT JOIN timesheets t ON e.id = t.employee_id AND t.tenant_id = $1
        WHERE e.tenant_id = $1
        GROUP BY e.id, e.full_name
        ORDER BY total_hours DESC
      `, [tenantId]);

      res.json(performanceData);
    } catch (error) {
      console.error('Error fetching employee performance:', error);
      res.status(500).json({ message: "Failed to fetch performance data" });
    }
  });

  app.get("/api/reports/project-budgets", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      
      const budgetData = await storage.execQuery(`
        SELECT 
          p.name,
          COALESCE(p.budget, 0) as budget
        FROM projects p
        WHERE p.tenant_id = $1 
          AND p.budget IS NOT NULL 
          AND p.budget > 0
        ORDER BY p.budget DESC
        LIMIT 10
      `, [tenantId]);

      res.json(budgetData);
    } catch (error) {
      console.error('Error fetching project budgets:', error);
      res.status(500).json({ message: "Failed to fetch project budgets" });
    }
  });

  app.get("/api/reports/timesheet-approval", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      
      const approvalData = await storage.execQuery(`
        SELECT 
          t.status as name,
          COUNT(*) as value
        FROM timesheets t
        WHERE t.tenant_id = $1
        GROUP BY t.status
        ORDER BY value DESC
      `, [tenantId]);

      res.json(approvalData);
    } catch (error) {
      console.error('Error fetching timesheet approval status:', error);
      res.status(500).json({ message: "Failed to fetch timesheet approval data" });
    }
  });

  // Purchase Orders routes
  app.get("/api/purchase-orders", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      console.log('>>> HIT purchase-orders route, tenant:', tenantId);
      
      const purchaseOrders = await storage.getAllPurchaseOrders({ tenantId });
      res.json(purchaseOrders);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.post("/api/purchase-orders", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      console.log('>>> HIT purchase-orders POST route, body:', req.body);
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }

      const { supplierName, items, orderDate, taxRate, ...orderData } = req.body;

      // Find or create supplier by name
      let supplier = await storage.getSupplierByName(supplierName, tenantId);
      if (!supplier) {
        supplier = await storage.createSupplier({
          name: supplierName,
          tenantId
        });
      }

      // Calculate totals using the provided tax rate
      let subtotal = 0;
      
      if (items && items.length > 0) {
        for (const item of items) {
          subtotal += item.quantity * item.unitPrice;
        }
      }

      // Use the tax rate from the request (already converted from percentage to decimal)
      const appliedTaxRate = taxRate || 0.1; // Default to 10% if not provided
      const tax = subtotal * appliedTaxRate;
      const total = subtotal + tax;

      const purchaseOrderData = {
        ...orderData,
        supplierId: supplier.id,
        issueDate: orderDate, // Map orderDate to issueDate
        subtotal,
        tax,
        total,
        tenantId,
        createdBy: req.user?.id
      };

      const newPurchaseOrder = await storage.createPurchaseOrder(purchaseOrderData);
      
      // Create line items separately if they exist
      if (items && items.length > 0) {
        for (const item of items) {
          await storage.createPurchaseOrderItem({
            purchaseOrderId: newPurchaseOrder.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice
          });
        }
      }

      res.status(201).json(newPurchaseOrder);
    } catch (error) {
      console.error('Error creating purchase order:', error);
      res.status(500).json({ message: "Failed to create purchase order" });
    }
  });

  app.get("/api/purchase-orders/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const purchaseOrderId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const purchaseOrder = await storage.getPurchaseOrder(purchaseOrderId, { tenantId });
      
      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      // Security check - ensure purchase order belongs to the tenant
      if (purchaseOrder.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(purchaseOrder);
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      res.status(500).json({ message: "Failed to fetch purchase order" });
    }
  });

  app.put("/api/purchase-orders/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const purchaseOrderId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const purchaseOrder = await storage.getPurchaseOrder(purchaseOrderId, { tenantId });
      
      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      // Security check - ensure purchase order belongs to the tenant
      if (purchaseOrder.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedPurchaseOrder = await storage.updatePurchaseOrder(purchaseOrderId, req.body);
      res.json(updatedPurchaseOrder);
    } catch (error) {
      console.error('Error updating purchase order:', error);
      res.status(500).json({ message: "Failed to update purchase order" });
    }
  });

  // PATCH endpoint for status updates
  app.patch("/api/purchase-orders/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const purchaseOrderId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }
      
      const purchaseOrder = await storage.getPurchaseOrder(purchaseOrderId, { tenantId });
      
      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      // Security check - ensure purchase order belongs to the tenant
      if (purchaseOrder.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Only allow status updates via PATCH
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const updatedPurchaseOrder = await storage.updatePurchaseOrder(purchaseOrderId, { status });
      res.json(updatedPurchaseOrder);
    } catch (error) {
      console.error('Error updating purchase order status:', error);
      res.status(500).json({ message: "Failed to update purchase order status" });
    }
  });

  app.delete("/api/purchase-orders/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const purchaseOrderId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const purchaseOrder = await storage.getPurchaseOrder(purchaseOrderId, { tenantId });
      
      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      // Security check - ensure purchase order belongs to the tenant
      if (purchaseOrder.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deletePurchaseOrder(purchaseOrderId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      res.status(500).json({ message: "Failed to delete purchase order" });
    }
  });



  // Expenses routes
  app.get("/api/expenses", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      console.log('>>> HIT expenses route, tenant:', tenantId);
      
      const expenses = await storage.getAllExpenses(tenantId);
      res.json(expenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      console.log('>>> HIT expenses POST route, body:', req.body);
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }

      const expenseData = {
        ...req.body,
        tenantId,
        createdBy: req.user?.id
      };

      const newExpense = await storage.createExpense(expenseData);
      res.status(201).json(newExpense);
    } catch (error) {
      console.error('Error creating expense:', error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.get("/api/expenses/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const expenseId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const expense = await storage.getExpense(expenseId);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      // Security check - ensure expense belongs to the tenant
      if (expense.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(expense);
    } catch (error) {
      console.error('Error fetching expense:', error);
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  app.put("/api/expenses/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const expenseId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const expense = await storage.getExpense(expenseId);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      // Security check - ensure expense belongs to the tenant
      if (expense.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedExpense = await storage.updateExpense(expenseId, req.body);
      res.json(updatedExpense);
    } catch (error) {
      console.error('Error updating expense:', error);
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const expenseId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      const expense = await storage.getExpense(expenseId);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      // Security check - ensure expense belongs to the tenant
      if (expense.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteExpense(expenseId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting expense:', error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Inventory Transaction routes
  app.get("/api/inventory-transactions", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      const { inventoryItemId, type, startDate, endDate } = req.query;
      
      console.log('>>> HIT inventory-transactions route, tenant:', tenantId, 'filters:', { inventoryItemId, type, startDate, endDate });
      
      if (inventoryItemId) {
        const transactions = await storage.getInventoryTransactionsByItem(Number(inventoryItemId), { tenantId });
        res.json(transactions);
      } else {
        // Return empty array if no specific item requested
        res.json([]);
      }
    } catch (error) {
      console.error('Error fetching inventory transactions:', error);
      res.status(500).json({ message: "Failed to fetch inventory transactions" });
    }
  });

  app.get("/api/inventory/:id/transactions", requireAuth, async (req: Request, res: Response) => {
    try {
      const itemId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      const { type, start, end } = req.query;
      
      console.log('>>> HIT inventory item transactions route, itemId:', itemId, 'tenant:', tenantId);
      
      const transactions = await storage.getInventoryTransactionsByItem(itemId, { tenantId });
      
      // Apply client-side filtering for type and date range if needed
      let filteredTransactions = transactions;
      
      if (type && type !== 'all') {
        filteredTransactions = filteredTransactions.filter(tx => tx.transactionType === type);
      }
      
      if (start) {
        const startDate = new Date(start as string);
        filteredTransactions = filteredTransactions.filter(tx => new Date(tx.transactionDate) >= startDate);
      }
      
      if (end) {
        const endDate = new Date(end as string);
        endDate.setHours(23, 59, 59, 999);
        filteredTransactions = filteredTransactions.filter(tx => new Date(tx.transactionDate) <= endDate);
      }
      
      res.json(filteredTransactions);
    } catch (error) {
      console.error('Error fetching inventory item transactions:', error);
      res.status(500).json({ message: "Failed to fetch inventory item transactions" });
    }
  });

  app.post("/api/inventory-transactions", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }

      const transactionData = {
        ...req.body,
        tenantId,
        createdBy: req.user?.id
      };

      const newTransaction = await storage.createInventoryTransaction(transactionData);
      res.status(201).json(newTransaction);
    } catch (error) {
      console.error('Error creating inventory transaction:', error);
      res.status(500).json({ message: "Failed to create inventory transaction" });
    }
  });

  // PDF Generation Routes
  app.get("/api/quotes/:id/pdf", requireAuth, async (req: Request, res: Response) => {
    try {
      const quoteId = parseInt(req.params.id);
      const tenantId = getTenantIdFromRequest(req);

      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }

      // Get quote data
      const quote = await storage.getQuote(quoteId);
      if (!quote || quote.tenantId !== tenantId) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // Get related data
      const customer = quote.customerId ? await storage.getCustomer(quote.customerId) : null;
      const project = quote.projectId ? await storage.getProject(quote.projectId) : null;
      const items = await storage.getQuoteItemsByQuote(quoteId);

      // Generate PDF using PDFKit service
      const pdfBuffer = await PDFService.generateQuotePDF({
        ...quote,
        customer,
        project,
        items
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Quote_${quote.quoteNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating quote PDF:', error);
      res.status(500).json({ message: "Failed to generate quote PDF" });
    }
  });

  app.get("/api/invoices/:id/pdf", requireAuth, async (req: Request, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const tenantId = getTenantIdFromRequest(req);

      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }

      // Get invoice data
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice || invoice.tenantId !== tenantId) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Get related data
      const customer = invoice.customerId ? await storage.getCustomer(invoice.customerId) : null;
      const project = invoice.projectId ? await storage.getProject(invoice.projectId) : null;
      const items = await storage.getInvoiceItemsByInvoice(invoiceId);

      // Generate PDF using PDFKit service
      const pdfBuffer = await PDFService.generateInvoicePDF({
        ...invoice,
        customer,
        project,
        items
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice_${invoice.invoiceNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      res.status(500).json({ message: "Failed to generate invoice PDF" });
    }
  });

  // Register document routes (PDF and email functionality)
  const { registerDocumentRoutes } = await import('./routes/document-routes');
  registerDocumentRoutes(app);

  // Test endpoints for PDF generation verification using PDFKit
  app.get("/api/test-quote-pdf", async (req: Request, res: Response) => {
    try {
      const testQuoteData = {
        id: 999,
        quoteNumber: 'Q-TEST-001',
        issueDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'draft',
        subtotal: 1980.00,
        tax: 198.00,
        total: 2178.00,
        notes: 'Test quote generated using PDFKit service',
        terms: 'Standard terms and conditions apply',
        customer: {
          name: 'Test Customer Ltd',
          email: 'test@example.com',
          phone: '+44 1234 567890',
          address: '37 Larkfield',
          city: 'Chorley',
          state: 'Lancashire',
          zipCode: 'PR7 5RN'
        },
        project: {
          name: 'Test Project',
          description: 'Test project for PDF verification'
        },
        items: [
          {
            description: 'To supply and install single-phase roller shutter with tubular motor 150NM. Motor to have manual override in case of power failure.',
            quantity: 1,
            unitPrice: 1980.00,
            total: 1980.00
          }
        ]
      };

      const pdfBuffer = await PDFService.generateQuotePDF(testQuoteData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Test_Quote.pdf"');
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating test quote PDF:", error);
      res.status(500).json({ message: "Failed to generate test quote PDF" });
    }
  });

  app.get("/api/test-invoice-pdf", async (req: Request, res: Response) => {
    try {
      const testInvoiceData = {
        id: 999,
        invoiceNumber: 'I-TEST-001',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'sent',
        subtotal: 2500.00,
        tax: 250.00,
        total: 2750.00,
        notes: 'Test invoice generated using PDFKit service',
        terms: 'Payment due within 30 days',
        customer: {
          name: 'Test Customer Ltd',
          email: 'billing@testcustomer.com',
          phone: '+44 1234 567890',
          address: '123 Business Street',
          city: 'Manchester',
          state: 'Greater Manchester',
          zipCode: 'M1 1AA'
        },
        project: {
          name: 'Test Installation Project',
          description: 'Commercial installation project'
        },
        items: [
          {
            description: 'Professional installation services including site survey, materials, and 2-year warranty coverage',
            quantity: 1,
            unitPrice: 2500.00,
            total: 2500.00
          }
        ]
      };

      const pdfBuffer = await PDFService.generateInvoicePDF(testInvoiceData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Test_Invoice.pdf"');
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating test invoice PDF:", error);
      res.status(500).json({ message: "Failed to generate test invoice PDF" });
    }
  });

  // Note: HTML PDF service removed - using PDFKit service for consistency

  app.get("/api/test-professional-invoice-pdf", async (req: Request, res: Response) => {
    try {
      const companySettings = await storage.getCompanySettings();
      
      const testInvoiceData = {
        invoiceNumber: 'INV-7776-1-06715',
        issueDate: '2025-05-24',
        createdAt: new Date(),
        reference: 'REF-2025-001',
        subtotal: 2500.00,
        tax: 250.00,
        discount: 0,
        total: 2750.00,
        customer: {
          name: 'Test Customer Ltd',
          address: '123 Business Street',
          city: 'Manchester',
          state: 'Greater Manchester',
          zipCode: 'M1 1AA',
          email: 'customer@testcompany.com',
          phone: '0161 123 4567'
        },
        invoiceItems: [
          {
            description: 'Professional shopfront installation with premium materials and 2-year warranty',
            quantity: 1,
            unitPrice: 2500.00,
            total: 2500.00
          }
        ]
      };

      const pdfBuffer = await PDFService.generateInvoicePDF(testInvoiceData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Professional_Invoice.pdf"');
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating professional invoice PDF:", error);
      res.status(500).json({ message: "Failed to generate professional invoice PDF" });
    }
  });

  // Unified PDF test endpoints with consistent styling
  app.get("/api/test-unified-quote-pdf", async (req: Request, res: Response) => {
    try {
      const testQuoteData = {
        quoteNumber: 'QUO-7776-1-06715',
        issueDate: '5/24/2025',
        expiryDate: '6/23/2025',
        customerName: 'Praneeth',
        customerEmail: 'yerasubhash2000@gmail.com',
        customerPhone: '07468519682',
        customerAddress: '45',
        projectName: 'manchester',
        subtotal: 1890.00,
        tax: 20.00,
        discount: 90.00,
        total: 1820.00,
        items: [
          {
            description: 'To supply and install single-phase roller shutter with tubular motor 150NM. Motor to have manual override in case of power failure. Roller shutters to have solid curtain laths, 2.5 inch guide rails and L-bottom for extra security. Shutter to be operated by remote FOB system. Shutter to be manufactured in RAL TBC.',
            quantity: 1,
            unitPrice: 1890.00,
            total: 1890.00
          }
        ]
      };

      console.log("Generating unified quote PDF with enhanced PDFKit...");
      const pdfBuffer = await PDFService.generateQuotePDF(testQuoteData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Unified_Quote.pdf"');
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating unified quote PDF:", error);
      res.status(500).json({ message: "Failed to generate unified quote PDF", error: error.message });
    }
  });

  app.get("/api/test-unified-invoice-pdf", async (req: Request, res: Response) => {
    try {
      const testInvoiceData = {
        invoiceNumber: 'INV-390097',
        issueDate: '5/24/2025',
        dueDate: '6/23/2025',
        customerName: 'Akshay Ramporam',
        customerEmail: 'akshayreddyramporam@gmail.com',
        customerPhone: '07824046274',
        customerAddress: '45',
        projectName: 'Fisher aqua',
        projectDescription: 'test it running',
        quoteId: '7',
        subtotal: 1800.00,
        tax: 20.00,
        discount: 70.00,
        total: 1750.00,
        items: [
          {
            description: 'To supply and install single-phase roller shutter with tubular motor 150NM. Motor to have manual override in case of power failure. Roller shutters to have solid curtain laths, 2.5 inch guide rails and L-bottom for extra security. Shutter to be operated by remote FOB system. Shutter to be manufactured in RAL TBC.',
            quantity: 1,
            unitPrice: 1800.00,
            total: 1800.00
          }
        ]
      };

      console.log("Generating unified invoice PDF with enhanced PDFKit...");
      const pdfBuffer = await PDFService.generateInvoicePDF(testInvoiceData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Unified_Invoice.pdf"');
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating unified invoice PDF:", error);
      res.status(500).json({ message: "Failed to generate unified invoice PDF", error: error.message });
    }
  });


  // We'll create a server in index.ts
  console.log('API routes registered successfully');
  
  // Create and return an HTTP server instance but don't start listening
  return createServer(app);
}