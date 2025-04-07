/**
 * Error Display Component
 * 
 * A standardized component for displaying various types of errors
 * throughout the application with appropriate styling based on error type.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { ErrorType, ErrorSeverity } from '@/lib/errorUtils';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { AlertCircle, AlertTriangle, Ban, ExclamationTriangle, Info, ServerCrash, ShieldAlert, WifiOff } from 'lucide-react';
import { Button } from './button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';

export interface ErrorDisplayProps {
  /** The error type determines the icon and styling */
  type?: ErrorType;
  /** The error severity influences the visual prominence */
  severity?: ErrorSeverity;
  /** Main error message to display */
  message: string;
  /** Optional additional details about the error */
  details?: string | Record<string, any>;
  /** Whether the error can be dismissed */
  dismissible?: boolean;
  /** Callback when error is dismissed */
  onDismiss?: () => void;
  /** Additional CSS classes to apply */
  className?: string;
}

/**
 * A standardized way to display errors throughout the application
 */
export function ErrorDisplay({
  type = ErrorType.UNKNOWN,
  severity = ErrorSeverity.ERROR,
  message,
  details,
  dismissible = false,
  onDismiss,
  className
}: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = React.useState(false);
  
  const formattedDetails = details ? 
    (typeof details === 'string' ? details : JSON.stringify(details, null, 2)) 
    : null;
  
  const alertVariant = getAlertVariant(severity);
  const IconComponent = getIconForErrorType(type);
  const errorTypeLabel = getErrorTypeLabel(type, severity);
  
  return (
    <Alert variant={alertVariant} className={cn('relative', className)}>
      <IconComponent className="h-5 w-5" />
      <AlertTitle className="flex items-center space-x-2">
        <span>{errorTypeLabel}</span>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-sm">{message}</p>
        
        {formattedDetails && (
          <Collapsible 
            open={showDetails} 
            onOpenChange={setShowDetails} 
            className="mt-2"
          >
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-0 text-xs underline hover:no-underline"
              >
                {showDetails ? 'Hide details' : 'Show details'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <pre className="max-h-60 overflow-auto rounded bg-secondary/50 p-2 text-xs">
                {formattedDetails}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {dismissible && onDismiss && (
          <div className="mt-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          </div>
        )}
      </AlertDescription>
      
      {dismissible && onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-6 w-6 rounded-full p-0"
          onClick={onDismiss}
        >
          <span className="sr-only">Dismiss</span>
          <span aria-hidden="true">&times;</span>
        </Button>
      )}
    </Alert>
  );
}

/**
 * Helper function to get the appropriate icon for each error type
 */
function getIconForErrorType(type: ErrorType): React.ComponentType<{ className?: string }> {
  switch (type) {
    case ErrorType.AUTHENTICATION:
      return ShieldAlert;
    case ErrorType.AUTHORIZATION:
      return Ban;
    case ErrorType.VALIDATION:
      return AlertTriangle;
    case ErrorType.SERVER:
      return ServerCrash;
    case ErrorType.DATABASE:
      return ExclamationTriangle;
    case ErrorType.TENANT:
      return AlertCircle;
    case ErrorType.NOT_FOUND:
      return AlertCircle;
    case ErrorType.NETWORK:
      return WifiOff;
    case ErrorType.UNKNOWN:
    default:
      return Info;
  }
}

function getAlertVariant(severity: ErrorSeverity): 'default' | 'destructive' {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.ERROR:
      return 'destructive';
    case ErrorSeverity.WARNING:
    case ErrorSeverity.INFO:
    default:
      return 'default';
  }
}

function getErrorTypeLabel(type: ErrorType, severity: ErrorSeverity): string {
  if (severity === ErrorSeverity.INFO) {
    return 'Information';
  }
  
  switch (type) {
    case ErrorType.AUTHENTICATION:
      return 'Authentication Error';
    case ErrorType.AUTHORIZATION:
      return 'Authorization Error';
    case ErrorType.VALIDATION:
      return 'Validation Error';
    case ErrorType.SERVER:
      return 'Server Error';
    case ErrorType.DATABASE:
      return 'Database Error';
    case ErrorType.TENANT:
      return 'Tenant Error';
    case ErrorType.NOT_FOUND:
      return 'Not Found';
    case ErrorType.NETWORK:
      return 'Network Error';
    case ErrorType.UNKNOWN:
    default:
      return severity === ErrorSeverity.ERROR ? 'Error' : 'Warning';
  }
}