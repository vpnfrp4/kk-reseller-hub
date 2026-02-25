import {
  CheckCircle2,
  Copy,
  ShoppingCart,
  Eye,
  BadgePercent,
  Wallet,
  Calendar,
  Hash,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCountUp } from "@/hooks/use-count-up";
import { Money } from "@/components/shared";
import Confetti from "@/components/Confetti";
import { cn } from "@/lib/utils";
import { t, useT } from "@/lib/i18n";

interface PurchaseResult {
  order_id: string;
  credentials: string;
  product_name: string;
  price: number;
  quantity?: number;
  unit_price?: number;
}

interface PurchaseSuccessModalProps {
  result: PurchaseResult | null;
  onClose: () => void;
  totalSavings?: number;
}

export default function PurchaseSuccessModal({
  result,
  onClose,
  totalSavings = 0,
}: PurchaseSuccessModalProps) {
  const l = useT();
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const showConfetti = totalSavings >= 10000;

  const currentBalance = profile?.balance ?? 0;
  const previousBalance = currentBalance + (result?.price ?? 0);

  const animatedBalance = useCountUp(result ? currentBalance : 0, 700);

  const copyCredentials = (creds: string) => {
    navigator.clipboard.writeText(creds);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const credentialsList =
    result?.credentials?.split("\n").filter(Boolean) || [];

  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Dialog open={!!result} onOpenChange={() => onClose()}>
      <DialogContent
        className={cn(
          "bg-card border-border/30 max-w-md p-0 gap-0 overflow-hidden",
          "shadow-[0_25px_60px_-12px_hsl(var(--foreground)/0.15)]",
          "rounded-[20px] animate-scale-in"
        )}
      >
        {showConfetti && <Confetti />}

        {result && (
          <div className="p-7 space-y-6">
            {/* ── SUCCESS HEADER ── */}
            <div className="text-center space-y-3 animate-fade-in">
              <div
                className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto"
                style={{
                  boxShadow: "0 0 30px hsl(var(--success) / 0.15)",
                }}
              >
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {l(t.success.orderComplete)}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {l(t.success.processed)}
                </p>
              </div>
            </div>

            {/* ── ORDER SUMMARY CARD ── */}
            <div
              className={cn(
                "rounded-[var(--radius-card)] border border-border/40",
                "bg-muted/30 p-4 space-y-3",
                "animate-fade-in [animation-delay:0.1s]"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    {result.product_name}
                  </p>
                  {result.quantity && result.quantity > 1 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {result.quantity} {l(t.products.accounts)} ×{" "}
                      {(result.unit_price || 0).toLocaleString()} MMK
                    </p>
                  )}
                </div>
                <p className="text-lg font-bold font-mono tabular-nums text-foreground">
                  <Money amount={result.price} />
                </p>
              </div>

              <div className="h-px bg-border/40" />

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Hash className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-mono truncate">
                    {result.order_id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground justify-end">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {formattedDate}, {formattedTime}
                  </span>
                </div>
              </div>
            </div>

            {/* ── CREDENTIALS ── */}
            <div
              className={cn(
                "rounded-[var(--radius-card)] border border-border/40",
                "bg-muted/30 p-4 space-y-2",
                "animate-fade-in [animation-delay:0.15s]"
              )}
            >
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {l(t.success.credentials)}{" "}
                {credentialsList.length > 1
                  ? `(${credentialsList.length})`
                  : ""}
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {credentialsList.map((cred, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {credentialsList.length > 1 && (
                      <span className="text-[10px] text-muted-foreground font-mono w-5 shrink-0">
                        #{i + 1}
                      </span>
                    )}
                    <code className="flex-1 text-xs font-mono text-primary bg-primary/5 border border-primary/10 px-3 py-2 rounded-lg break-all">
                      {cred}
                    </code>
                    <button
                      onClick={() => copyCredentials(cred)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {credentialsList.length > 1 && (
                <button
                  onClick={() => copyCredentials(result.credentials)}
                  className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  {copied ? l(t.success.copiedAll) : l(t.success.copyAll)}
                </button>
              )}
              {credentialsList.length === 1 && copied && (
                <p className="text-xs text-success font-medium">{l(t.success.copied)}</p>
              )}
            </div>

            {/* ── WALLET BALANCE UPDATE ── */}
            <div
              className={cn(
                "rounded-[var(--radius-card)] border border-border/40",
                "bg-muted/30 p-4",
                "animate-fade-in [animation-delay:0.2s]"
              )}
            >
              <div className="flex items-center gap-1.5 mb-3">
                <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {l(t.success.walletBalance)}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-xs text-muted-foreground mb-0.5">
                    {l(t.success.previous)}
                  </p>
                  <p className="font-mono text-sm font-semibold text-muted-foreground tabular-nums line-through decoration-muted-foreground/30">
                    {previousBalance.toLocaleString()}
                  </p>
                </div>
                <div className="text-muted-foreground/30 text-lg px-2">→</div>
                <div className="text-center flex-1">
                  <p className="text-xs text-muted-foreground mb-0.5">
                    {l(t.success.current)}
                  </p>
                  <p className="font-mono text-lg font-bold text-foreground tabular-nums">
                    {animatedBalance.toLocaleString()}
                    <span className="text-xs font-semibold text-muted-foreground ml-1">
                      MMK
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* ── SAVINGS BADGE ── */}
            {totalSavings > 0 && (
              <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-success/10 border border-success/20 animate-fade-in [animation-delay:0.25s]">
                <BadgePercent className="w-4 h-4 text-success" />
                <span className="text-sm font-semibold text-success">
                  {l(t.success.saved)} {totalSavings.toLocaleString()} MMK
                  {showConfetti ? " 🎉" : ""}
                </span>
              </div>
            )}

            {/* ── INFO ── */}
            <p className="text-[11px] text-muted-foreground/60 text-center">
              {l(t.success.savedInHistory)}
            </p>

            {/* ── CTA SECTION ── */}
            <div
              className={cn(
                "flex flex-col sm:flex-row gap-2.5",
                "animate-fade-in [animation-delay:0.3s]"
              )}
            >
              <Button
                className="flex-1 h-11 gap-2 btn-glow font-medium"
                onClick={() => {
                  onClose();
                  navigate("/dashboard/orders");
                }}
              >
                <Eye className="w-4 h-4" />
                {l(t.success.viewOrder)}
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-11 gap-2 btn-glass font-medium"
                onClick={() => {
                  onClose();
                  navigate("/dashboard/products");
                }}
              >
                <ShoppingCart className="w-4 h-4" />
                {l(t.success.continueShopping)}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}