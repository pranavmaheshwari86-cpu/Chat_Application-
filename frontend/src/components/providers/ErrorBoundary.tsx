'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-[#020617] text-[#e1e3e4]">
          <div className="flex flex-col items-center justify-center gap-4 text-center max-w-md p-6 border border-[#303435] rounded-xl bg-[#0b0f10] shadow-xl">
            <span className="material-symbols-outlined text-red-500 text-5xl mb-2">error</span>
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-[#8a9296] mb-4">
              We've encountered an unexpected error. Please try refreshing the page.
            </p>
            <button
              className="bg-[#E2B859] hover:bg-[#D1A03A] text-[#101415] px-6 py-2 rounded-full font-medium transition-colors"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
