/**
 * Error Utilities
 * 
 * This module provides consistent error handling types, helpers, and utilities
 * for use throughout the application.
 */

/**
 * Types of errors that can occur in the application.
 * Corresponds to the ErrorType enum on the server-side.
 */
export enum ErrorType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  SERVER = 'server',
  DATABASE = 'database',
  TENANT = 'tenant', 
  NOT_FOUND = 'not_found',
  NETWORK = 'network',
  UNKNOWN = 'unknown'
}

/**
 * Severity levels for errors, used to control display and notification behavior
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Standardized error response format from the API
 */
export interface ErrorResponse {
  success: false;
  message: string;
  type: ErrorType;
  status: number;
  details?: any;
  timestamp: string;
}

/**
 * Standardized application error structure
 */
export class AppError extends Error {
  type: ErrorType;
  severity: ErrorSeverity;
  details?: any;
  status?: number;
  source?: string;
  timestamp: string;

  constructor(
    message: string = 'An error occurred',
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    details?: any,
    status?: number,
    source?: string
  ) {
    super(message);
    
    // Ensure the name property is set for better logging
    this.name = this.constructor.name;
    
    this.type = type;
    this.severity = severity;
    this.details = details;
    this.status = status;
    this.source = source;
    this.timestamp = new Date().toISOString();
    
    // Ensures proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Format the error for logging or display
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      details: this.details,
      status: this.status,
      source: this.source,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Specialized error for authentication failures
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', details?: any) {
    super(
      message,
      ErrorType.AUTHENTICATION,
      ErrorSeverity.ERROR,
      details
    );
  }
}

/**
 * Specialized error for authorization failures
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Permission denied', details?: any) {
    super(
      message,
      ErrorType.AUTHORIZATION,
      ErrorSeverity.ERROR,
      details
    );
  }
}

/**
 * Specialized error for validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(
      message,
      ErrorType.VALIDATION,
      ErrorSeverity.WARNING,
      details
    );
  }
}

/**
 * Specialized error for not found errors
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(
      message,
      ErrorType.NOT_FOUND,
      ErrorSeverity.WARNING,
      details,
      404
    );
  }
}

/**
 * Specialized error for network failures
 */
export class NetworkError extends AppError {
  constructor(message: string = 'Network error', details?: any) {
    super(
      message,
      ErrorType.NETWORK,
      ErrorSeverity.ERROR,
      details
    );
  }
}

/**
 * Convert an API error response into an AppError
 */
export function createErrorFromResponse(response: ErrorResponse): AppError {
  let error: AppError;
  
  switch (response.type) {
    case ErrorType.AUTHENTICATION:
      error = new AuthenticationError(response.message, response.details);
      break;
    case ErrorType.AUTHORIZATION:
      error = new AuthorizationError(response.message, response.details);
      break;
    case ErrorType.VALIDATION:
      error = new ValidationError(response.message, response.details);
      break;
    case ErrorType.NOT_FOUND:
      error = new NotFoundError(response.message, response.details);
      break;
    case ErrorType.NETWORK:
      error = new NetworkError(response.message, response.details);
      break;
    default:
      error = new AppError(
        response.message,
        response.type,
        response.type === ErrorType.SERVER || response.type === ErrorType.DATABASE 
          ? ErrorSeverity.ERROR 
          : ErrorSeverity.WARNING,
        response.details,
        response.status
      );
  }
  
  error.timestamp = response.timestamp;
  return error;
}

/**
 * Convert any error into an AppError
 */
export function normalizeError(error: any): AppError {
  // If it's already an AppError, return it
  if (error instanceof AppError) {
    return error;
  }
  
  // If it's a standard API error response, convert it
  if (error && error.success === false && error.type) {
    return createErrorFromResponse(error as ErrorResponse);
  }
  
  // If it's a network or fetch error
  if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
    return new NetworkError(
      'Network connection error',
      { originalError: error }
    );
  }
  
  // If it's a regular Error object
  if (error instanceof Error) {
    return new AppError(
      error.message,
      ErrorType.UNKNOWN,
      ErrorSeverity.ERROR,
      {
        originalError: error,
        stack: error.stack
      }
    );
  }
  
  // If it's a string, create a simple error
  if (typeof error === 'string') {
    return new AppError(error);
  }
  
  // If it's some other object or value, create a generic error
  return new AppError(
    'An unknown error occurred',
    ErrorType.UNKNOWN,
    ErrorSeverity.ERROR,
    {
      originalError: error,
      valueType: typeof error,
      value: error
    }
  );
}

/**
 * Format validation errors from form libraries like Zod or react-hook-form
 * Returns an object with field names as keys and error messages as values
 */
export function formatValidationErrors(errors: Record<string, any>): Record<string, string> {
  const formatted: Record<string, string> = {};
  
  Object.keys(errors).forEach(key => {
    const error = errors[key];
    
    if (typeof error === 'string') {
      formatted[key] = error;
    } else if (error?.message) {
      formatted[key] = error.message;
    } else if (error?.type === 'required') {
      formatted[key] = `${key} is required`;
    } else if (Array.isArray(error)) {
      formatted[key] = error.map(e => e.message || String(e)).join(', ');
    } else {
      formatted[key] = 'Invalid value';
    }
  });
  
  return formatted;
}