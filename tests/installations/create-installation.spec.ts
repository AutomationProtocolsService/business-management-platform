import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { db } from '../../server/db';
import * as auth from '../../server/auth';
import installationsRouter from '../../server/routes/installations';
import request from 'supertest';
import { quotes, installations } from '../../shared/schema';
import { eq } from 'drizzle-orm';

describe('Installation API', () => {
  let app: express.Express;
  let testQuoteId: number;
  let mockUser = {
    id: 999,
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
    tenantId: 1
  };

  // Setup test app
  beforeAll(async () => {
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    jest.spyOn(auth, 'requireAuth').mockImplementation((req, res, next) => {
      (req as any).user = mockUser;
      (req as any).tenantId = mockUser.tenantId;
      next();
    });

    // Create a test quote in accepted status
    const [quote] = await db.insert(quotes)
      .values({
        tenantId: mockUser.tenantId,
        customerId: 1,
        projectId: 1,
        quoteNumber: 'TST-001',
        status: 'accepted',
        issueDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days in the future
        subtotal: 1000,
        tax: 100,
        discount: 0,
        total: 1100,
        createdBy: mockUser.id
      })
      .returning();
    
    testQuoteId = quote.id;

    // Mount the router
    app.use('/api/installations', installationsRouter);
  });

  // Clean up test data
  afterAll(async () => {
    // Delete the test installation
    await db.delete(installations).where(eq(installations.quoteId, testQuoteId));
    // Delete the test quote
    await db.delete(quotes).where(eq(quotes.id, testQuoteId));
    
    jest.restoreAllMocks();
  });

  test('POST /api/installations should create a new installation for an accepted quote', async () => {
    const installationData = {
      quoteId: testQuoteId,
      scheduledDate: '2025-07-15',
      status: 'scheduled',
      notes: 'Test installation notes',
      assignedTo: [1, 2] // Team members assigned to the installation
    };

    const response = await request(app)
      .post('/api/installations')
      .send(installationData)
      .expect(201);

    expect(response.body).toBeDefined();
    expect(response.body.quoteId).toBe(testQuoteId);
    expect(response.body.tenantId).toBe(mockUser.tenantId);
    expect(response.body.status).toBe('scheduled');
    expect(response.body.notes).toBe('Test installation notes');
    
    // Verify installation was saved to the database
    const savedInstallation = await db.query.installations.findFirst({
      where: eq(installations.quoteId, testQuoteId)
    });
    
    expect(savedInstallation).not.toBeNull();
    expect(savedInstallation?.quoteId).toBe(testQuoteId);
  });

  test('POST /api/installations should reject installation creation for non-existent quote', async () => {
    const installationData = {
      quoteId: 99999, // Non-existent quote ID
      scheduledDate: '2025-07-15',
      status: 'scheduled',
      notes: 'Test installation notes'
    };

    const response = await request(app)
      .post('/api/installations')
      .send(installationData)
      .expect(404);

    expect(response.body.message).toBe('Quote not found');
  });

  test('POST /api/installations should reject installation creation for non-accepted quote', async () => {
    // Create a test quote in draft status
    const [draftQuote] = await db.insert(quotes)
      .values({
        tenantId: mockUser.tenantId,
        customerId: 1,
        projectId: 1,
        quoteNumber: 'TST-002',
        status: 'draft', // Not accepted
        issueDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: 1000,
        tax: 100,
        discount: 0,
        total: 1100,
        createdBy: mockUser.id
      })
      .returning();

    const installationData = {
      quoteId: draftQuote.id,
      scheduledDate: '2025-07-15',
      status: 'scheduled',
      notes: 'Test installation notes'
    };

    const response = await request(app)
      .post('/api/installations')
      .send(installationData)
      .expect(400);

    expect(response.body.message).toBe("Cannot schedule an installation for a quote that is not in 'accepted' status");

    // Clean up
    await db.delete(quotes).where(eq(quotes.id, draftQuote.id));
  });
});