/**
 * Error Handler Hook
 * 
 * This hook provides a convenient way to handle errors throughout the application,
 * with support for different handling strategies based on error type.
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  AppError,
  ErrorType,
  ErrorSeverity,
  normalizeError
} from '@/lib/errorUtils';

interface ErrorHandlerOptions {
  /** Whether to show a toast notification when an error occurs */
  showToast?: boolean;
  /** Whether to log the error to the console */
  logToConsole?: boolean;
  /** Custom handler for specific types of errors */
  handlers?: Partial<Record<ErrorType, (error: AppError) => void>>;
  /** Default error message to show if the error doesn't have one */
  defaultMessage?: string;
}

interface ErrorHandlerResult {
  /** The current error, if any */
  error: AppError | null;
  /** Whether an error is currently being handled */
  hasError: boolean;
  /** Function to handle an error */
  handleError: (error: unknown) => void;
  /** Function to clear the current error */
  clearError: () => void;
}

/**
 * Hook for handling errors throughout the application
 */
export function useErrorHandler(options: ErrorHandlerOptions = {}): ErrorHandlerResult {
  const {
    showToast = true,
    logToConsole = true,
    handlers = {},
    defaultMessage = 'An error occurred'
  } = options;
  
  const { toast } = useToast();
  const [error, setError] = useState<AppError | null>(null);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  const handleError = useCallback((rawError: unknown) => {
    // Normalize to AppError for consistent processing
    const error = normalizeError(rawError);
    
    // Use default message if none provided
    if (!error.message) {
      error.message = defaultMessage;
    }
    
    // Set the error state
    setError(error);
    
    // Log to console if enabled
    if (logToConsole) {
      console.error('Error handled:', error);
      if (error.details) {
        console.error('Error details:', error.details);
      }
    }
    
    // Show toast notification if enabled
    if (showToast) {
      toast({
        title: getSeverityTitle(error.severity),
        description: error.message,
        variant: getSeverityVariant(error.severity),
        duration: error.severity === ErrorSeverity.CRITICAL ? 10000 : 5000,
      });
    }
    
    // Call type-specific handler if provided
    if (handlers[error.type]) {
      handlers[error.type]!(error);
    }
    
    return error;
  }, [logToConsole, showToast, toast, handlers, defaultMessage]);
  
  return {
    error,
    hasError: !!error,
    handleError,
    clearError
  };
}

/**
 * Higher-order function that wraps a function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  options: ErrorHandlerOptions = {}
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  return (...args: Parameters<T>): ReturnType<T> | undefined => {
    try {
      const result = fn(...args);
      
      // Handle promise results (async functions)
      if (result instanceof Promise) {
        return result.catch((error) => {
          const { showToast = true, logToConsole = true, handlers = {} } = options;
          const normalizedError = normalizeError(error);
          
          if (logToConsole) {
            console.error('Error in async function:', normalizedError);
          }
          
          if (showToast) {
            const { toast } = useToast();
            toast({
              title: getSeverityTitle(normalizedError.severity),
              description: normalizedError.message,
              variant: getSeverityVariant(normalizedError.severity),
            });
          }
          
          if (handlers[normalizedError.type]) {
            handlers[normalizedError.type]!(normalizedError);
          }
          
          throw normalizedError; // Re-throw to allow caller to handle
        }) as ReturnType<T>;
      }
      
      return result;
    } catch (error) {
      const { showToast = true, logToConsole = true, handlers = {} } = options;
      const normalizedError = normalizeError(error);
      
      if (logToConsole) {
        console.error('Error in function:', normalizedError);
      }
      
      if (showToast) {
        const { toast } = useToast();
        toast({
          title: getSeverityTitle(normalizedError.severity),
          description: normalizedError.message,
          variant: getSeverityVariant(normalizedError.severity),
        });
      }
      
      if (handlers[normalizedError.type]) {
        handlers[normalizedError.type]!(normalizedError);
      }
      
      return undefined;
    }
  };
}

function getSeverityTitle(severity: ErrorSeverity): string {
  switch (severity) {
    case ErrorSeverity.INFO:
      return 'Information';
    case ErrorSeverity.WARNING:
      return 'Warning';
    case ErrorSeverity.ERROR:
      return 'Error';
    case ErrorSeverity.CRITICAL:
      return 'Critical Error';
    default:
      return 'Error';
  }
}

function getSeverityVariant(severity: ErrorSeverity): 'default' | 'destructive' {
  switch (severity) {
    case ErrorSeverity.INFO:
      return 'default';
    case ErrorSeverity.WARNING:
      return 'default';
    case ErrorSeverity.ERROR:
    case ErrorSeverity.CRITICAL:
      return 'destructive';
    default:
      return 'destructive';
  }
}