/**
 * Error Handling Middleware Integration
 * 
 * This module integrates the error handling middleware into the Express application.
 * It ensures all routes use the standard error handling and not found handling.
 */

import { Express } from 'express';
import { errorHandler, notFoundHandler } from './error-handler';

/**
 * Apply error handling middleware to the Express application
 * 
 * @param app The Express application instance
 */
export function applyErrorHandling(app: Express): void {
  // Add 404 handler for routes that don't exist
  // This must be after all other routes are registered
  app.use(notFoundHandler);
  
  // Register the global error handler
  // This must be the last middleware registered
  app.use(errorHandler);
}