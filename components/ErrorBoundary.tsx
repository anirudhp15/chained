"use client";

import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;

      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={this.state.error!}
            reset={() => this.setState({ hasError: false, error: undefined })}
          />
        );
      }

      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-400 mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-400 mb-4">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() =>
                this.setState({ hasError: false, error: undefined })
              }
              className="px-4 py-2 bg-lavender-500 text-white rounded hover:bg-lavender-600 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Custom hook error fallback component
function HookErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center p-8 max-w-md">
        <h1 className="text-xl font-bold text-red-400 mb-4">
          React Hook Error
        </h1>
        <p className="text-gray-400 mb-4 text-sm">
          {error.message.includes("useMemo")
            ? "There was an issue with React hooks initialization. This is often caused by provider configuration issues."
            : error.message}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-lavender-500 text-white rounded hover:bg-lavender-600 transition-colors mr-2"
        >
          Retry
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

// Specific error boundary for provider issues
export function ProviderErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ErrorBoundary fallback={HookErrorFallback}>{children}</ErrorBoundary>;
}
