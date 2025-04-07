/**
 * Custom hook for standardized error handling
 * 
 * This hook provides consistent error handling across the application,
 * with special handling for different error types (auth, network, etc)
 * and the ability to retry failed operations.
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { parseError, isNetworkError, isAuthError, isPermissionError, logError } from '@/lib/errorUtils';

export interface ErrorHandlerHook {
  error: Error | null;
  handleError: (error: unknown, context?: string) => void;
  clearError: () => void;
  retry: () => void;
  isLoading: boolean;
}

/**
 * Hook for handling errors in a consistent way across the application
 * 
 * @param onRetry Optional callback to retry the failed operation
 * @returns ErrorHandlerHook
 */
export function useErrorHandler(onRetry?: () => Promise<void>): ErrorHandlerHook {
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const { logout } = useAuth();

  /**
   * Handle an error by analyzing its type and taking appropriate action
   * 
   * @param err The error that occurred
   * @param context The context in which the error occurred, for logging
   */
  const handleError = useCallback((err: unknown, context = 'general') => {
    let errorObject: Error;
    
    // Convert unknown error to Error object
    if (err instanceof Error) {
      errorObject = err;
    } else {
      errorObject = new Error(parseError(err));
    }
    
    // Log the error
    logError(errorObject, context);
    
    // Set the error state
    setError(errorObject);
    
    // Handle specific error types
    if (isAuthError(err)) {
      // For authentication errors, show a notification and redirect to login
      toast({
        title: 'Authentication Error',
        description: 'Your session has expired. Please log in again.',
        variant: 'destructive',
      });
      
      // Log the user out
      logout();
    } else if (isPermissionError(err)) {
      // For permission errors, show a notification
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to perform this action.',
        variant: 'destructive',
      });
    } else if (isNetworkError(err)) {
      // For network errors, show a notification
      toast({
        title: 'Network Error',
        description: 'Unable to connect to the server. Please check your internet connection.',
        variant: 'destructive',
      });
    } else {
      // For all other errors, show a generic notification
      toast({
        title: 'Error',
        description: parseError(err),
        variant: 'destructive',
      });
    }
  }, [toast, logout]);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Retry the failed operation if a retry callback was provided
   */
  const retry = useCallback(async () => {
    if (!onRetry) return;
    
    try {
      setIsLoading(true);
      setError(null);
      await onRetry();
    } catch (err) {
      handleError(err, 'retry');
    } finally {
      setIsLoading(false);
    }
  }, [onRetry, handleError]);

  return {
    error,
    handleError,
    clearError,
    retry,
    isLoading
  };
}