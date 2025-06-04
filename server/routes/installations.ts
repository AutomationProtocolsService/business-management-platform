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
router.post('/', requireAuth, async (req, res, next) => {
  console.log('▶️ /installations POST endpoint hit');
  console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const tenantId = (req as any).tenantId;
    console.log('🏢 Tenant ID from request:', tenantId);
    
    if (!tenantId) {
      console.log('❌ No tenant ID available');
      return res.status(400).json({ message: "No tenant context available" });
    }

    // Add quoteId from URL params if not in body
    if (req.params.quoteId && !req.body.quoteId) {
      req.body.quoteId = parseInt(req.params.quoteId, 10);
      console.log('📝 Added quoteId from params:', req.body.quoteId);
    }

    console.log('🔍 Validating installation data with schema...');

    // Validate request body
    const validationResult = insertInstallationSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.log('❌ Validation failed:', validationResult.error.issues);
      return res.status(400).json({ 
        message: "Invalid installation data", 
        errors: validationResult.error.format()
      });
    }
    
    console.log('✅ Validation passed. Validated data:', validationResult.data);

    const { quoteId, projectId, scheduledDate, startTime, endTime, assignedTo, status, notes } = validationResult.data;

    // For installation forms without a quoteId, we can still create the installation
    let quote = null;
    if (quoteId) {
      // Verify that the quote exists and belongs to this tenant
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
          message: "Cannot schedule an installation for a quote that is not in 'accepted' status" 
        });
      }
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
          projectId,
          quoteId: quoteId || null,
          scheduledDate: formattedDate,
          startTime: startTime || null,
          endTime: endTime || null,
          assignedTo: teamMembers,
          status: status || 'scheduled',
          notes: notes || null,
          createdBy: (req as any).user?.id || null
        })
        .returning();

      // 2. Update the quote status to 'installation_booked' if there's a quote
      if (quote && quoteId) {
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

        return { 
          installation: newInstallation[0],
          quote: updatedQuote
        };
      }

      // Return just installation data if no quote
      return { 
        installation: newInstallation[0]
      };
    });

    console.log('✅ Installation created successfully:', result);
    res.status(201).json(result);
  } catch (error) {
    console.error('🛑 Failed in /installations POST:', error);
    console.error('🛑 Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    next(error); // Forward to Express error handler
  }
});

export default router;