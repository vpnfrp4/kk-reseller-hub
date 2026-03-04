import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);

    // Log to Supabase for tracking (fire-and-forget)
    try {
      supabase.from("api_logs").insert({
        action: "client_error",
        log_type: "error_boundary",
        error_message: `${error.message}\n\nComponent Stack: ${errorInfo.componentStack}`,
        request_url: window.location.href,
        success: false,
      }).then(() => {});
    } catch {
      // silently fail
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoToErrorPage = () => {
    const { error } = this.state;
    const params = new URLSearchParams({
      message: error?.message || "Unknown error",
      timestamp: Date.now().toString(),
    });
    window.location.href = `/error?${params.toString()}`;
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                An unexpected error occurred. Please try refreshing the page.
              </p>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left rounded-lg bg-destructive/5 border border-destructive/10 p-4">
                <summary className="text-xs font-semibold text-destructive cursor-pointer">Error Details</summary>
                <pre className="text-[11px] text-destructive/80 mt-2 whitespace-pre-wrap break-all font-mono">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-btn)] bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleGoToErrorPage}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-btn)] bg-secondary border border-border text-sm font-semibold text-foreground hover:bg-muted transition-all"
              >
                Get Help
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
