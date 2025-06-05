import express from 'express';
import { z } from 'zod';
import { db } from '../db';
import { quotes, surveys } from '../../shared/schema';
import { insertSurveySchema } from '../../shared/schema';
import { and, eq, sql } from 'drizzle-orm';

// Authentication middleware
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!(req as any).user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

const router = express.Router();

// POST /api/surveys - Create a new survey
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

    console.log('Survey request body:', JSON.stringify(req.body));

    // Validate request body
    const validationResult = insertSurveySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid survey data", 
        errors: validationResult.error.format()
      });
    }

    const { quoteId, projectId, scheduledDate, assignedTo, status, notes } = validationResult.data;

    let quote = null;
    let finalProjectId = projectId;

    // If quoteId is provided, verify that the quote exists and belongs to this tenant
    if (quoteId) {
      quote = await db.query.quotes.findFirst({
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
          message: "Cannot schedule a survey for a quote that is not in 'accepted' status" 
        });
      }

      // Use the quote's projectId if available
      finalProjectId = quote.projectId;
    }

    // Ensure we have a projectId either from the request or from the quote
    if (!finalProjectId) {
      return res.status(400).json({ message: "Project ID is required" });
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
      // 1. Create the survey
      const newSurvey = await tx.insert(surveys)
        .values({
          tenantId,
          projectId: finalProjectId,
          quoteId: quoteId || null,
          scheduledDate: formattedDate, // Use the properly formatted date string
          assignedTo: typeof assignedTo === 'number' ? assignedTo : null,
          status: status || 'scheduled',
          notes: notes || null,
          createdBy: (req as any).user?.id || null
        })
        .returning();

      // 2. Update the quote status to 'survey_booked' (only if there's a quote)
      let updatedQuote = null;
      if (quoteId && quote) {
        await tx.update(quotes)
          .set({
            status: 'survey_booked',
            updatedAt: new Date()
          })
          .where(and(
            eq(quotes.id, quoteId),
            eq(quotes.tenantId, tenantId)
          ));

        // Fetch the updated quote
        updatedQuote = await tx.query.quotes.findFirst({
          where: and(
            eq(quotes.id, quoteId),
            eq(quotes.tenantId, tenantId)
          )
        });
      }

      // Return both survey and updated quote data for frontend
      return { 
        survey: newSurvey[0],
        quote: updatedQuote
      };
    });

    // Return success response with status 201 (Created)
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating survey:', error);
    res.status(500).json({ message: "Failed to create survey", error: (error as Error).message });
  }
});

export default router;