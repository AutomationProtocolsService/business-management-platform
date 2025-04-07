/**
 * Error Boundary Component
 * 
 * A React error boundary component that catches errors in its child component tree
 * and displays a fallback UI instead of crashing the entire application.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FullPageError } from '@/components/ui/error-display';
import { logError } from '@/lib/errorUtils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component to catch JavaScript errors anywhere in the child component tree
 * and display a fallback UI instead of crashing the entire application
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to the console
    logError(error, 'ErrorBoundary');
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Otherwise, use the default error UI
      return (
        <FullPageError
          title="Something went wrong"
          message={this.state.error?.message || 'An unexpected error occurred.'}
          onRetry={this.handleReset}
        />
      );
    }

    // If there's no error, render the children normally
    return this.props.children;
  }
}

/**
 * Route-level error boundary for use with React Router or wouter
 * @param props Component props
 * @returns ErrorBoundary component
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ErrorBoundary
      onError={(error) => {
        console.error('Route error:', error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Form-level error boundary specifically for catching errors in form components
 * @param props Component props
 * @returns ErrorBoundary component
 */
export function FormErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ErrorBoundary
      onError={(error) => {
        console.error('Form error:', error);
      }}
      fallback={
        <div className="p-4 border border-destructive rounded-md bg-destructive/10 text-destructive">
          <h3 className="font-semibold mb-2">Form Error</h3>
          <p>An error occurred while rendering this form. Please try again later.</p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}