import express from 'express';
import { z } from 'zod';
import { db } from '../db';
import { quotes, installations, projects } from '../../shared/schema';
import { insertInstallationSchema } from '../../shared/schema';
import { and, eq } from 'drizzle-orm';

// Authentication middleware
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!(req as any).user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

const router = express.Router();

// POST /api/installations - Create a new installation
router.post('/', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context available" });
    }

    // Add quoteId from URL params if not in body
    if (req.params.quoteId && !req.body.quoteId) {
      req.body.quoteId = parseInt(req.params.quoteId, 10);
    }

    console.log('Installation request body:', JSON.stringify(req.body));

    // Validate request body
    const validationResult = insertInstallationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid installation data", 
        errors: validationResult.error.format()
      });
    }

    const { quoteId, scheduledDate, assignedTo, status, notes } = validationResult.data;

    // Verify that the quote exists and belongs to this tenant
    const quote = await db.query.quotes.findFirst({
      where: and(
        eq(quotes.id, quoteId),
        eq(quotes.tenantId, tenantId)
      )
    });

    if (!quote) {
      return res.status(404).json({ message: "Quote not found" });
    }

    // Verify that the quote is in 'accepted' status
    if (quote.status !== 'accepted') {
      return res.status(400).json({ 
        message: "Cannot schedule an installation for a quote that is not in 'accepted' status" 
      });
    }

    // Make sure date is a string in ISO format (YYYY-MM-DD)
    let formattedDate: string;
    if (typeof scheduledDate === 'string') {
      formattedDate = scheduledDate;
    } else if (scheduledDate instanceof Date) {
      formattedDate = scheduledDate.toISOString().split('T')[0];
    } else {
      formattedDate = new Date().toISOString().split('T')[0];
    }

    // Execute in a transaction
    const result = await db.transaction(async (tx) => {
      // Create the installation - ensure we have empty array for assignedTo
      const teamMembers = Array.isArray(assignedTo) ? assignedTo : [];
      
      // 1. Create the installation
      const newInstallation = await tx.insert(installations)
        .values({
          tenantId,
          projectId: quote.projectId,
          quoteId,
          scheduledDate: formattedDate, // Convert to proper string format for PostgreSQL
          assignedTo: teamMembers,
          status: status || 'scheduled',
          notes: notes || null,
          createdBy: (req as any).user?.id || null
        })
        .returning();

      // 2. Update the quote status to 'installation_booked'
      await tx.update(quotes)
        .set({
          status: 'installation_booked',
          updatedAt: new Date()
        })
        .where(and(
          eq(quotes.id, quoteId),
          eq(quotes.tenantId, tenantId)
        ));

      // Fetch the updated quote
      const updatedQuote = await tx.query.quotes.findFirst({
        where: and(
          eq(quotes.id, quoteId),
          eq(quotes.tenantId, tenantId)
        )
      });

      // Return both installation and updated quote data for frontend
      return { 
        installation: newInstallation[0],
        quote: updatedQuote
      };
    });

    // Return success response
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating installation:', error);
    res.status(500).json({ message: "Failed to create installation", error: (error as Error).message });
  }
});

export default router;