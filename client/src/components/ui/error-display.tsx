/**
 * Error Display Components
 * 
 * A collection of flexible, standardized components for displaying errors in different contexts:
 * - Inline for form field validation
 * - Alert boxes for operation feedback
 * - Full-page for critical errors
 */

import React from 'react';
import { AlertCircle, XCircle, AlertTriangle, Info, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface ErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  variant?: 'error' | 'warning' | 'info';
}

/**
 * InlineError component for displaying field-level validation errors
 */
export function InlineError({ message }: { message: string }) {
  if (!message) return null;
  
  return (
    <div className="flex items-center gap-x-2 text-destructive text-sm mt-1">
      <XCircle className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}

/**
 * ErrorAlert component for displaying operation-level errors
 */
export function ErrorAlert({ title, message, onRetry, variant = 'error' }: ErrorProps) {
  let icon;
  let variantClass = '';
  
  switch (variant) {
    case 'warning':
      icon = <AlertTriangle className="h-5 w-5" />;
      variantClass = 'bg-warning/20 text-warning border-warning/50';
      break;
    case 'info':
      icon = <Info className="h-5 w-5" />;
      variantClass = 'bg-info/20 text-info border-info/50';
      break;
    case 'error':
    default:
      icon = <AlertCircle className="h-5 w-5" />;
      variantClass = 'bg-destructive/20 text-destructive border-destructive/50';
      break;
  }
  
  return (
    <Alert className={`${variantClass} border`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="ml-3 w-full">
          {title && <AlertTitle className="font-semibold">{title}</AlertTitle>}
          <AlertDescription className="mt-1 text-sm">{message}</AlertDescription>
          
          {onRetry && (
            <div className="mt-2">
              <Button 
                variant="outline"
                size="sm"
                className="gap-x-2"
                onClick={onRetry}
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
}

/**
 * FullPageError component for displaying critical or application-level errors
 */
export function FullPageError({ title = 'Something went wrong', message, onRetry }: ErrorProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-destructive/10 rounded-full p-4 inline-flex mx-auto mb-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        
        <h1 className="text-xl font-bold">{title}</h1>
        <Separator className="my-3" />
        <p className="text-muted-foreground mb-6">{message}</p>
        
        {onRetry && (
          <Button 
            variant="default" 
            onClick={onRetry} 
            className="gap-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * NetworkError component specifically for handling connection issues
 */
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-warning/10 rounded-full p-4 inline-flex mx-auto mb-4">
          <WifiOff className="h-10 w-10 text-warning" />
        </div>
        
        <h1 className="text-xl font-bold">Network Connection Error</h1>
        <Separator className="my-3" />
        <p className="text-muted-foreground mb-2">
          Unable to connect to the server. Please check your internet connection and try again.
        </p>
        <p className="text-muted-foreground mb-6">
          <span className="flex items-center justify-center gap-x-2 text-sm">
            <Wifi className="h-4 w-4" />
            Waiting for connection...
          </span>
        </p>
        
        {onRetry && (
          <Button 
            variant="default" 
            onClick={onRetry} 
            className="gap-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * FormError component for displaying form-level validation errors
 */
export function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  
  return (
    <div className="p-3 border border-destructive/50 bg-destructive/10 rounded-md text-sm text-destructive mb-4">
      <div className="flex items-start gap-x-2">
        <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Form submission error</p>
          <p>{error}</p>
        </div>
      </div>
    </div>
  );
}