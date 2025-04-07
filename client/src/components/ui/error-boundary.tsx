/**
 * Error Boundary Component
 * 
 * A React error boundary that catches JavaScript errors anywhere in its child
 * component tree, logs those errors, and displays a fallback UI
 * instead of the component tree that crashed.
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { Button } from './button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './card';
import { ErrorDisplay } from './error-display';
import { AppError, ErrorSeverity, ErrorType, normalizeError } from '@/lib/errorUtils';

interface Props {
  /** The children components to render */
  children: ReactNode;
  /** Optional custom fallback component */
  FallbackComponent?: React.ComponentType<{ error: Error }>;
  /** Callback triggered when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const DefaultFallback = ({ error }: { error: Error }) => {
  const normalizedError = normalizeError(error);
  
  return (
    <Card className="w-full max-w-md mx-auto mt-8 shadow-lg">
      <CardHeader>
        <CardTitle className="text-destructive">
          Something went wrong
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ErrorDisplay 
          message={normalizedError.message}
          type={ErrorType.UNKNOWN}
          severity={ErrorSeverity.ERROR}
          details={
            process.env.NODE_ENV === 'development' 
              ? normalizedError.stack 
              : undefined
          }
        />
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
        >
          Reload page
        </Button>
        <Button 
          onClick={() => window.history.back()}
        >
          Go back
        </Button>
      </CardFooter>
    </Card>
  );
};

/**
 * Error boundary component that catches errors in its children and displays a fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by ErrorBoundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    // Call the optional onError callback provided by the parent
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleDismiss = () => {
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, FallbackComponent } = this.props;
    
    if (hasError && error) {
      const ErrorFallback = FallbackComponent || DefaultFallback;
      return <ErrorFallback error={error} />;
    }

    return children;
  }
}

/**
 * Higher-order component that wraps a component with an ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
): React.ComponentType<P> {
  const displayName = Component.displayName || Component.name || 'Component';
  
  const ComponentWithErrorBoundary = (props: P) => {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
  
  ComponentWithErrorBoundary.displayName = `WithErrorBoundary(${displayName})`;
  
  return ComponentWithErrorBoundary;
}