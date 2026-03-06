import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Copy, Eye, ShoppingCart, Clock,
  Calendar, Bell, Check, Download, Share2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/shared";
import StatusBadge from "@/components/shared/StatusBadge";
import Confetti from "@/components/Confetti";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { sanitizeName } from "@/lib/sanitize-name";

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
  showConfetti?: boolean;
  previousBalance?: number;
  currentBalance?: number;
  onViewOrders?: () => void;
  onNewOrder?: () => void;
  onClose?: () => void;
  className?: string;
}

export default function OrderSuccessCard({
  result,
  showConfetti = false,
  previousBalance,
  currentBalance,
  onViewOrders,
  onNewOrder,
  onClose,
  className,
}: OrderSuccessCardProps) {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCred, setCopiedCred] = useState<number | "all" | null>(null);
  const [open, setOpen] = useState(true);

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

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const generateReceipt = () => {
    const creds = credentialsList.length > 0
      ? credentialsList.map((c, i) => `<div style="background:#c9a22708;border:1px solid #c9a22720;border-radius:8px;padding:8px 12px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#c9a227;word-break:break-all;">${credentialsList.length > 1 ? `<span style="color:#888;margin-right:6px;">#${i+1}</span>` : ""}${c}</div>`).join("")
      : `<div style="background:#f59e0b10;border:1px solid #f59e0b25;border-radius:8px;padding:12px;color:#f59e0b;font-size:13px;text-align:center;">⏳ Manual fulfillment — credentials will be delivered soon</div>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Receipt</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;background:#0a0a0f;color:#e5e5e5;padding:40px}.r{max-width:440px;margin:0 auto;background:linear-gradient(145deg,#111118,#0d0d14);border:1px solid #c9a22730;border-radius:16px;padding:32px;position:relative;overflow:hidden}.r::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#c9a227,#ffd700,#c9a227)}.hd{text-align:center;margin-bottom:24px}.logo{font-size:22px;font-weight:700;background:linear-gradient(135deg,#c9a227,#ffd700);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.sub{font-size:11px;color:#666;margin-top:4px;letter-spacing:2px;text-transform:uppercase}.dv{border:none;border-top:1px dashed #ffffff0d;margin:20px 0}.rw{display:flex;justify-content:space-between;align-items:center;padding:8px 0;font-size:13px}.rw .l{color:#888}.rw .v{font-weight:500;text-align:right;max-width:60%}.amt .v{font-size:26px;font-weight:700;font-family:'JetBrains Mono',monospace;background:linear-gradient(135deg,#c9a227,#ffd700);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.pn{font-size:14px;font-weight:600;color:#e5e5e5;line-height:1.5;margin-bottom:4px}.creds{display:flex;flex-direction:column;gap:6px;margin-top:12px}.ft{text-align:center;margin-top:24px;font-size:10px;color:#444}</style></head><body><div class="r"><div class="hd"><div class="logo">KK Reseller Hub</div><div class="sub">Order Receipt</div></div><hr class="dv"/><div class="pn">${sanitizeName(result.product_name)}</div><hr class="dv"/><div class="rw amt"><span class="l">Amount</span><span class="v">${result.price.toLocaleString()} MMK</span></div><div class="rw"><span class="l">Order ID</span><span class="v" style="font-family:'JetBrains Mono',monospace;font-size:12px">#${orderId}</span></div><div class="rw"><span class="l">Date</span><span class="v">${formattedDate}, ${formattedTime}</span></div><hr class="dv"/><div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${credentialsList.length > 0 ? "Credentials" : "Delivery"}</div><div class="creds">${creds}</div><hr class="dv"/><div class="ft"><p>Thank you for your order</p><p style="margin-top:4px">© ${new Date().getFullYear()} KKTech</p></div></div></body></html>`;
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
      ``, `📦 ${sanitizeName(result.product_name)}`,
      `💰 ${result.price.toLocaleString()} MMK`,
      `🔖 Order ID: #${orderId}`,
      `📅 ${formattedDate}, ${formattedTime}`,
      ...(credentialsList.length > 0 ? [``, `🔑 Credentials:`, ...credentialsList] : []),
    ].join("\n");
    if (navigator.share) {
      try { await navigator.share({ title: `Order #${orderId}`, text }); return; } catch {}
    }
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
              "w-[90%] max-w-[500px] max-h-[90vh] overflow-y-auto",
              "bg-card border border-border/40 rounded-xl",
              "shadow-[0_25px_60px_-12px_hsl(var(--foreground)/0.25)]",
              className,
            )}
          >
            {showConfetti && <Confetti />}

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-success/15 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <h2 className="text-base font-bold text-foreground">Order Placed Successfully!</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── BODY ── */}
            <div className="px-5 py-4 space-y-4">

              {/* Product + Amount */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Order Summary</p>
                <p className="text-sm font-semibold text-foreground leading-relaxed">
                  {sanitizeName(result.product_name)}
                </p>
                {result.quantity && result.quantity > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {result.quantity} accounts × <Money amount={result.unit_price || 0} compact />
                  </p>
                )}
              </div>

              {/* Details grid */}
              <div className="rounded-lg border border-border/30 bg-muted/20 p-4 space-y-3">
                {/* Amount */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-xl font-bold font-mono tabular-nums text-foreground">
                    <Money amount={result.price} />
                  </span>
                </div>

                {/* Order ID */}
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

              {/* ── DELIVERY / CREDENTIALS ── */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Delivery Status
                </p>

                {isManual ? (
                  <div className="flex items-start gap-3 rounded-lg bg-accent/5 border border-accent/15 p-3.5">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-4 h-4 text-accent" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Manual order in progress</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        ⏳ Your order is being processed manually. You will receive credentials via Telegram
                        {result.delivery_time ? ` within ${result.delivery_time}.` : " within 30 minutes."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {credentialsList.map((cred, i) => (
                        <div key={i} className="flex items-center gap-2">
                          {credentialsList.length > 1 && (
                            <span className="text-[10px] text-muted-foreground font-mono w-5 shrink-0">#{i + 1}</span>
                          )}
                          <code className="flex-1 text-xs font-mono text-primary bg-primary/5 border border-primary/10 px-3 py-2 rounded-lg break-all">
                            {cred}
                          </code>
                          <button
                            onClick={() => copyText(cred, () => { setCopiedCred(i); setTimeout(() => setCopiedCred(null), 2000); })}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          >
                            {copiedCred === i ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
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
                  </div>
                )}
              </div>
            </div>

            {/* ── FOOTER ── */}
            <div className="px-5 pb-5 pt-2 space-y-3 border-t border-border/30">
              {/* Action buttons */}
              <div className="flex gap-2.5">
                <Button className="flex-1 h-10 gap-2 font-medium text-sm" onClick={handleViewOrders}>
                  <Eye className="w-4 h-4" />
                  View My Orders
                </Button>
                <Button variant="outline" className="flex-1 h-10 gap-2 font-medium text-sm border-border/40" onClick={handleNewOrder}>
                  <ShoppingCart className="w-4 h-4" />
                  Place New Order
                </Button>
              </div>

              {/* Download / Share links */}
              <div className="flex items-center justify-center gap-4">
                <button onClick={generateReceipt} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Download className="w-3.5 h-3.5" />
                  Download Receipt
                </button>
                <span className="text-border">·</span>
                <button onClick={handleShare} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
