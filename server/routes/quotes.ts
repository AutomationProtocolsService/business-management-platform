import { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { quotes, invoices, quoteItems, invoiceItems } from "../../shared/schema";
import { storage } from "../storage";
import { getWebSocketManager } from "../websocket";

/**
 * Helper to get the tenant ID from a request
 */
function getTenantIdFromRequest(req: Request): number | undefined {
  return req.tenant?.id;
}

/**
 * Register quote-related routes
 */
export function registerQuoteRoutes(app: any) {
  // Convert quote to invoice with transaction
  app.post("/api/quotes/:id/convert-to-invoice", async (req: Request, res: Response) => {
    try {
      const quoteId = Number(req.params.id);
      const tenantId = getTenantIdFromRequest(req);
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }
      
      // Fetch quote with tenant context
      const quote = await storage.getQuote(quoteId, tenantId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Verify quote status - only accepted quotes can be converted
      if (quote.status !== "accepted") {
        return res.status(400).json({ 
          message: "Only accepted quotes can be converted to invoices",
          currentStatus: quote.status
        });
      }
      
      // Get quote items
      const quoteItemsList = await storage.getQuoteItemsByQuote(quoteId);
      
      // Use a transaction to ensure data consistency
      const invoice = await db.transaction(async (tx) => {
        // Generate invoice number with timestamp to ensure uniqueness
        const invoiceNumber = `INV-${Date.now().toString().substring(7)}`;
        
        // Calculate dates
        const currentDate = new Date();
        const dueDate = new Date(currentDate);
        dueDate.setDate(dueDate.getDate() + 30); // 30 days from now
        
        // Format dates as strings in YYYY-MM-DD format for PostgreSQL
        const issueDateStr = currentDate.toISOString().split('T')[0];
        const dueDateStr = dueDate.toISOString().split('T')[0];
        
        // Create the invoice
        const [newInvoice] = await tx.insert(invoices)
          .values({
            tenantId,
            invoiceNumber,
            quoteId,
            projectId: quote.projectId || null,
            customerId: quote.customerId || null,
            type: "final",
            issueDate: issueDateStr,
            dueDate: dueDateStr,
            status: "issued",
            subtotal: quote.subtotal || 0,
            tax: quote.tax || 0,
            discount: quote.discount || 0,
            total: quote.total || 0,
            notes: quote.notes || "",
            terms: quote.terms || "",
            createdBy: req.user?.id || null
          })
          .returning();
        
        // Copy quote items to invoice items
        for (const item of quoteItemsList) {
          await tx.insert(invoiceItems)
            .values({
              invoiceId: newInvoice.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              catalogItemId: item.catalogItemId
            });
        }
        
        // Update quote status to converted
        await tx.update(quotes)
          .set({ status: "converted" })
          .where(and(
            eq(quotes.id, quoteId),
            eq(quotes.tenantId, tenantId)
          ));
        
        return newInvoice;
      });
      
      // Send real-time update to clients
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcast("invoice:created", {
          id: invoice.id,
          message: `Invoice created from quote #${quote.quoteNumber}`,
          tenantId
        }, tenantId);
      }
      
      // Return the created invoice
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error converting quote to invoice:", error);
      res.status(500).json({ 
        message: "Failed to convert quote to invoice",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}