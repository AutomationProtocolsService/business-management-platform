import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../server/db';
import { storage } from '../../server/storage';
import { quotes, quoteItems } from '../../shared/schema';
import express from 'express';
import request from 'supertest';
import { registerRoutes } from '../../server/routes';
import passport from 'passport';
import session from 'express-session';
import { configureAuth } from '../../server/auth';
import { configureTenantMiddleware } from '../../server/middleware/tenant-filter';
import MemoryStore from 'memorystore';

// Mock authenticated user
const mockUser = {
  id: 999,
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin',
  tenantId: 999,
};

// Mock tenant
const mockTenant = {
  id: 999,
  name: 'Test Tenant',
  subdomain: 'test',
  status: 'active',
};

describe('Quote Creation API', () => {
  let app: express.Express;
  let server: any;
  let agent: request.SuperAgentTest;
  
  // Setup test environment
  beforeAll(async () => {
    // Create Express app
    app = express();
    
    // Configure session
    const MemorySessionStore = MemoryStore(session);
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      store: new MemorySessionStore({
        checkPeriod: 86400000 // prune expired entries every 24h
      })
    }));
    
    // Configure auth and middleware
    app.use(express.json());
    app.use(passport.initialize());
    app.use(passport.session());
    
    configureAuth(app);
    configureTenantMiddleware(app);
    
    // Mock storage methods
    const originalCreateQuote = storage.createQuote;
    const originalCreateQuoteItem = storage.createQuoteItem;
    
    storage.createQuote = async (data) => {
      return {
        id: 1,
        quoteNumber: data.quoteNumber,
        ...data,
        createdAt: new Date().toISOString(),
      };
    };
    
    storage.createQuoteItem = async (data) => {
      return {
        id: 1,
        ...data,
      };
    };
    
    // Register routes
    server = await registerRoutes(app);
    
    // Create agent for testing with session
    agent = request.agent(app);
    
    // Mock login
    await new Promise<void>((resolve) => {
      const req: any = { logIn: (user: any, done: any) => done(null) };
      req.session = { passport: { user: mockUser } };
      req.tenant = mockTenant;
      
      // @ts-ignore - Simplified for test
      passport.serializeUser((user, done) => {
        done(null, user);
      });
      
      // @ts-ignore - Simplified for test
      passport.deserializeUser((user, done) => {
        done(null, user);
      });
      
      req.logIn(mockUser, () => {
        resolve();
      });
    });
    
    // Cleanup function to restore original methods
    return () => {
      storage.createQuote = originalCreateQuote;
      storage.createQuoteItem = originalCreateQuoteItem;
      server.close();
    };
  });
  
  it('should successfully create a quote with items', async () => {
    // Setup quote request data
    const quoteData = {
      customerId: 12,
      reference: 'Q-24-0007',
      issueDate: '2025-05-24',
      expiryDate: '2025-06-24',
      items: [
        { 
          catalogItemId: null, 
          description: 'To supply and install single door', 
          quantity: 1, 
          unitPrice: 1500 
        },
        { 
          catalogItemId: null, 
          description: 'door', 
          quantity: 1, 
          unitPrice: 1220 
        }
      ],
      taxPercent: 20,
      discountPercent: 5,
      status: 'draft',
      notes: 'Test quote',
      terms: 'Standard terms'
    };
    
    // Set tenant middleware for the test
    app.use((req: any, res, next) => {
      req.tenant = mockTenant;
      req.user = mockUser;
      req.isTenantResource = () => true;
      next();
    });
    
    // Make request to create quote
    const response = await request(app)
      .post('/api/quotes')
      .set('Accept', 'application/json')
      .send(quoteData);
    
    // Assertions
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('quoteNumber');
    expect(response.body).toHaveProperty('items');
    expect(response.body.items).toHaveLength(2);
    
    // Verify calculated values
    expect(response.body.subtotal).toBe(2720); // 1500 + 1220
    expect(response.body.tax).toBe(544);       // 2720 * 0.2
    expect(response.body.discount).toBe(136);  // 2720 * 0.05
    expect(response.body.total).toBe(3128);    // 2720 + 544 - 136
    
    // Verify items were correctly associated
    response.body.items.forEach((item: any) => {
      expect(item).toHaveProperty('quoteId', 1);
      expect(item).toHaveProperty('total');
    });
  });
  
  it('should validate required fields', async () => {
    // Missing required fields
    const invalidData = {
      // Missing customerId and other required fields
      items: [
        { description: 'Test item', quantity: 1, unitPrice: 100 }
      ]
    };
    
    const response = await request(app)
      .post('/api/quotes')
      .set('Accept', 'application/json')
      .send(invalidData);
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message', 'Validation error');
    expect(response.body).toHaveProperty('errors');
  });
});