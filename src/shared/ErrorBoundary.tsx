"use client";

import { Component, type ReactNode } from "react";

/**
 * Mounted in the `(workspace)` layout, which is the one subtree where
 * `data-theme` is set — so this fallback has to survive the light theme
 * too. It reaches for tokens rather than `text-white` for that reason: the
 * literal version rendered white-on-white for a light-theme user, on the
 * one screen they see when everything else has already failed.
 */

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-card bg-card px-6 text-center">
          <p className="text-4xl font-bold text-coral">!</p>
          <h2 className="mt-3 text-lg font-semibold text-ink">
            Something went wrong
          </h2>
          <p className="mt-2 max-w-sm text-sm text-ink-dim">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-6 inline-flex h-10 items-center rounded-full bg-[linear-gradient(90deg,var(--color-grad-from)_0%,var(--color-grad-to)_100%)] px-6 text-sm font-medium text-on-accent transition-opacity hover:opacity-90"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
