import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../../server/db';
import { storage } from '../../server/storage';
import { quotes, invoices } from '../../shared/schema';
import express from 'express';
import { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { registerQuoteRoutes } from '../../server/routes/quotes';

// Mock user and tenant for testing
const mockUser = {
  id: 999,
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin',
  tenantId: 999
};

// Mock quote data
const mockQuote = {
  id: 42,
  tenantId: 999,
  quoteNumber: 'QUO-TEST-123',
  status: 'accepted',
  customerId: 101,
  projectId: 201,
  subtotal: 1000,
  tax: 100,
  discount: 50,
  total: 1050,
  notes: 'Test notes',
  terms: 'Test terms',
  createdBy: 999,
  createdAt: new Date('2025-05-01').toISOString()
};

// Mock quote items
const mockQuoteItems = [
  {
    id: 1,
    quoteId: 42,
    description: 'Test item 1',
    quantity: 2,
    unitPrice: 300,
    total: 600,
    catalogItemId: null
  },
  {
    id: 2,
    quoteId: 42,
    description: 'Test item 2',
    quantity: 1,
    unitPrice: 400,
    total: 400,
    catalogItemId: null
  }
];

// Mock the response for createInvoice
const mockInvoice = {
  id: 101,
  tenantId: 999,
  invoiceNumber: 'INV-TEST-456',
  quoteId: 42,
  customerId: 101,
  projectId: 201,
  status: 'issued',
  subtotal: 1000,
  tax: 100,
  discount: 50,
  total: 1050,
  notes: 'Test notes',
  terms: 'Test terms'
};

describe('Convert Quote to Invoice API', () => {
  let app: express.Express;
  
  // Mock the storage methods
  beforeEach(() => {
    // Set up Express app
    app = express();
    app.use(express.json());
    
    // Mock middleware for authentication
    app.use((req: Request, res: Response, next: NextFunction) => {
      (req as any).user = mockUser;
      (req as any).tenant = { id: mockUser.tenantId };
      next();
    });
    
    // Register routes
    registerQuoteRoutes(app);
    
    // Mock storage methods
    vi.spyOn(storage, 'getQuote').mockResolvedValue(mockQuote);
    vi.spyOn(storage, 'getQuoteItemsByQuote').mockResolvedValue(mockQuoteItems);
    vi.spyOn(storage, 'updateQuote').mockResolvedValue({ ...mockQuote, status: 'converted' });
    
    // Mock db transaction
    vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
      return await callback({
        insert: () => ({
          values: () => ({
            returning: async () => [mockInvoice]
          })
        }),
        update: () => ({
          set: () => ({
            where: async () => [{ ...mockQuote, status: 'converted' }]
          })
        })
      } as any);
    });
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  it('should convert an accepted quote to an invoice', async () => {
    const response = await request(app)
      .post('/api/quotes/42/convert-to-invoice')
      .send({});
    
    // Verify response
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id', 101);
    expect(response.body).toHaveProperty('quoteId', 42);
    expect(response.body).toHaveProperty('status', 'issued');
    
    // Verify storage calls
    expect(storage.getQuote).toHaveBeenCalledWith(42, 999);
    expect(storage.getQuoteItemsByQuote).toHaveBeenCalledWith(42);
    
    // Verify transaction
    expect(db.transaction).toHaveBeenCalled();
  });
  
  it('should return 404 if quote not found', async () => {
    vi.spyOn(storage, 'getQuote').mockResolvedValueOnce(null);
    
    const response = await request(app)
      .post('/api/quotes/999/convert-to-invoice')
      .send({});
    
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message', 'Quote not found');
  });
  
  it('should return 400 if quote is not in accepted status', async () => {
    vi.spyOn(storage, 'getQuote').mockResolvedValueOnce({
      ...mockQuote,
      status: 'draft'
    });
    
    const response = await request(app)
      .post('/api/quotes/42/convert-to-invoice')
      .send({});
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message', 'Only accepted quotes can be converted to invoices');
    expect(response.body).toHaveProperty('currentStatus', 'draft');
  });
});