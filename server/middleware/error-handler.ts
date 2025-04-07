/**
 * Error Handler Middleware
 * 
 * Provides standardized error handling for the Express server.
 * Catches and processes errors, formats them for client consumption,
 * and ensures proper logging.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../logger';

// Standardized error status codes and types
export enum ErrorType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  SERVER = 'server',
  DATABASE = 'database',
  TENANT = 'tenant',
  NOT_FOUND = 'not_found',
  UNKNOWN = 'unknown'
}

// Define the structure of a standardized error response
export interface ErrorResponse {
  success: false;
  message: string;
  type: ErrorType;
  status: number;
  details?: any;
  timestamp: string;
}

// Custom error class with standardized fields
export class AppError extends Error {
  type: ErrorType;
  status: number;
  details?: any;
  
  constructor(
    message: string, 
    type: ErrorType = ErrorType.UNKNOWN, 
    status: number = 500,
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.status = status;
    this.details = details;
  }
  
  toResponse(): ErrorResponse {
    return {
      success: false,
      message: this.message,
      type: this.type,
      status: this.status,
      details: this.details,
      timestamp: new Date().toISOString()
    };
  }
}

// Specialized error classes for different error types
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', details?: any) {
    super(message, ErrorType.AUTHENTICATION, 401, details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Permission denied', details?: any) {
    super(message, ErrorType.AUTHORIZATION, 403, details);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, ErrorType.VALIDATION, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, ErrorType.NOT_FOUND, 404, details);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(message, ErrorType.DATABASE, 500, details);
    this.name = 'DatabaseError';
  }
}

export class TenantError extends AppError {
  constructor(message: string = 'Tenant operation failed', details?: any) {
    super(message, ErrorType.TENANT, 400, details);
    this.name = 'TenantError';
  }
}

/**
 * Format ZodError into a user-friendly validation error
 */
function formatZodError(error: ZodError): ValidationError {
  const formattedErrors = error.errors.reduce((acc, curr) => {
    const path = curr.path.join('.');
    acc[path] = curr.message;
    return acc;
  }, {} as Record<string, string>);
  
  return new ValidationError(
    'Validation failed. Please check your input.',
    { fieldErrors: formattedErrors }
  );
}

/**
 * Determine error type and create appropriate AppError
 */
function processError(err: any): AppError {
  // If it's already an AppError, return it
  if (err instanceof AppError) {
    return err;
  }

  // Process Zod validation errors
  if (err instanceof ZodError) {
    return formatZodError(err);
  }

  // Process database errors
  if (err.code && (
    // PostgreSQL error codes
    err.code.startsWith('23') || // Integrity constraint violations
    err.code.startsWith('42') || // Syntax or access rule violation
    err.code.startsWith('08') || // Connection errors
    // Drizzle or other ORM error patterns
    err.message?.includes('database') ||
    err.message?.includes('Database') ||
    err.message?.includes('sql')
  )) {
    return new DatabaseError(
      'A database error occurred. Please try again later.',
      { originalError: err.message, code: err.code }
    );
  }

  // JWT or auth-related errors
  if (err.name === 'JsonWebTokenError' || 
      err.name === 'TokenExpiredError' || 
      err.message?.toLowerCase().includes('authentication') ||
      err.message?.toLowerCase().includes('token') ||
      err.message?.toLowerCase().includes('unauthorized')) {
    return new AuthenticationError(
      err.message || 'Authentication required',
      { originalError: err.message }
    );
  }

  // Not found errors
  if (err.status === 404 || err.message?.toLowerCase().includes('not found')) {
    return new NotFoundError(
      err.message || 'Resource not found',
      { originalError: err.message, resource: err.resource }
    );
  }

  // Tenant-related errors
  if (err.message?.toLowerCase().includes('tenant')) {
    return new TenantError(
      err.message || 'Tenant operation failed',
      { originalError: err.message }
    );
  }

  // Unknown server error (default)
  return new AppError(
    err.message || 'An unexpected error occurred',
    ErrorType.SERVER,
    500,
    { originalError: err.message || err.toString() }
  );
}

/**
 * Express error handling middleware
 * This should be registered after all other middleware and routes
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Process the error
  const appError = processError(err);
  
  // Get request info for logging
  const requestInfo = req ? {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: (req as any).user?.id,
    tenantId: (req as any).tenant?.id
  } : {
    method: 'UNKNOWN',
    url: 'UNKNOWN',
    ip: 'UNKNOWN',
    userId: undefined,
    tenantId: undefined
  };
  
  // Log the error with context
  if (appError.status >= 500) {
    // Server errors get error level
    logger.error({
      msg: `Server error: ${appError.message}`,
      err: appError,
      req: requestInfo
    });
  } else if (appError.type === ErrorType.AUTHENTICATION || appError.type === ErrorType.AUTHORIZATION) {
    // Auth errors get warn level
    logger.warn({
      msg: `Auth error: ${appError.message}`,
      err: appError,
      req: requestInfo
    });
  } else {
    // Client errors get info level
    logger.info({
      msg: `Client error: ${appError.message}`,
      err: appError,
      req: requestInfo
    });
  }
  
  // Send the formatted response
  res.status(appError.status).json(appError.toResponse());
}

/**
 * Express middleware to handle not found routes
 * This should be registered after all other routes but before the error handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Set up global handler for uncaught promise rejections
 * This prevents the application from crashing on unhandled rejections
 */
export function setupUnhandledRejectionHandler(): void {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error({
      msg: 'Unhandled Promise Rejection',
      reason: reason instanceof Error ? reason.stack : reason,
      promise
    });
  });
  
  process.on('uncaughtException', (error: Error) => {
    logger.error({
      msg: 'Uncaught Exception',
      error: error.stack
    });
    
    // Give the logger time to flush
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
}