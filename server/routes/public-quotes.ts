import { Express, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { storage } from "../storage";
import { db } from "../db";
import { quotes, quoteItems, customers, projects, tenants } from "../../shared/schema";

/**
 * Register public quote routes (no authentication required)
 */
export function registerPublicQuoteRoutes(app: Express) {
  
  // Get quote by quote number (public)
  app.get("/api/quotes/public/:quoteNumber", async (req: Request, res: Response) => {
    try {
      const { quoteNumber } = req.params;
      
      // Find quote by quote number from any active tenant
      const quote = await db
        .select()
        .from(quotes)
        .innerJoin(tenants, eq(quotes.tenantId, tenants.id))
        .where(and(
          eq(quotes.quoteNumber, quoteNumber),
          eq(tenants.active, true)
        ))
        .limit(1);
        
      if (quote.length === 0) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Only allow viewing quotes that are sent or later in the process
      const quoteData = quote[0].quotes;
      if (quoteData.status === 'draft') {
        return res.status(404).json({ message: "Quote not available" });
      }
      
      res.json(quoteData);
    } catch (error) {
      console.error("Error fetching public quote:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get quote items (public)
  app.get("/api/quotes/public/:quoteNumber/items", async (req: Request, res: Response) => {
    try {
      const { quoteNumber } = req.params;
      
      // First find the quote
      const quote = await db
        .select()
        .from(quotes)
        .innerJoin(tenants, eq(quotes.tenantId, tenants.id))
        .where(and(
          eq(quotes.quoteNumber, quoteNumber),
          eq(tenants.active, true)
        ))
        .limit(1);
        
      if (quote.length === 0) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      const quoteData = quote[0].quotes;
      if (quoteData.status === 'draft') {
        return res.status(404).json({ message: "Quote not available" });
      }
      
      // Get quote items
      const items = await db
        .select()
        .from(quoteItems)
        .where(eq(quoteItems.quoteId, quoteData.id));
        
      res.json(items);
    } catch (error) {
      console.error("Error fetching public quote items:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get customer info (public - limited info)
  app.get("/api/quotes/public/:quoteNumber/customer", async (req: Request, res: Response) => {
    try {
      const { quoteNumber } = req.params;
      
      // Find quote with customer
      const quote = await db
        .select()
        .from(quotes)
        .innerJoin(tenants, eq(quotes.tenantId, tenants.id))
        .leftJoin(customers, eq(quotes.customerId, customers.id))
        .where(and(
          eq(quotes.quoteNumber, quoteNumber),
          eq(tenants.active, true)
        ))
        .limit(1);
        
      if (quote.length === 0) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      const quoteData = quote[0].quotes;
      if (quoteData.status === 'draft') {
        return res.status(404).json({ message: "Quote not available" });
      }
      
      const customer = quote[0].customers;
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Return limited customer info for public view
      res.json({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        zipCode: customer.zipCode,
        country: customer.country
      });
    } catch (error) {
      console.error("Error fetching public quote customer:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get project info (public)
  app.get("/api/quotes/public/:quoteNumber/project", async (req: Request, res: Response) => {
    try {
      const { quoteNumber } = req.params;
      
      // Find quote with project
      const quote = await db
        .select()
        .from(quotes)
        .innerJoin(tenants, eq(quotes.tenantId, tenants.id))
        .leftJoin(projects, eq(quotes.projectId, projects.id))
        .where(and(
          eq(quotes.quoteNumber, quoteNumber),
          eq(tenants.active, true)
        ))
        .limit(1);
        
      if (quote.length === 0) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      const quoteData = quote[0].quotes;
      if (quoteData.status === 'draft') {
        return res.status(404).json({ message: "Quote not available" });
      }
      
      const project = quote[0].projects;
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Return project info
      res.json({
        id: project.id,
        name: project.name,
        description: project.description
      });
    } catch (error) {
      console.error("Error fetching public quote project:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get company settings (public)
  app.get("/api/quotes/public/:quoteNumber/company", async (req: Request, res: Response) => {
    try {
      const { quoteNumber } = req.params;
      
      // Find quote to get tenant
      const quote = await db
        .select()
        .from(quotes)
        .innerJoin(tenants, eq(quotes.tenantId, tenants.id))
        .where(and(
          eq(quotes.quoteNumber, quoteNumber),
          eq(tenants.active, true)
        ))
        .limit(1);
        
      if (quote.length === 0) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      const quoteData = quote[0].quotes;
      if (quoteData.status === 'draft') {
        return res.status(404).json({ message: "Quote not available" });
      }
      
      const tenant = quote[0].tenants;
      
      // Return company info from tenant
      res.json({
        id: tenant.id,
        companyName: tenant.companyName || tenant.name,
        address: "", // Add if needed
        city: "",
        state: "",
        zipCode: "",
        country: "",
        phone: tenant.contactPhone,
        email: tenant.contactEmail,
        website: "",
        companyLogo: tenant.logoUrl
      });
    } catch (error) {
      console.error("Error fetching public quote company:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Accept quote (public)
  app.post("/api/quotes/public/:quoteNumber/accept", async (req: Request, res: Response) => {
    try {
      const { quoteNumber } = req.params;
      const { acceptorName } = req.body;
      
      if (!acceptorName || !acceptorName.trim()) {
        return res.status(400).json({ message: "Acceptor name is required" });
      }
      
      // Find quote
      const quote = await db
        .select()
        .from(quotes)
        .innerJoin(tenants, eq(quotes.tenantId, tenants.id))
        .where(and(
          eq(quotes.quoteNumber, quoteNumber),
          eq(tenants.active, true)
        ))
        .limit(1);
        
      if (quote.length === 0) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      const quoteData = quote[0].quotes;
      
      // Only allow accepting quotes that are sent and not expired
      if (quoteData.status !== 'sent') {
        return res.status(400).json({ message: "Quote cannot be accepted in its current state" });
      }
      
      // Check if expired
      if (quoteData.expiryDate && new Date(quoteData.expiryDate) < new Date()) {
        return res.status(400).json({ message: "Quote has expired" });
      }
      
      // Update quote to accepted
      const updatedQuote = await db
        .update(quotes)
        .set({
          status: 'accepted',
          clientAcceptedAt: new Date(),
          clientAcceptedBy: acceptorName.trim()
        })
        .where(eq(quotes.id, quoteData.id))
        .returning();
        
      if (updatedQuote.length === 0) {
        return res.status(500).json({ message: "Failed to accept quote" });
      }
      
      // TODO: Send notification email to company
      
      res.json({ 
        message: "Quote accepted successfully",
        quote: updatedQuote[0]
      });
    } catch (error) {
      console.error("Error accepting public quote:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Decline quote (public)
  app.post("/api/quotes/public/:quoteNumber/decline", async (req: Request, res: Response) => {
    try {
      const { quoteNumber } = req.params;
      const { reason } = req.body;
      
      // Find quote
      const quote = await db
        .select()
        .from(quotes)
        .innerJoin(tenants, eq(quotes.tenantId, tenants.id))
        .where(and(
          eq(quotes.quoteNumber, quoteNumber),
          eq(tenants.active, true)
        ))
        .limit(1);
        
      if (quote.length === 0) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      const quoteData = quote[0].quotes;
      
      // Only allow declining quotes that are sent
      if (quoteData.status !== 'sent') {
        return res.status(400).json({ message: "Quote cannot be declined in its current state" });
      }
      
      // Update quote to rejected
      const updatedQuote = await db
        .update(quotes)
        .set({
          status: 'rejected',
          clientRejectedAt: new Date(),
          notes: reason ? `Client decline reason: ${reason}` : quoteData.notes
        })
        .where(eq(quotes.id, quoteData.id))
        .returning();
        
      if (updatedQuote.length === 0) {
        return res.status(500).json({ message: "Failed to decline quote" });
      }
      
      // TODO: Send notification email to company
      
      res.json({ 
        message: "Quote declined successfully",
        quote: updatedQuote[0]
      });
    } catch (error) {
      console.error("Error declining public quote:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Download PDF (public)
  app.get("/api/quotes/public/:quoteNumber/pdf", async (req: Request, res: Response) => {
    try {
      const { quoteNumber } = req.params;
      
      // Find quote
      const quote = await db
        .select()
        .from(quotes)
        .innerJoin(tenants, eq(quotes.tenantId, tenants.id))
        .where(and(
          eq(quotes.quoteNumber, quoteNumber),
          eq(tenants.active, true)
        ))
        .limit(1);
        
      if (quote.length === 0) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      const quoteData = quote[0].quotes;
      if (quoteData.status === 'draft') {
        return res.status(404).json({ message: "Quote not available" });
      }
      
      // Use the existing PDF service to generate PDF
      // For now, redirect to the existing PDF endpoint with proper authentication context
      // TODO: Implement proper public PDF generation or create a temporary token
      
      // For now, return an error message suggesting they contact the company
      res.status(501).json({ 
        message: "PDF download not yet implemented for public access. Please contact the company for a copy." 
      });
      
    } catch (error) {
      console.error("Error downloading public quote PDF:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}