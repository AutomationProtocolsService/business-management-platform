import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import { db } from '../../server/db';
import { quotes, surveys, projects, customers, users, tenants } from '../../shared/schema';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import surveysRouter from '../../server/routes/surveys';

// Mock authentication middleware
const mockAuthMiddleware = (req, res, next) => {
  req.user = { id: 1, email: 'test@example.com' };
  req.tenantId = 1;
  next();
};

describe('Survey API Routes', () => {
  let app;

  beforeEach(() => {
    // Set up a simple Express application for testing
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      mockAuthMiddleware(req, res, next);
    });
    app.use('/api/surveys', surveysRouter);

    // Clear mock calls
    vi.clearAllMocks();
    
    // Mock the database transaction
    vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
      return await callback(db);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a survey for an accepted quote', async () => {
    // Mock finding the quote
    vi.spyOn(db.query.quotes, 'findFirst').mockResolvedValue({
      id: 1,
      projectId: 1,
      status: 'accepted',
      tenantId: 1,
      // Add other required quote fields as needed
    });

    // Mock inserting the survey
    vi.spyOn(db, 'insert').mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 1,
            quoteId: 1,
            projectId: 1,
            scheduledDate: '2025-06-15',
            status: 'scheduled',
            tenantId: 1,
            assignedTo: null,
            notes: 'Test survey notes',
            createdBy: 1,
            createdAt: new Date()
          }
        ])
      })
    });

    // Test the API endpoint
    const response = await request(app)
      .post('/api/surveys')
      .send({
        quoteId: 1,
        scheduledDate: '2025-06-15',
        status: 'scheduled',
        notes: 'Test survey notes'
      });

    // Assertions
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('survey');
    expect(response.body).toHaveProperty('quote');
    expect(response.body.survey.quoteId).toBe(1);
    expect(response.body.survey.scheduledDate).toBe('2025-06-15');
    expect(response.body.survey.status).toBe('scheduled');
    
    // Verify database insertion was called with correct parameters
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('should reject creating a survey for a non-accepted quote', async () => {
    // Mock finding the quote with a status that is not 'accepted'
    vi.spyOn(db.query.quotes, 'findFirst').mockResolvedValue({
      id: 1,
      projectId: 1,
      status: 'draft', // Not 'accepted'
      tenantId: 1,
      // Add other required quote fields as needed
    });

    // Test the API endpoint
    const response = await request(app)
      .post('/api/surveys')
      .send({
        quoteId: 1,
        scheduledDate: '2025-06-15',
        status: 'scheduled',
        notes: 'Test survey notes'
      });

    // Assertions
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Cannot schedule a survey for a quote that is not in \'accepted\' status');
    
    // Verify database insertion was not called
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('should return 404 when quote is not found', async () => {
    // Mock no quote found
    vi.spyOn(db.query.quotes, 'findFirst').mockResolvedValue(null);

    // Test the API endpoint
    const response = await request(app)
      .post('/api/surveys')
      .send({
        quoteId: 999, // Non-existent quote ID
        scheduledDate: '2025-06-15',
        status: 'scheduled',
        notes: 'Test survey notes'
      });

    // Assertions
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Quote not found');
    
    // Verify database insertion was not called
    expect(db.insert).not.toHaveBeenCalled();
  });
});