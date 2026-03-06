import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Copy, Eye, ShoppingCart, Clock,
  Hash, Calendar, Wallet, Bell, Check, Download, Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/shared";
import StatusBadge from "@/components/shared/StatusBadge";
import Confetti from "@/components/Confetti";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { sanitizeName } from "@/lib/sanitize-name";

const SPARKLES = [
  { x: -32, y: -28, size: 12, opacity: 0.9 },
  { x: 30, y: -30, size: 10, opacity: 0.8 },
  { x: -38, y: 8, size: 8, opacity: 0.7 },
  { x: 36, y: 12, size: 11, opacity: 0.85 },
  { x: -18, y: -38, size: 7, opacity: 0.6 },
  { x: 20, y: 34, size: 9, opacity: 0.75 },
  { x: -28, y: 30, size: 8, opacity: 0.65 },
  { x: 8, y: -40, size: 10, opacity: 0.8 },
];

export interface OrderSuccessData {
  order_id: string;
  credentials: string;
  product_name: string;
  price: number;
  quantity?: number;
  unit_price?: number;
  status?: string;
  fulfillment_mode?: string;
  delivery_time?: string;
}

interface OrderSuccessCardProps {
  result: OrderSuccessData;
  /** Show confetti animation */
  showConfetti?: boolean;
  /** Previous wallet balance (for animated transition) */
  previousBalance?: number;
  /** Current wallet balance */
  currentBalance?: number;
  /** Primary CTA action override */
  onViewOrders?: () => void;
  /** Secondary CTA action override */
  onNewOrder?: () => void;
  /** Extra className on root */
  className?: string;
}

export default function OrderSuccessCard({
  result,
  showConfetti = false,
  previousBalance,
  currentBalance,
  onViewOrders,
  onNewOrder,
  className,
}: OrderSuccessCardProps) {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCred, setCopiedCred] = useState<number | "all" | null>(null);

  const credentialsList = result.credentials?.split("\n").filter(Boolean) || [];
  const isManual = !credentialsList.length || result.fulfillment_mode === "manual";
  const orderId = result.order_id.slice(0, 8).toUpperCase();
  const status = result.status || (isManual ? "processing" : "delivered");

  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const formattedTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const copyText = (text: string, cb: () => void) => {
    navigator.clipboard.writeText(text);
    cb();
  };

  const handleViewOrders = onViewOrders || (() => navigate("/dashboard/orders"));
  const handleNewOrder = onNewOrder || (() => navigate("/dashboard/place-order"));

  const generateReceiptImage = () => {
    const creds = credentialsList.length > 0
      ? credentialsList.map((c, i) => `<div style="background:#c9a22708;border:1px solid #c9a22720;border-radius:8px;padding:8px 12px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#c9a227;word-break:break-all;">${credentialsList.length > 1 ? `<span style="color:#888;margin-right:6px;">#${i+1}</span>` : ""}${c}</div>`).join("")
      : `<div style="background:#f59e0b10;border:1px solid #f59e0b25;border-radius:8px;padding:12px;color:#f59e0b;font-size:13px;text-align:center;">⏳ Manual fulfillment — credentials will be delivered soon</div>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Order Receipt</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;background:#0a0a0f;color:#e5e5e5;padding:40px}
.r{max-width:440px;margin:0 auto;background:linear-gradient(145deg,#111118,#0d0d14);border:1px solid #c9a22730;border-radius:16px;padding:32px;position:relative;overflow:hidden}
.r::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#c9a227,#ffd700,#c9a227)}
.hd{text-align:center;margin-bottom:24px}.logo{font-size:22px;font-weight:700;background:linear-gradient(135deg,#c9a227,#ffd700);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.sub{font-size:11px;color:#666;margin-top:4px;letter-spacing:2px;text-transform:uppercase}
.ok{display:inline-flex;align-items:center;gap:6px;background:#16a34a18;color:#4ade80;font-size:12px;font-weight:600;padding:5px 14px;border-radius:20px;margin-top:12px;border:1px solid #4ade8025}
.dv{border:none;border-top:1px dashed #ffffff0d;margin:20px 0}
.rw{display:flex;justify-content:space-between;align-items:center;padding:8px 0;font-size:13px}.rw .l{color:#888}.rw .v{font-weight:500;text-align:right;max-width:60%}
.amt .v{font-size:26px;font-weight:700;font-family:'JetBrains Mono',monospace;background:linear-gradient(135deg,#c9a227,#ffd700);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.pn{font-size:14px;font-weight:600;color:#e5e5e5;line-height:1.5;margin-bottom:4px}
.creds{display:flex;flex-direction:column;gap:6px;margin-top:12px}
.ft{text-align:center;margin-top:24px;font-size:10px;color:#444}
</style></head><body><div class="r">
<div class="hd"><div class="logo">KK Reseller Hub</div><div class="sub">Order Receipt</div><div class="ok">✓ Order Confirmed</div></div>
<hr class="dv"/>
<div class="pn">${sanitizeName(result.product_name)}</div>
${result.quantity && result.quantity > 1 ? `<div style="font-size:12px;color:#888;margin-bottom:4px">${result.quantity} accounts</div>` : ""}
<hr class="dv"/>
<div class="rw amt"><span class="l">Amount</span><span class="v">${result.price.toLocaleString()} MMK</span></div>
<div class="rw"><span class="l">Order ID</span><span class="v" style="font-family:'JetBrains Mono',monospace;font-size:12px">#${orderId}</span></div>
<div class="rw"><span class="l">Date</span><span class="v">${formattedDate}, ${formattedTime}</span></div>
<div class="rw"><span class="l">Status</span><span class="v" style="color:#4ade80">${isManual ? "Processing" : "Delivered"}</span></div>
<hr class="dv"/>
<div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${credentialsList.length > 0 ? "Credentials" : "Delivery"}</div>
<div class="creds">${creds}</div>
<hr class="dv"/>
<div class="ft"><p>Thank you for your order</p><p style="margin-top:4px">© ${new Date().getFullYear()} KKTech · kk-reseller-hub.lovable.app</p></div>
</div></body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `order-receipt-${orderId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const text = [
      `✅ Order Confirmed — KK Reseller Hub`,
      ``,
      `📦 ${sanitizeName(result.product_name)}`,
      `💰 ${result.price.toLocaleString()} MMK`,
      `🔖 Order ID: #${orderId}`,
      `📅 ${formattedDate}, ${formattedTime}`,
      ...(credentialsList.length > 0 ? [``, `🔑 Credentials:`, ...credentialsList] : []),
    ].join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: `Order #${orderId}`, text });
        return;
      } catch { /* user cancelled */ }
    }
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className={cn("space-y-5", className)}>
      {showConfetti && <Confetti />}

      {/* ── SUCCESS HEADER ── */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="text-center space-y-3 pt-2"
      >
        <div className="relative w-20 h-20 mx-auto">
          {/* Sparkle particles */}
          {SPARKLES.map((s, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
              animate={{
                scale: [0, 1.2, 0],
                opacity: [0, 1, 0],
                x: s.x,
                y: s.y,
              }}
              transition={{ delay: 0.3 + i * 0.06, duration: 0.7, ease: "easeOut" }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L13.5 9.5L21 12L13.5 14.5L12 22L10.5 14.5L3 12L10.5 9.5L12 2Z"
                  className="fill-success"
                  opacity={s.opacity}
                />
              </svg>
            </motion.div>
          ))}
          {/* Ring burst */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0.6 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0 rounded-full border-2 border-success/40"
          />
          <motion.div
            initial={{ scale: 0.5, opacity: 0.4 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ delay: 0.35, duration: 0.7, ease: "easeOut" }}
            className="absolute inset-0 rounded-full border border-success/25"
          />
          {/* Checkmark icon */}
          <div
            className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center ring-4 ring-success/5 relative z-10"
            style={{ boxShadow: "0 0 40px hsl(var(--success) / 0.2)" }}
          >
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Order Placed Successfully!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your order has been confirmed and is being processed
          </p>
        </div>
      </motion.div>

      {/* ── ORDER SUMMARY CARD ── */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-[var(--radius-card)] border border-border/40 bg-muted/20 overflow-hidden"
      >
        {/* Product name header */}
        <div className="px-5 pt-5 pb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Order Summary</p>
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-relaxed">
            {sanitizeName(result.product_name)}
          </p>
          {result.quantity && result.quantity > 1 && (
            <p className="text-xs text-muted-foreground mt-1">
              {result.quantity} accounts × <Money amount={result.unit_price || 0} compact />
            </p>
          )}
        </div>

        <div className="h-px bg-border/30 mx-5" />

        {/* Details grid */}
        <div className="px-5 py-4 space-y-3">
          {/* Amount - large */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="text-xl font-bold font-mono tabular-nums text-foreground">
              <Money amount={result.price} />
            </span>
          </div>

          {/* Order ID with copy */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Order ID</span>
            <button
              onClick={() => copyText(orderId, () => { setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); })}
              className="flex items-center gap-1.5 group"
            >
              <span className="font-mono text-xs font-semibold text-foreground">{orderId}</span>
              {copiedId ? (
                <Check className="w-3.5 h-3.5 text-success" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
            </button>
          </div>

          {/* Date */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Date</span>
            <span className="text-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              {formattedDate}, {formattedTime}
            </span>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge status={status} />
          </div>
        </div>
      </motion.div>

      {/* ── DELIVERY / CREDENTIALS SECTION ── */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-[var(--radius-card)] border border-border/40 bg-muted/20 p-5 space-y-3"
      >
        {isManual ? (
          /* ── MANUAL: "What's Next?" ── */
          <>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              What's Next?
            </p>
            <div className="flex items-start gap-3 rounded-lg bg-accent/5 border border-accent/15 p-4">
              <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4.5 h-4.5 text-accent" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Manual order in progress</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You will receive your credentials via Telegram notification and in your order history
                  {result.delivery_time
                    ? ` within ${result.delivery_time}.`
                    : " shortly."
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <Bell className="w-3.5 h-3.5" />
              <span>We'll notify you when your order is ready</span>
            </div>
          </>
        ) : (
          /* ── INSTANT: Show credentials ── */
          <>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Your Credentials {credentialsList.length > 1 ? `(${credentialsList.length})` : ""}
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {credentialsList.map((cred, i) => (
                <div key={i} className="flex items-center gap-2">
                  {credentialsList.length > 1 && (
                    <span className="text-[10px] text-muted-foreground font-mono w-5 shrink-0">
                      #{i + 1}
                    </span>
                  )}
                  <code className="flex-1 text-xs font-mono text-primary bg-primary/5 border border-primary/10 px-3 py-2.5 rounded-lg break-all">
                    {cred}
                  </code>
                  <button
                    onClick={() => copyText(cred, () => { setCopiedCred(i); setTimeout(() => setCopiedCred(null), 2000); })}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    {copiedCred === i ? (
                      <Check className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
            {credentialsList.length > 1 && (
              <button
                onClick={() => copyText(result.credentials, () => { setCopiedCred("all"); setTimeout(() => setCopiedCred(null), 2000); })}
                className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
              >
                {copiedCred === "all" ? "✓ Copied all!" : "Copy all credentials"}
              </button>
            )}
            {credentialsList.length === 1 && copiedCred === 0 && (
              <p className="text-xs text-success font-medium">✓ Copied to clipboard</p>
            )}
          </>
        )}
      </motion.div>

      {/* ── WALLET BALANCE (optional) ── */}
      {previousBalance != null && currentBalance != null && (
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-[var(--radius-card)] border border-border/40 bg-muted/20 p-5"
        >
          <div className="flex items-center gap-1.5 mb-3">
            <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Wallet Balance
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-[10px] text-muted-foreground mb-1">Previous</p>
              <p className="font-mono text-sm text-muted-foreground tabular-nums line-through decoration-muted-foreground/30">
                {previousBalance.toLocaleString()} MMK
              </p>
            </div>
            <div className="text-muted-foreground/30 text-lg px-3">→</div>
            <div className="text-center flex-1">
              <p className="text-[10px] text-muted-foreground mb-1">Current</p>
              <p className="font-mono text-lg font-bold text-foreground tabular-nums">
                {currentBalance.toLocaleString()}
                <span className="text-xs text-muted-foreground ml-1">MMK</span>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── CTA BUTTONS ── */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="flex flex-col sm:flex-row gap-2.5"
      >
        <Button
          className="flex-1 h-11 gap-2 font-medium"
          onClick={handleViewOrders}
        >
          <Eye className="w-4 h-4" />
          View My Orders
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-11 gap-2 font-medium border-border/40"
          onClick={handleNewOrder}
        >
          <ShoppingCart className="w-4 h-4" />
          Place New Order
        </Button>
      </motion.div>

      {/* ── FOOTER NOTE ── */}
      <p className="text-[11px] text-muted-foreground/50 text-center">
        Order details are saved in your order history
      </p>
    </div>
  );
}
