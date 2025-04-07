import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import PDFService from "./services/pdf-service";
import EmailService from "./services/email-service";
import { setupWebSocketServer, WebSocketEvent, getWebSocketManager } from "./websocket";
import { cloudStorage } from "./services/storage-service";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import { addTenantFilter, tenantMiddleware } from "./middleware/tenant-filter";
import { User } from "@shared/types";
import { registerDocumentRoutes } from "./routes/document-routes";
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
  insertTaskSchema,
  insertCatalogItemSchema,
  insertSupplierSchema,
  insertExpenseSchema,
  insertPurchaseOrderSchema,
  insertPurchaseOrderItemSchema,
  insertInventoryItemSchema,
  insertInventoryTransactionSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Apply tenant filter middleware for multi-tenant data isolation
  app.use(tenantMiddleware);
  
  // Common authentication middleware for protected routes
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Set tenant ID from the authenticated user for use in routes
    if (req.user && (req.user as User).tenantId) {
      (req as any).tenantId = (req.user as User).tenantId;
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
  
  // Tenant information endpoint
  app.get("/api/tenant", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    
    if (!req.tenant) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }
    
    return res.json({ success: true, tenant: req.tenant });
  });
  
  // Tenant management routes
  app.get("/api/tenant/settings", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.tenant) {
        return res.status(404).json({ success: false, message: "Tenant not found" });
      }
      
      // Get current tenant details
      const tenant = await storage.getTenant(req.tenant.id);
      if (!tenant) {
        return res.status(404).json({ success: false, message: "Tenant not found" });
      }
      
      return res.json({ success: true, tenant });
    } catch (error) {
      console.error("Error fetching tenant settings:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch tenant settings" });
    }
  });
  
  // Update tenant settings
  app.patch("/api/tenant/settings", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.tenant) {
        return res.status(404).json({ success: false, message: "Tenant not found" });
      }
      
      // Check if user has admin privileges
      if ((req.user as User).role !== 'admin') {
        return res.status(403).json({ success: false, message: "Only administrators can update tenant settings" });
      }
      
      // Update tenant with provided data
      const updatedTenant = await storage.updateTenant(req.tenant.id, req.body);
      if (!updatedTenant) {
        return res.status(404).json({ success: false, message: "Failed to update tenant" });
      }
      
      return res.json({ success: true, tenant: updatedTenant });
    } catch (error) {
      console.error("Error updating tenant settings:", error);
      return res.status(500).json({ success: false, message: "Failed to update tenant settings" });
    }
  });
  
  // User management routes within tenant
  
  // Get all users in the current tenant
  app.get("/api/tenant/users", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.tenant) {
        return res.status(404).json({ success: false, message: "Tenant not found" });
      }
      
      // Get all users for the current tenant
      const users = await storage.getAllUsers({ tenantId: req.tenant.id });
      
      // Remove password field from each user for security
      const sanitizedUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      return res.json({ success: true, users: sanitizedUsers });
    } catch (error) {
      console.error("Error fetching tenant users:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
  });
  
  // Get a specific user in the current tenant
  app.get("/api/tenant/users/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.tenant) {
        return res.status(404).json({ success: false, message: "Tenant not found" });
      }
      
      const userId = Number(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      // Ensure the user belongs to the current tenant
      if (user.tenantId !== req.tenant.id) {
        return res.status(403).json({ success: false, message: "Access denied to user from another tenant" });
      }
      
      // Remove password field for security
      const { password, ...userWithoutPassword } = user;
      
      return res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch user" });
    }
  });
  
  // Update a user in the current tenant
  app.patch("/api/tenant/users/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.tenant) {
        return res.status(404).json({ success: false, message: "Tenant not found" });
      }
      
      // Check if current user has admin privileges or is updating their own account
      if ((req.user as User).role !== 'admin' && (req.user as User).id !== Number(req.params.id)) {
        return res.status(403).json({ success: false, message: "You can only update your own account or be an admin" });
      }
      
      const userId = Number(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      // Ensure the user belongs to the current tenant
      if (user.tenantId !== req.tenant.id) {
        return res.status(403).json({ success: false, message: "Access denied to user from another tenant" });
      }
      
      // Only admins can change roles
      if (req.body.role && (req.user as User).role !== 'admin') {
        return res.status(403).json({ success: false, message: "Only administrators can change user roles" });
      }
      
      // Do not allow changing tenantId through this endpoint
      if (req.body.tenantId) {
        delete req.body.tenantId;
      }
      
      // Handle password updates
      if (req.body.password) {
        // Hash password if provided
        const salt = await bcrypt.genSalt(10);
        req.body.password = await bcrypt.hash(req.body.password, salt);
      }
      
      const updatedUser = await storage.updateUser(userId, req.body);
      if (!updatedUser) {
        return res.status(404).json({ success: false, message: "Failed to update user" });
      }
      
      // Remove password field for security
      const { password, ...userWithoutPassword } = updatedUser;
      
      return res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
      console.error("Error updating user:", error);
      return res.status(500).json({ success: false, message: "Failed to update user" });
    }
  });
  
  // Delete a user from the current tenant
  app.delete("/api/tenant/users/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.tenant) {
        return res.status(404).json({ success: false, message: "Tenant not found" });
      }
      
      // Check if current user has admin privileges
      if ((req.user as User).role !== 'admin') {
        return res.status(403).json({ success: false, message: "Only administrators can delete users" });
      }
      
      const userId = Number(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      // Ensure the user belongs to the current tenant
      if (user.tenantId !== req.tenant.id) {
        return res.status(403).json({ success: false, message: "Access denied to user from another tenant" });
      }
      
      // Prevent deleting the last admin user
      if (user.role === 'admin') {
        const adminUsers = (await storage.getAllUsers({ tenantId: req.tenant.id }))
          .filter(u => u.role === 'admin');
        
        if (adminUsers.length <= 1) {
          return res.status(400).json({ 
            success: false, 
            message: "Cannot delete the last admin user for this tenant" 
          });
        }
      }
      
      const deleted = await storage.deleteUser(userId);
      
      if (deleted) {
        return res.status(200).json({ success: true, message: "User deleted successfully" });
      } else {
        return res.status(500).json({ success: false, message: "Failed to delete user" });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ success: false, message: "Failed to delete user" });
    }
  });
  
  // Register document routes for PDF generation and email sharing
  registerDocumentRoutes(app);

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
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcast("customer:created", {
          id: customer.id,
          data: customer,
          message: `New customer added: ${customer.name}`
        });
      }
      
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
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcast("project:created", {
          id: project.id,
          data: project,
          message: `New project created: ${project.name}`,
          timestamp: new Date().toISOString()
        });
      }
      
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
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager && updatedProject) {
        // Prepare status change message if status has changed
        let message = `Project updated: ${updatedProject.name}`;
        if (project.status !== updatedProject.status) {
          message = `Project ${updatedProject.name} status changed to ${updatedProject.status}`;
        }
        
        wsManager.broadcast("project:updated", {
          id: updatedProject.id,
          data: updatedProject,
          message,
          timestamp: new Date().toISOString()
        });
      }
      
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
        // Send real-time update to all connected clients
        const wsManager = getWebSocketManager();
        if (wsManager) {
          wsManager.broadcast("project:deleted", {
            id: projectId,
            data: { id: projectId, name: project.name },
            message: `Project deleted: ${project.name}`,
            timestamp: new Date().toISOString()
          });
        }
        
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
      const tenantId = req.tenant?.id;
      
      // Create tenant filter if tenant context is available
      const tenantFilter = tenantId ? { tenantId } : undefined;
      
      let quotes;
      if (status) {
        quotes = await storage.getQuotesByStatus(status as string, tenantFilter);
      } else if (customerId) {
        quotes = await storage.getQuotesByCustomer(Number(customerId), tenantFilter);
      } else if (projectId) {
        quotes = await storage.getQuotesByProject(Number(projectId), tenantFilter);
      } else {
        quotes = await storage.getAllQuotes(tenantFilter);
      }
      
      res.json(quotes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.get("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      const tenantId = req.tenant?.id;
      const quote = await storage.getQuote(Number(req.params.id), tenantId);
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
  
  // Get quote items for a specific quote
  app.get("/api/quotes/:id/items", requireAuth, async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const tenantId = req.tenant?.id;
      const quote = await storage.getQuote(quoteId, tenantId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      const quoteItems = await storage.getQuoteItemsByQuote(quoteId);
      res.json(quoteItems);
    } catch (error) {
      console.error("Error fetching quote items:", error);
      res.status(500).json({ message: "Failed to fetch quote items" });
    }
  });

  app.post("/api/quotes", requireAuth, validateBody(insertQuoteSchema), async (req, res) => {
    try {
      // Extract items from the request body if present
      const { items, ...quoteData } = req.body;
      
      // Generate quote number
      console.log("Creating quote with body:", quoteData);
      const quoteNumber = `Q-${Date.now().toString().substr(-6)}`;
      
      // Add tenant ID from authenticated user context
      const tenantId = req.tenant?.id;
      
      // Create the quote without items first
      const quote = await storage.createQuote({
        ...quoteData,
        quoteNumber,
        createdBy: req.user?.id,
        tenantId: tenantId,
        status: quoteData.status || "draft"
      });
      
      console.log("Created quote:", quote);
      
      // Now add items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        console.log("Adding items to quote:", items);
        
        for (const item of items) {
          await storage.createQuoteItem({
            quoteId: quote.id,
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
        wsManager.broadcast("quote:created", {
          id: quote.id,
          data: quote,
          message: `New quote created: ${quote.quoteNumber}`,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(201).json(quote);
    } catch (error) {
      console.error("Failed to create quote:", error);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  app.post("/api/quotes/:id/items", requireAuth, validateBody(insertQuoteItemSchema), async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const tenantId = req.tenant?.id;
      const quote = await storage.getQuote(quoteId, tenantId);
      
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
      const tenantId = req.tenant?.id;
      const quote = await storage.getQuote(quoteId, tenantId);
      
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
      const tenantId = req.tenant?.id;
      const quote = await storage.getQuote(quoteId, tenantId);
      
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
      const tenantId = req.tenant?.id;
      
      // Add cache-busting headers to prevent browser caching
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      
      console.log(`[PDF Route] Starting PDF generation for quote ID: ${quoteId}`);
      
      // Fetch the quote with tenant context
      const quote = await storage.getQuote(quoteId, tenantId);
      
      if (!quote) {
        console.log(`[PDF Route] Quote not found with ID: ${quoteId}`);
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(quote.createdBy)) {
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
      const tenantId = req.tenant?.id;
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
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(quote.createdBy)) {
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
      
      // Get company settings for sender email
      const companySettings = await storage.getCompanySettings();
      const senderEmail = companySettings?.email || 'noreply@example.com';
      
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
      const tenantId = req.tenant?.id;
      
      // Fetch quote with tenant context
      const quote = await storage.getQuote(quoteId, tenantId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(quote.createdBy)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now().toString().substr(-6)}`;
      
      // Create invoice from quote
      const newInvoice = {
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
        createdBy: req.user?.id,
        tenantId: tenantId // Add tenant ID to the invoice
      };
      
      const invoice = await storage.createInvoice(newInvoice);
      
      // Copy quote items to invoice items
      const quoteItems = await storage.getQuoteItemsByQuote(quoteId);
      
      for (const item of quoteItems) {
        await storage.createInvoiceItem({
          invoiceId: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          catalogItemId: item.catalogItemId
        });
      }
      
      // Update quote status
      await storage.updateQuote(quoteId, { status: "converted" }, tenantId);
      
      res.status(201).json(invoice);
    } catch (error) {
      console.error('Error converting quote to invoice:', error);
      res.status(500).json({ message: "Failed to convert quote to invoice" });
    }
  });

  // Invoice routes
  app.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      const { status, customerId, projectId } = req.query;
      const tenantId = req.tenant?.id;
      
      let invoices;
      if (status) {
        invoices = await storage.getInvoicesByStatus(status as string, tenantId);
      } else if (customerId) {
        invoices = await storage.getInvoicesByCustomer(Number(customerId), tenantId);
      } else if (projectId) {
        invoices = await storage.getInvoicesByProject(Number(projectId), tenantId);
      } else {
        invoices = await storage.getAllInvoices(tenantId ? { tenantId } : undefined);
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
      const tenantId = req.tenant?.id;
      
      const invoice = await storage.getInvoice(invoiceId, tenantId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(invoice.createdBy)) {
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
      const tenantId = req.tenant?.id;
      
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
      const tenantId = req.tenant?.id;
      
      const invoice = await storage.getInvoice(invoiceId, tenantId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(invoice.createdBy)) {
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
      const tenantId = req.tenant?.id;
      
      const invoice = await storage.getInvoice(invoiceId, tenantId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(invoice.createdBy)) {
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
      const tenantId = req.tenant?.id;
      
      const invoice = await storage.getInvoice(invoiceId, tenantId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(invoice.createdBy)) {
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

  // Test invoice PDF generation with hardcoded data (no auth)
  app.get("/api/test-invoice-pdf", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      console.log(`Test PDF endpoint called - using hardcoded test data${tenantId ? ` for tenant ID ${tenantId}` : ''}`);
      
      // Generate PDF directly using the PDFService with test data flag
      const pdfBuffer = await PDFService.generateInvoicePDF({
        id: 1,
        invoiceNumber: 'DIRECT-TEST',
        items: [],
        tenantId
      } as any, true); // Pass true to use test data
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=TestInvoice.pdf');
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ 
        message: "Failed to generate PDF",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Serve the PDF test HTML page for direct browser testing
  app.get("/pdf-test", (req, res) => {
    res.sendFile("direct-pdf-test.html", { root: "." });
  });
  
  // Unprotected route for testing invoice PDF display - allows easy testing without auth
  app.get("/api/test-invoice-pdf/:id", async (req, res) => {
    try {
      const invoiceId = Number(req.params.id);
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      
      console.log(`Test specific invoice PDF endpoint called for invoice ID ${invoiceId}${tenantId ? ` and tenant ID ${tenantId}` : ''}`);
      
      const invoice = await storage.getInvoice(invoiceId, tenantId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Get invoice items
      const invoiceItems = await storage.getInvoiceItemsByInvoice(invoiceId);
      console.log(`Found ${invoiceItems.length} invoice items for PDF generation`);
      
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
      
      const completeInvoiceData = {
        ...invoice,
        items: invoiceItems,
        customer,
        project,
        tenantId
      };
      
      // Generate PDF using the PDFService with full context
      const pdfBuffer = await PDFService.generateInvoicePDF(completeInvoiceData);
      
      // Force the download with proper headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Invoice_${invoice.invoiceNumber}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating test invoice PDF:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ 
        message: "Failed to generate PDF", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // Regular invoice PDF generation route
  app.get("/api/invoices/:id/pdf", requireAuth, async (req, res) => {
    const invoiceId = Number(req.params.id);
    const tenantId = req.tenant?.id;

    // Input validation: Check if invoiceId is a valid number
    if (isNaN(invoiceId)) {
      console.error(`[ERROR] Invalid invoice ID: ${req.params.id}`);
      return res.status(400).json({ message: "Invalid invoice ID. Must be a number." });
    }

    try {
      // Fetch invoice data with tenant context
      const invoice = await storage.getInvoice(invoiceId, tenantId);

      if (!invoice) {
        console.warn(`[WARN] Invoice not found: ${invoiceId}`);
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(invoice.createdBy)) {
        console.warn(`[WARN] Access denied for user ${req.user?.id} to invoice ${invoiceId}`);
        return res.status(403).json({ message: "Access denied" });
      }

      // Get invoice items
      const invoiceItems = await storage.getInvoiceItemsByInvoice(invoiceId);
      console.log(`[INFO] Found ${invoiceItems.length} invoice items for PDF generation`);

      // Get customer data
      let customer = null;
      if (invoice.customerId) {
        try {
          customer = await storage.getCustomer(invoice.customerId, tenantId);
          console.log(`[INFO] Retrieved customer data for invoice: ${customer ? 'found' : 'not found'}`);
        } catch (error) {
          console.error(`[ERROR] Failed to fetch customer data:`, error);
          // Don't block PDF generation, but log the error. Customer data is optional.
          customer = null;
        }
      }

      // Get project data
      let project = null;
      if (invoice.projectId) {
        try {
          project = await storage.getProject(invoice.projectId, tenantId);
          console.log(`[INFO] Retrieved project data for invoice: ${project ? 'found' : 'not found'}`);
        } catch (error) {
          console.error(`[ERROR] Failed to fetch project data:`, error);
          // Don't block PDF generation, but log the error. Project data is optional.
          project = null;
        }
      }

      console.log(`[INFO] Generating PDF for Invoice_${invoice.invoiceNumber}`);

      // Create complete invoice data object with all necessary related data
      const completeInvoiceData = {
        ...invoice,
        items: invoiceItems,
        customer,
        project,
        tenantId
      };

      // Log items count right before passing to PDF service
      console.log(`[INFO] Passing invoice to PDF service with ${completeInvoiceData.items.length} items`);

      // Generate PDF using the PDFService with full context
      const pdfBuffer = await PDFService.generateInvoicePDF(completeInvoiceData);

      // Check for empty PDF buffer
      if (!pdfBuffer || pdfBuffer.length === 0) {
        const message = "[ERROR] Generated PDF buffer is empty";
        console.error(message);
        return res.status(500).json({ message });
      }

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Invoice_${invoice.invoiceNumber}.pdf`);
      res.setHeader('Content-Length', pdfBuffer.length); // Set Content-Length header
      
      res.send(pdfBuffer);
    } catch (error) {
      // Handle errors during the PDF generation process
      console.error('[ERROR] Error generating invoice PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        message: "Failed to generate PDF",
        details: errorMessage,
      });
    }
  });

  app.post("/api/invoices/:id/email", requireAuth, async (req, res) => {
    try {
      const invoiceId = Number(req.params.id);
      const tenantId = req.tenant?.id;
      const { recipientEmail, subject, message, includePdf = true } = req.body;
      
      console.log('Email request:', { invoiceId, recipientEmail, subject, hasMessage: !!message, includePdf });
      
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
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(invoice.createdBy)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get invoice items
      const invoiceItems = await storage.getInvoiceItemsByInvoice(invoiceId);
      console.log(`Retrieved ${invoiceItems.length} items for invoice ${invoiceId}`);
      
      // Get customer data
      let customer = null;
      if (invoice.customerId) {
        customer = await storage.getCustomer(invoice.customerId, tenantId);
        console.log(`Retrieved customer data for invoice ${invoiceId}: ${customer?.name}`);
      }
      
      // Get project data
      let project = null;
      if (invoice.projectId) {
        project = await storage.getProject(invoice.projectId, tenantId);
        console.log(`Retrieved project data for invoice ${invoiceId}: ${project?.name}`);
      }
      
      // Get company settings for sender email
      const companySettings = await storage.getCompanySettings(tenantId);
      const senderEmail = companySettings?.email || 'noreply@example.com';
      
      console.log(`Sending email from ${senderEmail} to ${recipientEmail}`);
      
      // Check SendGrid API key
      if (!process.env.SENDGRID_API_KEY) {
        console.error('SendGrid API key not configured. Please set SENDGRID_API_KEY environment variable.');
        return res.status(500).json({ message: "Email service not properly configured" });
      }
      
      // Send email with PDF using EmailService with full context
      const success = await EmailService.sendInvoice(
        { 
          ...invoice, 
          items: invoiceItems,
          customer,
          project,
          tenantId 
        },
        recipientEmail,
        senderEmail,
        { subject, message, includePdf }
      );
      
      if (success) {
        res.json({ message: "Invoice sent successfully via email" });
      } else {
        res.status(500).json({ message: "Failed to send invoice via email" });
      }
    } catch (error) {
      console.error('Error emailing invoice:', error);
      res.status(500).json({ message: "Failed to send invoice via email" });
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

  app.post("/api/employees", requireAuth, async (req, res) => {
    try {
      // Extract employee data from request
      const { fullName, email, phone, position, department, hireDate, terminationDate, 
              hourlyRate, salary, notes, userId } = req.body;
      
      // Create the employee with the provided data - keep dates as strings
      const employee = await storage.createEmployee({
        fullName,
        email,
        phone,
        position,
        department,
        hireDate,
        terminationDate,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        salary: salary ? parseFloat(salary) : undefined,
        notes,
        userId: userId && userId > 0 ? userId : undefined
      });
      
      res.status(201).json(employee);
    } catch (error) {
      console.error("Error creating employee:", error);
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
      
      // Extract employee data from request
      const { fullName, email, phone, position, department, hireDate, terminationDate, 
              hourlyRate, salary, notes, userId } = req.body;
      
      // Update the employee with the provided data - keep dates as strings
      const updatedEmployee = await storage.updateEmployee(employeeId, {
        fullName,
        email,
        phone,
        position,
        department,
        hireDate,
        terminationDate,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        salary: salary ? parseFloat(salary) : undefined,
        notes,
        userId: userId && userId > 0 ? userId : undefined
      });
      
      res.json(updatedEmployee);
    } catch (error) {
      console.error("Error updating employee:", error);
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

  app.post("/api/timesheets", requireAuth, async (req, res) => {
    try {
      console.log("Timesheet data received:", req.body);
      
      // Direct validation without using Zod validation middleware
      // Validate only the required fields
      if (!req.body.employeeId) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: [{ path: ["employeeId"], message: "Employee is required" }] 
        });
      }
      
      if (!req.body.date) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: [{ path: ["date"], message: "Date is required" }] 
        });
      }
      
      // Format the data for storage - keep only essential fields
      const timesheetData = {
        employeeId: req.body.employeeId,
        date: req.body.date,
        // Only include these fields if they're provided and not empty
        startTime: req.body.startTime && req.body.startTime.trim() !== "" ? req.body.startTime : null,
        endTime: req.body.endTime && req.body.endTime.trim() !== "" ? req.body.endTime : null,
        breakDuration: req.body.breakDuration || null,
        notes: req.body.notes || "",
        status: req.body.status || "pending",
        createdBy: req.user?.id
      };
      
      console.log("Formatted timesheet data to save:", timesheetData);
      
      // Create the timesheet with validated data
      const timesheet = await storage.createTimesheet(timesheetData);
      res.status(201).json(timesheet);
    } catch (error) {
      console.error("Error creating timesheet:", error);
      console.error("Error details:", error instanceof Error ? error.message : "Unknown error");
      res.status(500).json({ 
        message: "Failed to create timesheet", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.put("/api/timesheets/:id", requireAuth, async (req, res) => {
    try {
      const timesheetId = Number(req.params.id);
      const timesheet = await storage.getTimesheet(timesheetId);
      
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      
      console.log("Original timesheet update data received:", req.body);
      
      // Format the data for storage - keep only essential fields
      const timesheetData = {
        ...req.body,
        // Only include these fields if they're provided and not empty
        startTime: req.body.startTime && req.body.startTime.trim() !== "" ? req.body.startTime : null,
        endTime: req.body.endTime && req.body.endTime.trim() !== "" ? req.body.endTime : null,
        breakDuration: req.body.breakDuration || null,
      };
      
      console.log("Formatted timesheet update data to save:", timesheetData);
      
      const updatedTimesheet = await storage.updateTimesheet(timesheetId, timesheetData);
      res.json(updatedTimesheet);
    } catch (error) {
      console.error("Error updating timesheet:", error);
      console.error("Error details:", error instanceof Error ? error.message : "Unknown error");
      res.status(500).json({ 
        message: "Failed to update timesheet", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
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
        console.log("Fetching all surveys");
        surveys = await storage.getAllSurveys();
      }
      
      console.log(`Successfully retrieved ${surveys.length} surveys`);
      res.json(surveys);
    } catch (error) {
      console.error("Error fetching surveys:", error);
      res.status(500).json({ 
        message: "Failed to fetch surveys", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
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
      // Add extra validation for dates
      if (!req.body.scheduledDate) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: [{ path: ["scheduledDate"], message: "Scheduled date is required" }] 
        });
      }
      
      if (!req.body.projectId) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: [{ path: ["projectId"], message: "Project is required" }] 
        });
      }
      
      console.log("Original survey data received:", req.body);
      
      // Validate the date format but keep it as a string for the database
      if (req.body.scheduledDate) {
        try {
          const testDate = new Date(req.body.scheduledDate);
          if (isNaN(testDate.getTime())) {
            return res.status(400).json({
              message: "Validation failed",
              errors: [{ path: ["scheduledDate"], message: "Invalid date format for scheduledDate" }]
            });
          }
        } catch (e) {
          return res.status(400).json({
            message: "Validation failed",
            errors: [{ path: ["scheduledDate"], message: "Invalid date format for scheduledDate" }]
          });
        }
      }
      
      // Prepare the data for storage - keep scheduledDate as string
      const formattedBody = {
        ...req.body,
        assignedTo: req.body.assignedTo === "unassigned" ? undefined : req.body.assignedTo,
        createdBy: req.user?.id
      };
      
      console.log("Formatted survey data to save:", formattedBody);
      
      const survey = await storage.createSurvey(formattedBody);
      console.log("Survey created successfully:", survey);
      res.status(201).json(survey);
    } catch (error) {
      console.error("Survey creation error:", error);
      res.status(500).json({ 
        message: "Failed to create survey", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.put("/api/surveys/:id", requireAuth, async (req, res) => {
    try {
      const surveyId = Number(req.params.id);
      const survey = await storage.getSurvey(surveyId);
      
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      console.log("Original survey update data received:", req.body);
      
      // Process dates safely - validate but keep as strings
      let formattedBody = { ...req.body };
      
      // Validate scheduledDate but keep as string
      if (req.body.scheduledDate) {
        try {
          const testDate = new Date(req.body.scheduledDate);
          if (isNaN(testDate.getTime())) {
            return res.status(400).json({
              message: "Validation failed",
              errors: [{ path: ["scheduledDate"], message: "Invalid date format for scheduledDate" }]
            });
          }
          // Keep the string value, don't convert to Date
        } catch (e) {
          return res.status(400).json({
            message: "Validation failed",
            errors: [{ path: ["scheduledDate"], message: "Invalid date format for scheduledDate" }]
          });
        }
      }
      
      // Handle assignedTo
      if (formattedBody.assignedTo === "unassigned") {
        formattedBody.assignedTo = undefined;
      }
      
      console.log("Formatted survey update data to save:", formattedBody);
      
      const updatedSurvey = await storage.updateSurvey(surveyId, formattedBody);
      console.log("Survey updated successfully:", updatedSurvey);
      res.json(updatedSurvey);
    } catch (error) {
      console.error("Survey update error:", error);
      res.status(500).json({ 
        message: "Failed to update survey", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
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
        console.log("Fetching all installations");
        installations = await storage.getAllInstallations();
      }
      
      console.log(`Successfully retrieved ${installations.length} installations`);
      res.json(installations);
    } catch (error) {
      console.error("Error fetching installations:", error);
      res.status(500).json({ 
        message: "Failed to fetch installations", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
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
      // Add extra validation for dates
      if (!req.body.scheduledDate) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: [{ path: ["scheduledDate"], message: "Scheduled date is required" }] 
        });
      }
      
      if (!req.body.projectId) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: [{ path: ["projectId"], message: "Project is required" }] 
        });
      }
      
      console.log("Original installation data received:", req.body);
      
      // Validate the date format but keep it as a string for the database
      if (req.body.scheduledDate) {
        try {
          const testDate = new Date(req.body.scheduledDate);
          if (isNaN(testDate.getTime())) {
            return res.status(400).json({
              message: "Validation failed",
              errors: [{ path: ["scheduledDate"], message: "Invalid date format for scheduledDate" }]
            });
          }
        } catch (e) {
          return res.status(400).json({
            message: "Validation failed",
            errors: [{ path: ["scheduledDate"], message: "Invalid date format for scheduledDate" }]
          });
        }
      }
      
      // Process assignedTo - installations use array type
      let assignedTo = req.body.assignedTo;
      if (Array.isArray(assignedTo) && assignedTo.length === 0) {
        assignedTo = undefined;
      } else if (assignedTo === "unassigned") {
        assignedTo = undefined;
      }
      
      // Prepare the data for storage - keep scheduledDate as string
      const formattedBody = {
        ...req.body,
        assignedTo,
        createdBy: req.user?.id
      };
      
      console.log("Formatted installation data to save:", formattedBody);
      
      const installation = await storage.createInstallation(formattedBody);
      console.log("Installation created successfully:", installation);
      res.status(201).json(installation);
    } catch (error) {
      console.error("Installation creation error:", error);
      res.status(500).json({ 
        message: "Failed to create installation", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.put("/api/installations/:id", requireAuth, async (req, res) => {
    try {
      const installationId = Number(req.params.id);
      const installation = await storage.getInstallation(installationId);
      
      if (!installation) {
        return res.status(404).json({ message: "Installation not found" });
      }
      
      console.log("Original installation update data received:", req.body);
      
      // Process dates safely - validate but keep as strings
      let formattedBody = { ...req.body };
      
      // Validate scheduledDate but keep as string
      if (req.body.scheduledDate) {
        try {
          const testDate = new Date(req.body.scheduledDate);
          if (isNaN(testDate.getTime())) {
            return res.status(400).json({
              message: "Validation failed",
              errors: [{ path: ["scheduledDate"], message: "Invalid date format for scheduledDate" }]
            });
          }
          // Keep the string value, don't convert to Date
        } catch (e) {
          return res.status(400).json({
            message: "Validation failed",
            errors: [{ path: ["scheduledDate"], message: "Invalid date format for scheduledDate" }]
          });
        }
      }
      
      // Handle assignedTo for installations (array type)
      if (formattedBody.assignedTo === "unassigned" || 
          (Array.isArray(formattedBody.assignedTo) && formattedBody.assignedTo.length === 0)) {
        formattedBody.assignedTo = undefined;
      }
      
      console.log("Formatted installation update data to save:", formattedBody);
      
      const updatedInstallation = await storage.updateInstallation(installationId, formattedBody);
      console.log("Installation updated successfully:", updatedInstallation);
      res.json(updatedInstallation);
    } catch (error) {
      console.error("Installation update error:", error);
      res.status(500).json({ 
        message: "Failed to update installation", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
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
      
      console.log(`Completing installation ${installationId} with data:`, req.body);
      
      const updatedInstallation = await storage.updateInstallation(installationId, { 
        status: "completed",
        completedBy: req.user?.id,
        completedAt: new Date(),
        ...req.body
      });
      
      console.log("Installation completed successfully:", updatedInstallation);
      res.json(updatedInstallation);
    } catch (error) {
      console.error("Error completing installation:", error);
      res.status(500).json({ 
        message: "Failed to complete installation", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
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
      // Get counts and summaries for dashboard widgets, filtering by tenant if available
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      const projects = await storage.getAllProjects(tenantFilter);
      const quotes = await storage.getAllQuotes(tenantFilter);
      const invoices = await storage.getAllInvoices(tenantFilter);
      const surveys = await storage.getAllSurveys(tenantFilter);
      
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
      const installations = await storage.getAllInstallations(tenantFilter);
      
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

  // Catalog Items routes
  app.get("/api/catalog-items", requireAuth, async (req, res) => {
    try {
      const { category, userId } = req.query;
      
      let catalogItems;
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      
      if (category) {
        catalogItems = await storage.getCatalogItemsByCategory(category as string, tenantFilter);
      } else if (userId) {
        catalogItems = await storage.getCatalogItemsByUser(Number(userId), tenantFilter);
      } else {
        catalogItems = await storage.getAllCatalogItems(tenantFilter);
      }
      
      res.json(catalogItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch catalog items" });
    }
  });

  app.get("/api/catalog-items/:id", requireAuth, async (req, res) => {
    try {
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      const catalogItem = await storage.getCatalogItem(Number(req.params.id), tenantFilter);
      if (!catalogItem) {
        return res.status(404).json({ message: "Catalog item not found" });
      }
      res.json(catalogItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch catalog item" });
    }
  });

  app.post("/api/catalog-items", requireAuth, validateBody(insertCatalogItemSchema), async (req, res) => {
    try {
      // Add tenant ID if available
      const tenantData = req.tenantId ? { tenantId: req.tenantId } : {};
      
      const catalogItem = await storage.createCatalogItem({
        ...req.body,
        ...tenantData,
        createdBy: req.user?.id
      });
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcast("catalog-item:created", {
          id: catalogItem.id,
          data: catalogItem,
          message: `New catalog item added: ${catalogItem.name}`,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(201).json(catalogItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to create catalog item" });
    }
  });

  app.put("/api/catalog-items/:id", requireAuth, async (req, res) => {
    try {
      const itemId = Number(req.params.id);
      const tenantId = req.tenantId;
      
      // Get item with tenant check
      const catalogItem = await storage.getCatalogItem(itemId, tenantId);
      
      if (!catalogItem) {
        return res.status(404).json({ message: "Catalog item not found" });
      }
      
      // Pass tenant ID explicitly to update method
      const updatedItem = await storage.updateCatalogItem(itemId, req.body, tenantId);
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager && updatedItem) {
        wsManager.broadcast("catalog-item:updated", {
          id: updatedItem.id,
          data: updatedItem,
          message: `Catalog item updated: ${updatedItem.name}`,
          timestamp: new Date().toISOString()
        });
      }
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating catalog item:", error);
      res.status(500).json({ message: "Failed to update catalog item" });
    }
  });

  app.delete("/api/catalog-items/:id", requireAuth, async (req, res) => {
    try {
      const itemId = Number(req.params.id);
      const tenantId = req.tenantId;
      
      // Get item with tenant check
      const catalogItem = await storage.getCatalogItem(itemId, tenantId);
      
      if (!catalogItem) {
        return res.status(404).json({ message: "Catalog item not found" });
      }
      
      // Pass tenant ID explicitly to delete method
      const deleted = await storage.deleteCatalogItem(itemId, tenantId);
      
      if (deleted) {
        // Send real-time update to all connected clients
        const wsManager = getWebSocketManager();
        if (wsManager) {
          wsManager.broadcast("catalog-item:deleted", {
            id: itemId,
            data: { id: itemId, name: catalogItem.name },
            message: `Catalog item deleted: ${catalogItem.name}`,
            timestamp: new Date().toISOString()
          });
        }
        
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete catalog item" });
      }
    } catch (error) {
      console.error("Error deleting catalog item:", error);
      res.status(500).json({ message: "Failed to delete catalog item" });
    }
  });

  // Test email endpoint
  app.post("/api/test/email", requireAuth, async (req, res) => {
    const { to, subject, body } = req.body;
    
    if (!to || !subject || !body) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: to, subject, body' 
      });
    }

    try {
      // Get company settings for sender email
      const companySettings = await storage.getCompanySettings();
      const from = companySettings?.email || 'noreply@example.com';
      
      // Use EmailService to send email
      const success = await EmailService.sendEmail({
        to,
        from,
        subject,
        text: body
      });

      return res.json({
        success: success,
        message: success ? 'Email sent successfully' : 'Failed to send email',
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      return res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to send test email' 
      });
    }
  });

  // Set up file uploading with multer
  const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = './tmp/uploads';
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const fileExt = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${fileExt}`);
    }
  });
  
  const upload = multer({ 
    storage: diskStorage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    }
  });
  
  // File upload routes
  app.post('/api/files/upload', requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file provided' });
      }
      
      const { folder = 'general', description = '', relatedId = null, relatedType = null } = req.body;
      
      // Upload file to Google Cloud Storage
      const fileUrl = await cloudStorage.uploadFile(req.file.path, {
        folder,
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      
      // Clean up local file
      fs.unlinkSync(req.file.path);
      
      // Create file record in database
      const fileRecord = await storage.createFileAttachment({
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        fileUrl,
        description,
        uploadedBy: req.user?.id || null,
        relatedId: relatedId ? Number(relatedId) : null,
        relatedType: relatedType || null
      });
      
      res.status(201).json(fileRecord);
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ message: 'Failed to upload file' });
    }
  });
  
  // Multiple file upload route
  app.post('/api/files/upload-multiple', requireAuth, upload.array('files', 10), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: 'No files provided' });
      }
      
      const { folder = 'general', description = '', relatedId = null, relatedType = null } = req.body;
      const fileRecords = [];
      
      // Process each uploaded file
      for (const file of req.files) {
        // Upload to Google Cloud Storage
        const fileUrl = await cloudStorage.uploadFile(file.path, {
          folder,
          filename: file.originalname,
          contentType: file.mimetype
        });
        
        // Clean up local file
        fs.unlinkSync(file.path);
        
        // Create file record in database
        const fileRecord = await storage.createFileAttachment({
          fileName: file.originalname,
          fileSize: file.size,
          fileType: file.mimetype,
          fileUrl,
          description,
          uploadedBy: req.user?.id || null,
          relatedId: relatedId ? Number(relatedId) : null,
          relatedType: relatedType || null
        });
        
        fileRecords.push(fileRecord);
      }
      
      res.status(201).json(fileRecords);
    } catch (error) {
      console.error('Error uploading multiple files:', error);
      res.status(500).json({ message: 'Failed to upload files' });
    }
  });
  
  // Get files related to an entity
  app.get('/api/files', requireAuth, async (req, res) => {
    try {
      const { relatedId, relatedType } = req.query;
      
      if (!relatedId || !relatedType) {
        return res.status(400).json({ message: 'relatedId and relatedType are required' });
      }
      
      const files = await storage.getFileAttachmentsByRelatedEntity(
        relatedType as string,
        Number(relatedId)
      );
      
      res.json(files);
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ message: 'Failed to fetch files' });
    }
  });
  
  // Get a specific file
  app.get('/api/files/:id', requireAuth, async (req, res) => {
    try {
      const fileId = Number(req.params.id);
      const file = await storage.getFileAttachment(fileId);
      
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      res.json(file);
    } catch (error) {
      console.error('Error fetching file:', error);
      res.status(500).json({ message: 'Failed to fetch file' });
    }
  });
  
  // Get files by related entity (e.g., quote, invoice, etc.)
  app.get('/api/files/:relatedType/:relatedId', requireAuth, async (req, res) => {
    try {
      const relatedType = req.params.relatedType;
      const relatedId = Number(req.params.relatedId);
      
      if (!relatedType || isNaN(relatedId)) {
        return res.status(400).json({ message: 'Invalid related type or ID' });
      }
      
      const files = await storage.getFileAttachmentsByRelatedEntity(relatedType, relatedId);
      res.json(files);
    } catch (error) {
      console.error('Error fetching files for related entity:', error);
      res.status(500).json({ message: 'Failed to fetch files' });
    }
  });
  
  // Delete a file
  app.delete('/api/files/:id', requireAuth, async (req, res) => {
    try {
      const fileId = Number(req.params.id);
      const file = await storage.getFileAttachment(fileId);
      
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Delete from Google Cloud Storage
      await cloudStorage.deleteFile(file.fileUrl);
      
      // Delete from database
      const deleted = await storage.deleteFileAttachment(fileId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: 'Failed to delete file' });
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ message: 'Failed to delete file' });
    }
  });
  


  // Database backup route
  app.post('/api/system/backup', requireAuth, async (req, res) => {
    try {
      // Check if user has admin role
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Only administrators can perform database backups' });
      }
      
      const dbName = process.env.PGDATABASE || 'replit_db';
      const backupUrl = await cloudStorage.createDatabaseBackup(dbName);
      
      res.json({ 
        message: 'Database backup created successfully', 
        backupUrl,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating database backup:', error);
      res.status(500).json({ message: 'Failed to create database backup' });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  const wsManager = setupWebSocketServer(httpServer);
  
  // WebSocket API routes
  app.post("/api/ws/notification", requireAuth, (req, res) => {
    try {
      const { message, type, userId } = req.body;
      
      if (userId) {
        // Send to specific user
        wsManager.sendToUser(userId.toString(), "notification", {
          message,
          type: type || "info",
          timestamp: new Date().toISOString()
        });
      } else {
        // Broadcast to all users
        wsManager.broadcast("notification", {
          message,
          type: type || "info",
          timestamp: new Date().toISOString()
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to send notification" });
    }
  });
  
  // Supplier routes
  app.get("/api/suppliers", requireAuth, async (req, res) => {
    try {
      const { category } = req.query;
      
      let suppliers;
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      
      if (category) {
        suppliers = await storage.getSuppliersByCategory(category as string, tenantFilter);
      } else {
        suppliers = await storage.getAllSuppliers(tenantFilter);
      }
      
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.get("/api/suppliers/:id", requireAuth, async (req, res) => {
    try {
      const supplierId = Number(req.params.id);
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      
      const supplier = await storage.getSupplier(supplierId, tenantFilter);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch supplier" });
    }
  });

  app.post("/api/suppliers", requireAuth, validateBody(insertSupplierSchema), async (req, res) => {
    try {
      const supplier = await storage.createSupplier({
        ...req.body,
        createdAt: new Date()
      });
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcast("supplier:created", {
          id: supplier.id,
          data: supplier,
          message: `New supplier added: ${supplier.name}`,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(201).json(supplier);
    } catch (error) {
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  app.put("/api/suppliers/:id", requireAuth, async (req, res) => {
    try {
      const supplierId = Number(req.params.id);
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      
      const supplier = await storage.getSupplier(supplierId, tenantFilter);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      const updatedSupplier = await storage.updateSupplier(supplierId, req.body);
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager && updatedSupplier) {
        wsManager.broadcast("supplier:updated", {
          id: updatedSupplier.id,
          data: updatedSupplier,
          message: `Supplier updated: ${updatedSupplier.name}`,
          timestamp: new Date().toISOString()
        });
      }
      
      res.json(updatedSupplier);
    } catch (error) {
      res.status(500).json({ message: "Failed to update supplier" });
    }
  });

  app.delete("/api/suppliers/:id", requireAuth, async (req, res) => {
    try {
      const supplierId = Number(req.params.id);
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      
      const supplier = await storage.getSupplier(supplierId, tenantFilter);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      const deleted = await storage.deleteSupplier(supplierId);
      
      if (deleted) {
        // Send real-time update to all connected clients
        const wsManager = getWebSocketManager();
        if (wsManager) {
          wsManager.broadcast("supplier:deleted", {
            id: supplierId,
            data: { id: supplierId, name: supplier.name },
            message: `Supplier deleted: ${supplier.name}`,
            timestamp: new Date().toISOString()
          });
        }
        
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete supplier" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });
  
  // Expense routes
  app.get("/api/expenses", requireAuth, async (req, res) => {
    try {
      const { category, projectId, supplierId, startDate, endDate } = req.query;
      
      let expenses;
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      
      if (category) {
        expenses = await storage.getExpensesByCategory(category as string, tenantFilter);
      } else if (projectId) {
        expenses = await storage.getExpensesByProject(Number(projectId), tenantFilter);
      } else if (supplierId) {
        expenses = await storage.getExpensesBySupplier(Number(supplierId), tenantFilter);
      } else if (startDate && endDate) {
        expenses = await storage.getExpensesByDateRange(
          new Date(startDate as string), 
          new Date(endDate as string),
          tenantFilter
        );
      } else {
        expenses = await storage.getAllExpenses(tenantFilter);
      }
      
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const expenseId = Number(req.params.id);
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      
      const expense = await storage.getExpense(expenseId, tenantFilter);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  app.post("/api/expenses", requireAuth, validateBody(insertExpenseSchema), async (req, res) => {
    try {
      const expense = await storage.createExpense({
        ...req.body,
        createdBy: req.user?.id,
        createdAt: new Date()
      });
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcast("expense:created", {
          id: expense.id,
          data: expense,
          message: `New expense added: ${expense.description} ($${expense.amount})`,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(201).json(expense);
    } catch (error) {
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.put("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const expenseId = Number(req.params.id);
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      
      const expense = await storage.getExpense(expenseId, tenantFilter);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      const updatedExpense = await storage.updateExpense(expenseId, req.body);
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager && updatedExpense) {
        wsManager.broadcast("expense:updated", {
          id: updatedExpense.id,
          data: updatedExpense,
          message: `Expense updated: ${updatedExpense.description} ($${updatedExpense.amount})`,
          timestamp: new Date().toISOString()
        });
      }
      
      res.json(updatedExpense);
    } catch (error) {
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const expenseId = Number(req.params.id);
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      
      const expense = await storage.getExpense(expenseId, tenantFilter);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      const deleted = await storage.deleteExpense(expenseId);
      
      if (deleted) {
        // Send real-time update to all connected clients
        const wsManager = getWebSocketManager();
        if (wsManager) {
          wsManager.broadcast("expense:deleted", {
            id: expenseId,
            data: { id: expenseId, description: expense.description },
            message: `Expense deleted: ${expense.description}`,
            timestamp: new Date().toISOString()
          });
        }
        
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete expense" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });
  
  // Purchase Order routes
  app.get("/api/purchase-orders", requireAuth, async (req, res) => {
    try {
      const { status, projectId, supplierId } = req.query;
      
      let purchaseOrders;
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      
      if (status) {
        purchaseOrders = await storage.getPurchaseOrdersByStatus(status as string, tenantFilter);
      } else if (projectId) {
        purchaseOrders = await storage.getPurchaseOrdersByProject(Number(projectId), tenantFilter);
      } else if (supplierId) {
        purchaseOrders = await storage.getPurchaseOrdersBySupplier(Number(supplierId), tenantFilter);
      } else {
        purchaseOrders = await storage.getAllPurchaseOrders(tenantFilter);
      }
      
      res.json(purchaseOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.get("/api/purchase-orders/:id", requireAuth, async (req, res) => {
    try {
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      const purchaseOrder = await storage.getPurchaseOrder(Number(req.params.id), tenantFilter);
      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      // Get purchase order items with tenant filtering
      const items = await storage.getPurchaseOrderItemsByPO(purchaseOrder.id, tenantFilter);
      
      res.json({ ...purchaseOrder, items });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch purchase order" });
    }
  });

  app.post("/api/purchase-orders", requireAuth, validateBody(insertPurchaseOrderSchema), async (req, res) => {
    try {
      // Extract items from the request body if present
      const { items, ...purchaseOrderData } = req.body;
      
      // Generate PO number
      console.log("Creating purchase order with body:", purchaseOrderData);
      const poNumber = `PO-${Date.now().toString().substr(-6)}`;
      
      // Create the purchase order without items first
      const purchaseOrder = await storage.createPurchaseOrder({
        ...purchaseOrderData,
        poNumber,
        createdBy: req.user?.id,
        status: purchaseOrderData.status || "draft"
      });
      
      console.log("Created purchase order:", purchaseOrder);
      
      // Now add items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        console.log("Adding items to purchase order:", items);
        
        for (const item of items) {
          await storage.createPurchaseOrderItem({
            purchaseOrderId: purchaseOrder.id,
            description: item.description || '',
            quantity: typeof item.quantity === 'number' ? item.quantity : 0,
            unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
            total: typeof item.total === 'number' ? item.total : 0,
            unit: item.unit || null,
            sku: item.sku || null,
            notes: item.notes || null,
            inventoryItemId: item.inventoryItemId || null,
            receivedQuantity: null
          });
        }
      }
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcast("purchase-order:created", {
          id: purchaseOrder.id,
          data: purchaseOrder,
          message: `New purchase order created: ${purchaseOrder.poNumber}`,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(201).json(purchaseOrder);
    } catch (error) {
      console.error("Failed to create purchase order:", error);
      res.status(500).json({ message: "Failed to create purchase order" });
    }
  });

  app.post("/api/purchase-orders/:id/items", requireAuth, validateBody(insertPurchaseOrderItemSchema), async (req, res) => {
    try {
      const purchaseOrderId = Number(req.params.id);
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      
      const purchaseOrder = await storage.getPurchaseOrder(purchaseOrderId, tenantFilter);
      
      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      const item = await storage.createPurchaseOrderItem({
        ...req.body,
        purchaseOrderId
      });
      
      // Update purchase order totals with tenant filtering
      const items = await storage.getPurchaseOrderItemsByPO(purchaseOrderId, tenantFilter);
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const total = subtotal; // Add tax calculation here if needed
      
      await storage.updatePurchaseOrder(purchaseOrderId, { subtotal, total });
      
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to add purchase order item" });
    }
  });

  app.put("/api/purchase-orders/:id", requireAuth, async (req, res) => {
    try {
      const purchaseOrderId = Number(req.params.id);
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      
      const purchaseOrder = await storage.getPurchaseOrder(purchaseOrderId, tenantFilter);
      
      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      const updatedPurchaseOrder = await storage.updatePurchaseOrder(purchaseOrderId, req.body);
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager && updatedPurchaseOrder) {
        // Prepare status change message if status has changed
        let message = `Purchase order updated: ${updatedPurchaseOrder.poNumber}`;
        if (purchaseOrder.status !== updatedPurchaseOrder.status) {
          message = `Purchase order ${updatedPurchaseOrder.poNumber} status changed to ${updatedPurchaseOrder.status}`;
        }
        
        wsManager.broadcast("purchase-order:updated", {
          id: updatedPurchaseOrder.id,
          data: updatedPurchaseOrder,
          message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.json(updatedPurchaseOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to update purchase order" });
    }
  });

  app.delete("/api/purchase-orders/:id", requireAuth, async (req, res) => {
    try {
      const purchaseOrderId = Number(req.params.id);
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      
      const purchaseOrder = await storage.getPurchaseOrder(purchaseOrderId, tenantFilter);
      
      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      // Delete associated purchase order items first with tenant filtering
      const items = await storage.getPurchaseOrderItemsByPO(purchaseOrderId, tenantFilter);
      for (const item of items) {
        await storage.deletePurchaseOrderItem(item.id);
      }
      
      const deleted = await storage.deletePurchaseOrder(purchaseOrderId);
      
      if (deleted) {
        // Send real-time update to all connected clients
        const wsManager = getWebSocketManager();
        if (wsManager) {
          wsManager.broadcast("purchase-order:deleted", {
            id: purchaseOrderId,
            data: { id: purchaseOrderId, poNumber: purchaseOrder.poNumber },
            message: `Purchase order deleted: ${purchaseOrder.poNumber}`,
            timestamp: new Date().toISOString()
          });
        }
        
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete purchase order" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete purchase order" });
    }
  });
  
  // Purchase Order PDF generation and email
  app.get("/api/purchase-orders/:id/pdf", requireAuth, async (req, res) => {
    try {
      const purchaseOrderId = Number(req.params.id);
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      const purchaseOrder = await storage.getPurchaseOrder(purchaseOrderId, tenantFilter);
      
      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(purchaseOrder.createdBy)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const items = await storage.getPurchaseOrderItemsByPO(purchaseOrderId, tenantFilter);
      
      console.log(`Generating PDF for PO_${purchaseOrder.poNumber}`);
      
      // Generate PDF using the PDFService
      const pdfBuffer = await PDFService.generatePurchaseOrderPDF({
        ...purchaseOrder,
        items
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=PO_${purchaseOrder.poNumber}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating purchase order PDF:', error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });
  
  app.post("/api/purchase-orders/:id/email", requireAuth, async (req, res) => {
    try {
      const purchaseOrderId = Number(req.params.id);
      const { recipientEmail, subject, message, includePdf = true } = req.body;
      
      console.log('Email request:', { purchaseOrderId, recipientEmail, subject, hasMessage: !!message, includePdf });
      
      if (!recipientEmail) {
        return res.status(400).json({ message: "Recipient email is required" });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      const purchaseOrder = await storage.getPurchaseOrder(purchaseOrderId, tenantFilter);
      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      // Check if user has access to this resource
      if (req.isTenantResource && !req.isTenantResource(purchaseOrder.createdBy)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const items = await storage.getPurchaseOrderItemsByPO(purchaseOrderId, tenantFilter);
      console.log(`Retrieved ${items.length} items for purchase order ${purchaseOrderId}`);
      
      // Get company settings for sender email
      const companySettings = await storage.getCompanySettings();
      const senderEmail = companySettings?.email || 'noreply@example.com';
      
      console.log(`Sending email from ${senderEmail} to ${recipientEmail}`);
      
      // Check SendGrid API key
      if (!process.env.SENDGRID_API_KEY) {
        console.error('SendGrid API key not configured. Please set SENDGRID_API_KEY environment variable.');
        return res.status(500).json({ message: "Email service not properly configured" });
      }
      
      // Send email with PDF using EmailService
      const success = await EmailService.sendPurchaseOrder(
        { ...purchaseOrder, items },
        recipientEmail,
        senderEmail,
        { subject, message, includePdf }
      );
      
      if (success) {
        res.json({ message: "Purchase order sent successfully via email" });
      } else {
        res.status(500).json({ message: "Failed to send purchase order via email" });
      }
    } catch (error) {
      console.error('Error emailing purchase order:', error);
      res.status(500).json({ message: "Failed to send purchase order via email" });
    }
  });

  // Inventory Item routes
  app.get("/api/inventory", requireAuth, async (req, res) => {
    try {
      const { category, supplierId, lowStock } = req.query;
      
      let inventoryItems;
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      
      if (category) {
        inventoryItems = await storage.getInventoryItemsByCategory(category as string, tenantFilter);
      } else if (supplierId) {
        inventoryItems = await storage.getInventoryItemsBySupplier(Number(supplierId), tenantFilter);
      } else if (lowStock === 'true') {
        inventoryItems = await storage.getLowStockItems(tenantFilter);
      } else {
        inventoryItems = await storage.getAllInventoryItems(tenantFilter);
      }
      
      res.json(inventoryItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory items" });
    }
  });

  app.get("/api/inventory/:id", requireAuth, async (req, res) => {
    try {
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      const inventoryItem = await storage.getInventoryItem(Number(req.params.id), tenantFilter);
      if (!inventoryItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      // Get inventory transactions for this item
      const transactions = await storage.getInventoryTransactionsByItem(inventoryItem.id, tenantFilter);
      
      res.json({ ...inventoryItem, transactions });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory item" });
    }
  });

  app.post("/api/inventory", requireAuth, validateBody(insertInventoryItemSchema), async (req, res) => {
    try {
      // Add tenant ID if available
      const tenantData = req.tenantId ? { tenantId: req.tenantId } : {};
      
      const inventoryItem = await storage.createInventoryItem({
        ...req.body,
        ...tenantData,
        createdBy: req.user?.id
      });
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcast("inventory:created", {
          id: inventoryItem.id,
          data: inventoryItem,
          message: `New inventory item added: ${inventoryItem.name}`,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(201).json(inventoryItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  app.put("/api/inventory/:id", requireAuth, async (req, res) => {
    try {
      const inventoryItemId = Number(req.params.id);
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      const inventoryItem = await storage.getInventoryItem(inventoryItemId, tenantFilter);
      
      if (!inventoryItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      const updatedInventoryItem = await storage.updateInventoryItem(inventoryItemId, req.body);
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager && updatedInventoryItem) {
        wsManager.broadcast("inventory:updated", {
          id: updatedInventoryItem.id,
          data: updatedInventoryItem,
          message: `Inventory item updated: ${updatedInventoryItem.name}`,
          timestamp: new Date().toISOString()
        });
      }
      
      res.json(updatedInventoryItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  app.delete("/api/inventory/:id", requireAuth, async (req, res) => {
    try {
      const inventoryItemId = Number(req.params.id);
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      const inventoryItem = await storage.getInventoryItem(inventoryItemId, tenantFilter);
      
      if (!inventoryItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      // Check if there are transactions for this item
      const transactions = await storage.getInventoryTransactionsByItem(inventoryItemId, tenantFilter);
      if (transactions.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete inventory item with existing transactions" 
        });
      }
      
      const deleted = await storage.deleteInventoryItem(inventoryItemId);
      
      if (deleted) {
        // Send real-time update to all connected clients
        const wsManager = getWebSocketManager();
        if (wsManager) {
          wsManager.broadcast("inventory:deleted", {
            id: inventoryItemId,
            data: { id: inventoryItemId, name: inventoryItem.name },
            message: `Inventory item deleted: ${inventoryItem.name}`,
            timestamp: new Date().toISOString()
          });
        }
        
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete inventory item" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  // Inventory Transaction routes
  app.post("/api/inventory-transactions", requireAuth, validateBody(insertInventoryTransactionSchema), async (req, res) => {
    try {
      // Add tenant ID if available
      const tenantData = req.tenantId ? { tenantId: req.tenantId } : {};
      
      const transaction = await storage.createInventoryTransaction({
        ...req.body,
        ...tenantData,
        createdBy: req.user?.id
      });
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager) {
        const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
        const inventoryItem = await storage.getInventoryItem(transaction.inventoryItemId, tenantFilter);
        const itemName = inventoryItem ? inventoryItem.name : 'Unknown item';
        
        wsManager.broadcast("inventory-transaction:created", {
          id: transaction.id,
          data: transaction,
          message: `Inventory transaction: ${transaction.transactionType} for ${itemName}`,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(201).json(transaction);
    } catch (error) {
      res.status(500).json({ message: "Failed to create inventory transaction" });
    }
  });

  app.get("/api/inventory-transactions", requireAuth, async (req, res) => {
    try {
      const { 
        inventoryItemId, 
        projectId, 
        purchaseOrderId, 
        type, 
        startDate, 
        endDate 
      } = req.query;
      
      let transactions;
      const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
      
      if (inventoryItemId) {
        transactions = await storage.getInventoryTransactionsByItem(Number(inventoryItemId), tenantFilter);
      } else if (projectId) {
        transactions = await storage.getInventoryTransactionsByProject(Number(projectId), tenantFilter);
      } else if (purchaseOrderId) {
        transactions = await storage.getInventoryTransactionsByPO(Number(purchaseOrderId), tenantFilter);
      } else if (type) {
        transactions = await storage.getInventoryTransactionsByType(type as string, tenantFilter);
      } else if (startDate && endDate) {
        transactions = await storage.getInventoryTransactionsByDateRange(
          new Date(startDate as string), 
          new Date(endDate as string),
          tenantFilter
        );
      } else {
        // This might return a lot of data, consider pagination
        const inventoryItems = await storage.getAllInventoryItems(tenantFilter);
        transactions = [];
        
        for (const item of inventoryItems) {
          const itemTransactions = await storage.getInventoryTransactionsByItem(item.id, tenantFilter);
          transactions.push(...itemTransactions);
        }
      }
      
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory transactions" });
    }
  });

  app.get("/api/company-settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getCompanySettings();
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch company settings" });
    }
  });
  
  // New API endpoints for settings
  app.get("/api/settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getCompanySettings();
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch company settings" });
    }
  });
  
  app.get("/api/settings/company", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getCompanySettings();
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch company settings" });
    }
  });
  
  app.get("/api/settings/system", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });
  
  app.post("/api/settings/system", requireAuth, async (req, res) => {
    try {
      const settings = await storage.createSystemSettings({
        ...req.body,
        updatedBy: req.user?.id
      });
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcast("settings:updated", {
          data: settings,
          message: "System settings updated",
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(201).json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to create system settings" });
    }
  });
  
  app.post("/api/company-settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.createCompanySettings({
        ...req.body,
        updatedBy: req.user?.id
      });
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcast("settings:updated", {
          data: settings,
          message: "Company settings updated",
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(201).json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to create company settings" });
    }
  });
  
  // New API endpoint that matches useSettings hook - redirects to /api/company-settings
  app.post("/api/settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.createCompanySettings({
        ...req.body,
        updatedBy: req.user?.id
      });
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcast("settings:updated", {
          data: settings,
          message: "Company settings updated",
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(201).json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to create company settings" });
    }
  });
  
  app.put("/api/company-settings/:id", requireAuth, async (req, res) => {
    try {
      const settingsId = Number(req.params.id);
      const settings = await storage.getCompanySettings();
      
      if (!settings || settings.id !== settingsId) {
        return res.status(404).json({ message: "Company settings not found" });
      }
      
      const updatedSettings = await storage.updateCompanySettings(settingsId, req.body);
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager && updatedSettings) {
        wsManager.broadcast("settings:updated", {
          data: updatedSettings,
          message: "Company settings updated",
          timestamp: new Date().toISOString()
        });
      }
      
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update company settings" });
    }
  });
  
  // Add PATCH endpoint for company settings without ID (for direct updates from settings page)
  app.patch("/api/settings/company", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getCompanySettings();
      
      // If no settings exist yet, create them instead of updating
      if (!settings) {
        const newSettings = await storage.createCompanySettings({
          ...req.body,
          createdBy: req.user?.id
        });
        
        return res.status(201).json(newSettings);
      }
      
      // Update existing settings
      const updatedSettings = await storage.updateCompanySettings(settings.id, {
        ...req.body,
        updatedBy: req.user?.id
      });
      
      res.json(updatedSettings);
    } catch (error) {
      console.error("Failed to update company settings:", error);
      res.status(500).json({ message: "Failed to update company settings" });
    }
  });
  
  // PATCH endpoint for company settings with ID parameter
  app.patch("/api/settings/company/:id", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getCompanySettings();
      
      // If no settings exist yet, create them instead of updating
      if (!settings) {
        const newSettings = await storage.createCompanySettings({
          ...req.body,
          createdBy: req.user?.id
        });
        
        return res.status(201).json(newSettings);
      }
      
      // Update existing settings
      const updatedSettings = await storage.updateCompanySettings(settings.id, {
        ...req.body,
        updatedBy: req.user?.id
      });
      
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update company settings" });
    }
  });
  
  // Add PATCH endpoint for system settings without ID (for direct updates from settings page)
  app.patch("/api/settings/system", requireAuth, async (req, res) => {
    try {
      console.log("Patching system settings:", req.body);
      const settings = await storage.getSystemSettings();
      
      // If no settings exist yet, create them instead of updating
      if (!settings) {
        console.log("No system settings found, creating new ones");
        const newSettings = await storage.createSystemSettings({
          ...req.body,
          updatedBy: req.user?.id
        });
        
        return res.status(201).json(newSettings);
      }
      
      // Update existing settings
      console.log("Updating existing system settings with ID:", settings.id);
      const updatedSettings = await storage.updateSystemSettings(settings.id, {
        ...req.body,
        updatedBy: req.user?.id
      });
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager && updatedSettings) {
        wsManager.broadcast("settings:updated", {
          id: updatedSettings.id,
          data: updatedSettings,
          message: "System settings updated"
        });
      }
      
      res.json(updatedSettings);
    } catch (error) {
      console.error("Failed to update system settings:", error);
      res.status(500).json({ message: "Failed to update system settings" });
    }
  });
  
  // PATCH endpoint for system settings with ID parameter
  app.patch("/api/settings/system/:id", requireAuth, async (req, res) => {
    try {
      console.log("Patching system settings with ID param:", req.body);
      const settings = await storage.getSystemSettings();
      
      // If no settings exist yet, create them instead of updating
      if (!settings) {
        console.log("No system settings found with ID, creating new ones");
        const newSettings = await storage.createSystemSettings({
          ...req.body,
          updatedBy: req.user?.id
        });
        
        return res.status(201).json(newSettings);
      }
      
      // Update existing settings
      console.log("Updating existing system settings with ID:", settings.id);
      const updatedSettings = await storage.updateSystemSettings(settings.id, {
        ...req.body,
        updatedBy: req.user?.id
      });
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager && updatedSettings) {
        wsManager.broadcast("settings:updated", {
          id: updatedSettings.id,
          data: updatedSettings,
          message: "System settings updated"
        });
      }
      
      res.json(updatedSettings);
    } catch (error) {
      console.error("Failed to update system settings with ID:", error);
      res.status(500).json({ message: "Failed to update system settings" });
    }
  });
  
  // Original legacy endpoint - keep for backward compatibility
  app.patch("/api/settings/:id", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getCompanySettings();
      
      // If no settings exist yet, create them instead of updating
      if (!settings) {
        const newSettings = await storage.createCompanySettings({
          ...req.body,
          createdBy: req.user?.id
        });
        
        // Send real-time update to all connected clients
        const wsManager = getWebSocketManager();
        if (wsManager && newSettings) {
          wsManager.broadcast("settings:updated", {
            id: newSettings.id,
            data: newSettings,
            message: "Company settings created"
          });
        }
        
        return res.status(201).json(newSettings);
      }
      
      // Update existing settings regardless of the ID in the URL
      // This handles the singleton pattern correctly
      const updatedSettings = await storage.updateCompanySettings(settings.id, {
        ...req.body,
        updatedBy: req.user?.id
      });
      
      // Send real-time update to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager && updatedSettings) {
        wsManager.broadcast("settings:updated", {
          id: updatedSettings.id,
          data: updatedSettings,
          message: "Company settings updated"
        });
      }
      
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update company settings" });
    }
  });

  // TEST ROUTE FOR DEBUGGING - To confirm server restart is working
  app.get("/api/test-debug", async (req, res) => {
    console.log("TEST DEBUG ROUTE ACCESSED - SERVER RESTART CONFIRMED");
    res.json({ success: true, message: "Test route works, server has restarted" });
  });
  
  return httpServer;
}
