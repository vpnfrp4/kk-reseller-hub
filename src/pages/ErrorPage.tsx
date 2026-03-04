import { AlertTriangle, RefreshCw, Home, Copy, MessageCircle, Clock, Hash } from "lucide-react";
import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export default function ErrorPage() {
  const [searchParams] = useSearchParams();
  const errorMessage = searchParams.get("message") || undefined;
  const errorTimestamp = searchParams.get("timestamp") ? Number(searchParams.get("timestamp")) : Date.now();
  const [copied, setCopied] = useState(false);

  const errorId = useMemo(() => {
    const ts = errorTimestamp.toString(36);
    const rand = Math.random().toString(36).slice(2, 6);
    return `ERR-${ts}-${rand}`.toUpperCase();
  }, [errorTimestamp]);

  const errorTime = useMemo(() => {
    const d = new Date(errorTimestamp);
    return d.toLocaleString();
  }, [errorTimestamp]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(errorId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const supportMessage = encodeURIComponent(
    `Hi, I encountered an error on KKTech.\n\nError ID: ${errorId}\nTime: ${errorTime}\n${errorMessage ? `Details: ${errorMessage}` : ""}`
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-lg w-full space-y-8">
        {/* ─── Icon + Status ─── */}
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-2xl bg-destructive/10 border border-destructive/20 animate-pulse" />
            <div className="relative w-full h-full flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
          </div>
          <div>
            <p className="text-xs font-mono font-bold text-destructive tracking-widest uppercase mb-2">Error 500</p>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-sm mx-auto">
              An unexpected error occurred while processing your request. Our team has been notified.
            </p>
          </div>
        </div>

        {/* ─── Error Reference Card ─── */}
        <div className="rounded-xl bg-card border border-border/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Hash className="w-3.5 h-3.5" />
              <span className="font-mono font-semibold">{errorId}</span>
            </div>
            <button
              onClick={handleCopyId}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/20"
            >
              <Copy className="w-3 h-3" />
              {copied ? "Copied!" : "Copy ID"}
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
            <Clock className="w-3.5 h-3.5" />
            <span>{errorTime}</span>
          </div>
          {errorState?.message && (
            <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-3">
              <p className="text-[11px] font-mono text-destructive/80 break-all leading-relaxed">
                {errorState.message}
              </p>
            </div>
          )}
        </div>

        {/* ─── Actions ─── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[var(--radius-btn)] bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Page
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[var(--radius-btn)] bg-secondary border border-border text-sm font-semibold text-foreground hover:bg-muted transition-all"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>
        </div>

        {/* ─── Contact Support ─── */}
        <div className="rounded-xl bg-secondary/30 border border-border/20 p-5 text-center space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Need help?</p>
          <p className="text-sm text-muted-foreground">
            Contact our support team with your Error ID for faster resolution.
          </p>
          <a
            href={`https://t.me/kkaborr?text=${supportMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[var(--radius-btn)] bg-[hsl(200,80%,50%)] text-white text-sm font-semibold hover:brightness-110 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            Contact Support on Telegram
          </a>
        </div>

        {/* ─── Footer hint ─── */}
        <p className="text-center text-[10px] text-muted-foreground/40 uppercase tracking-widest">
          KKTech Reseller Hub
        </p>
      </div>
    </div>
  );
}
