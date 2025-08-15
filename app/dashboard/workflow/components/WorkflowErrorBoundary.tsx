// app/dashboard/workflow/components/WorkflowErrorBoundary.tsx

"use client";

import React, { Component } from 'react';
import type { ReactNode } from 'react';
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class WorkflowErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error details
    console.error('Workflow Error Boundary caught an error:', {
      error,
      errorInfo,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      });
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    } else {
      // Max retries reached, suggest page refresh
      window.location.reload();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  renderErrorDetails() {
    if (process.env.NODE_ENV !== 'development') {
      return null;
    }

    return (
      <details className="mt-6 p-4 bg-muted/20 rounded-xl border border-border/30">
        <summary className="cursor-pointer font-medium text-foreground mb-3">
          Error Details (Development Only)
        </summary>
        <div className="space-y-3 text-sm">
          <div>
            <strong className="text-foreground">Error:</strong>
            <pre className="mt-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-destructive overflow-auto text-xs">
              {this.state.error?.toString()}
            </pre>
          </div>
          {this.state.errorInfo && (
            <div>
              <strong className="text-foreground">Component Stack:</strong>
              <pre className="mt-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-destructive overflow-auto text-xs">
                {this.state.errorInfo.componentStack}
              </pre>
            </div>
          )}
        </div>
      </details>
    );
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="w-full max-w-lg border-border/60 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-destructive/10 rounded-2xl">
                  <AlertTriangle className="h-12 w-12 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-destructive text-xl">
                Workflow Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                  Something went wrong with the workflow component. This is usually temporary.
                </p>
                {this.state.retryCount > 0 && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm font-medium">
                      Retry attempt: {this.state.retryCount}/{this.maxRetries}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 justify-center">
                {this.state.retryCount < this.maxRetries ? (
                  <Button 
                    onClick={this.handleRetry}
                    variant="outline"
                    className="flex items-center gap-2 hover:bg-accent/80"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                ) : (
                  <Button 
                    onClick={this.handleReload}
                    variant="default"
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reload Page
                  </Button>
                )}
              </div>

              {this.renderErrorDetails()}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WorkflowErrorBoundary;
