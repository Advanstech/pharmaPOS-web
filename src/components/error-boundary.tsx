'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * React Error Boundary — required per route segment (coding-standards).
 * Catches render errors and shows a friendly recovery UI.
 * Shake animation + red highlight on error state (ui-ux non-negotiable).
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : 'Something went wrong. Please try again.';
    return { hasError: true, message };
  }

  override componentDidCatch(error: unknown, info: { componentStack: string }) {
    // Log error without PHI — no customer data in logs
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center p-8 rounded-lg border-2 border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 animate-shake"
        >
          <span className="text-2xl mb-3" aria-hidden="true">⚠️</span>
          <p className="font-semibold text-red-700 dark:text-red-300 text-center">
            Something went wrong
          </p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1 text-center max-w-sm">
            {this.state.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium min-h-[44px] transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
