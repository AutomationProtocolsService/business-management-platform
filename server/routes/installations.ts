import express from 'express';
import { z } from 'zod';
import { db } from '../db';
import { quotes, installations, projects } from '../../shared/schema';
import { insertInstallationSchema } from '../../shared/schema';
import { and, eq } from 'drizzle-orm';
import { requireAuth } from '../auth';

const router = express.Router();

// POST /api/installations - Create a new installation
router.post('/', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context available" });
    }

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

    // Execute in a transaction
    const result = await db.transaction(async (tx) => {
      // Create the installation
      const newInstallation = await tx.insert(installations)
        .values({
          tenantId,
          projectId: quote.projectId,
          quoteId,
          scheduledDate: new Date(scheduledDate),
          assignedTo: assignedTo || null,
          status: status || 'scheduled',
          notes: notes || null,
          createdBy: (req as any).user?.id || null
        })
        .returning();

      return newInstallation[0];
    });

    // Return success response
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating installation:', error);
    res.status(500).json({ message: "Failed to create installation", error: (error as Error).message });
  }
});

export default router;