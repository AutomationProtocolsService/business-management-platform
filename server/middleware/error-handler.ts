/**
 * Global Error Handler Middleware
 * 
 * Provides consistent error handling for all API routes.
 * Formats error responses in a standard structure and logs errors appropriately.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { logger } from '../logger';

// Custom error classes
export class ApiError extends Error {
  statusCode: number;
  code?: string;
  errors?: Record<string, string[]>;

  constructor(
    message: string, 
    statusCode: number, 
    code?: string, 
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }

  static badRequest(message: string, errors?: Record<string, string[]>) {
    return new ApiError(message, 400, 'BAD_REQUEST', errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(message, 403, 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(message, 404, 'NOT_FOUND');
  }

  static conflict(message: string) {
    return new ApiError(message, 409, 'CONFLICT');
  }

  static internalError(message = 'Internal server error') {
    return new ApiError(message, 500, 'INTERNAL_ERROR');
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, errors: Record<string, string[]>) {
    super(message, 422, 'VALIDATION_ERROR', errors);
    this.name = 'ValidationError';
  }
}

// Format Zod errors into a consistent structure
function formatZodError(error: ZodError) {
  const validationError = fromZodError(error);
  const formattedErrors: Record<string, string[]> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!formattedErrors[path]) {
      formattedErrors[path] = [];
    }
    formattedErrors[path].push(err.message);
  });
  
  return new ValidationError(validationError.message, formattedErrors);
}

// Global error handler middleware
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log the error
  logger.error({
    message: `Error in ${req.method} ${req.path}`,
    error: err.message,
    stack: err.stack,
    requestId: req.headers['x-request-id'],
    user: req.user?.id || 'anonymous',
  });

  // Handle ZodErrors (validation errors)
  if (err instanceof ZodError) {
    const validationError = formatZodError(err);
    return res.status(validationError.statusCode).json({
      message: validationError.message,
      code: validationError.code,
      errors: validationError.errors,
    });
  }

  // Handle our custom API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      message: err.message,
      code: err.code,
      ...(err.errors && { errors: err.errors }),
    });
  }

  // Handle database errors
  if (err.name === 'PgError' || err.message.includes('database') || 
      err.message.includes('relation') || err.message.includes('violates')) {
    return res.status(500).json({
      message: 'Database error occurred',
      code: 'DATABASE_ERROR',
    });
  }

  // Handle unique constraint violations
  if (err.message.includes('duplicate key value violates unique constraint')) {
    return res.status(409).json({
      message: 'A record with this value already exists',
      code: 'DUPLICATE_ENTRY',
    });
  }

  // Default to 500 internal server error for unhandled errors
  res.status(500).json({
    message: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
  });
}

// Catch-all for unhandled promise rejections
export function setupUnhandledRejectionHandler() {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({
      message: 'Unhandled Promise Rejection',
      reason,
      promise,
    });
  });
}

// Validate request body against a Zod schema
export function validateRequest<T extends z.ZodType>(
  schema: T,
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      next(formatZodError(error));
    } else {
      next(error);
    }
  }
}