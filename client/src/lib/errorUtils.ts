/**
 * Error Handling Utilities
 * 
 * A collection of utilities for handling, parsing, and logging errors
 * in a consistent way across the application.
 */

interface ApiError {
  message: string;
  code?: string;
  status?: number;
  errors?: Record<string, string>;
  details?: string | Record<string, any>;
}

/**
 * Parse an error into a user-friendly message
 * 
 * @param error The error to parse
 * @returns A user-friendly error message
 */
export function parseError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiError;
    
    if (apiError.message) {
      return formatApiError(apiError);
    }
  }
  
  return 'An unknown error occurred';
}

/**
 * Format an API error into a user-friendly message
 * 
 * @param error The API error to format
 * @returns A user-friendly error message
 */
function formatApiError(error: ApiError): string {
  // If we have validation errors, format them nicely
  if (error.errors && Object.keys(error.errors).length > 0) {
    const errorMessages = Object.entries(error.errors)
      .map(([field, message]) => `${field}: ${message}`)
      .join(', ');
    
    return `Validation error: ${errorMessages}`;
  }
  
  // If we have detailed error information, include it
  if (error.details) {
    if (typeof error.details === 'string') {
      return `${error.message}: ${error.details}`;
    } else {
      const details = Object.entries(error.details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      
      return `${error.message}: ${details}`;
    }
  }
  
  // Otherwise, just return the message
  return error.message;
}

/**
 * Format field-specific validation errors for form display
 * 
 * @param error The API error containing validation errors
 * @returns An object mapping field names to error messages
 */
export function formatFormErrors(error: unknown): Record<string, string> {
  if (typeof error === 'object' && error !== null && 'errors' in error) {
    const apiError = error as ApiError;
    
    if (apiError.errors) {
      return apiError.errors;
    }
  }
  
  return {};
}

/**
 * Determine if an error is a network connectivity issue
 * 
 * @param error The error to check
 * @returns Whether the error is due to network connectivity
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('network') ||
      error.message.includes('Network Error') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('Network request failed')
    );
  }
  
  return false;
}

/**
 * Determine if an error is an authentication error
 * 
 * @param error The error to check
 * @returns Whether the error is due to authentication
 */
export function isAuthError(error: unknown): boolean {
  // Check for status code 401 (Unauthorized)
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiError;
    
    if (apiError.status === 401) {
      return true;
    }
    
    // Check for "Unauthorized" message
    if (apiError.message) {
      return (
        apiError.message.includes('Unauthorized') ||
        apiError.message.includes('Not authenticated') ||
        apiError.message.includes('Authentication required') ||
        apiError.message.includes('Session expired')
      );
    }
  }
  
  // Check error message for auth-related phrases
  if (error instanceof Error) {
    return (
      error.message.includes('Unauthorized') ||
      error.message.includes('Not authenticated') ||
      error.message.includes('Authentication required') ||
      error.message.includes('Session expired')
    );
  }
  
  return false;
}

/**
 * Determine if an error is a permission error
 * 
 * @param error The error to check
 * @returns Whether the error is due to permissions
 */
export function isPermissionError(error: unknown): boolean {
  // Check for status code 403 (Forbidden)
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiError;
    
    if (apiError.status === 403) {
      return true;
    }
    
    // Check for "Forbidden" message
    if (apiError.message) {
      return (
        apiError.message.includes('Forbidden') ||
        apiError.message.includes('Permission denied') ||
        apiError.message.includes('Not authorized') ||
        apiError.message.includes('Access denied')
      );
    }
  }
  
  // Check error message for permission-related phrases
  if (error instanceof Error) {
    return (
      error.message.includes('Forbidden') ||
      error.message.includes('Permission denied') ||
      error.message.includes('Not authorized') ||
      error.message.includes('Access denied')
    );
  }
  
  return false;
}

/**
 * Log an error to the console with additional context
 * 
 * @param error The error to log
 * @param context Additional context about where the error occurred
 */
export function logError(error: unknown, context: string): void {
  console.error(`[${context}] Error:`, error);
  
  // Log additional details if available
  if (error instanceof Error && error.stack) {
    console.error(`[${context}] Stack trace:`, error.stack);
  }
  
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiError;
    
    if (apiError.details) {
      console.error(`[${context}] Error details:`, apiError.details);
    }
    
    if (apiError.errors) {
      console.error(`[${context}] Validation errors:`, apiError.errors);
    }
  }
}