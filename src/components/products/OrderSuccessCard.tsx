import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Copy, Eye, ShoppingCart, Clock,
  Calendar, Check, Download, Share2, X,
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
      ? credentialsList.map((c, i) => `<div style="background:#0d9488 0a;border:1px solid #0d948820;border-radius:8px;padding:8px 12px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#0d9488;word-break:break-all;">${credentialsList.length > 1 ? `<span style="color:#888;margin-right:6px;">#${i+1}</span>` : ""}${c}</div>`).join("")
      : `<div style="background:#f59e0b10;border:1px solid #f59e0b25;border-radius:8px;padding:12px;color:#f59e0b;font-size:13px;text-align:center;">Manual fulfillment — credentials will be delivered soon</div>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Receipt</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;background:#f8fafb;color:#1a2332;padding:40px}.r{max-width:440px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;position:relative;overflow:hidden}.r::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#0d9488,#14b8a6,#0d9488)}.hd{text-align:center;margin-bottom:24px}.logo{font-size:22px;font-weight:700;color:#0d9488}.sub{font-size:11px;color:#888;margin-top:4px;letter-spacing:2px;text-transform:uppercase}.dv{border:none;border-top:1px solid #f0f0f0;margin:20px 0}.rw{display:flex;justify-content:space-between;align-items:center;padding:8px 0;font-size:13px}.rw .l{color:#888}.rw .v{font-weight:500;text-align:right;max-width:60%}.amt .v{font-size:26px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#0d9488}.pn{font-size:14px;font-weight:600;color:#1a2332;line-height:1.5;margin-bottom:4px}.creds{display:flex;flex-direction:column;gap:6px;margin-top:12px}.ft{text-align:center;margin-top:24px;font-size:10px;color:#aaa}</style></head><body><div class="r"><div class="hd"><div class="logo">KK Reseller Hub</div><div class="sub">Order Receipt</div></div><hr class="dv"/><div class="pn">${sanitizeName(result.product_name)}</div><hr class="dv"/><div class="rw amt"><span class="l">Amount</span><span class="v">${result.price.toLocaleString()} MMK</span></div><div class="rw"><span class="l">Order ID</span><span class="v" style="font-family:'JetBrains Mono',monospace;font-size:12px">#${orderId}</span></div><div class="rw"><span class="l">Date</span><span class="v">${formattedDate}, ${formattedTime}</span></div><hr class="dv"/><div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${credentialsList.length > 0 ? "Credentials" : "Delivery"}</div><div class="creds">${creds}</div><hr class="dv"/><div class="ft"><p>Thank you for your order</p><p style="margin-top:4px">&copy; ${new Date().getFullYear()} KKTech</p></div></div></body></html>`;
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
      `Order Confirmed — KK Reseller Hub`,
      ``, `${sanitizeName(result.product_name)}`,
      `${result.price.toLocaleString()} MMK`,
      `Order ID: #${orderId}`,
      `${formattedDate}, ${formattedTime}`,
      ...(credentialsList.length > 0 ? [``, `Credentials:`, ...credentialsList] : []),
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
            className="fixed inset-0 z-50 bg-background/60 backdrop-blur-[10px]"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className={cn(
              "fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
              "w-[92%] max-w-[460px] max-h-[90vh] overflow-y-auto",
              "bg-card border border-border rounded-[var(--radius-modal)]",
              "shadow-[0_25px_60px_-12px_hsl(var(--foreground)/0.15)]",
              className,
            )}
          >
            {showConfetti && <Confetti />}

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* ── SUCCESS ICON ── */}
            <div className="flex flex-col items-center pt-8 pb-3">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.15 }}
                className="relative"
              >
                <div className="w-14 h-14 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-success" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-center mt-3"
              >
                <h2 className="text-lg font-bold text-foreground">
                  Order Placed Successfully
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Your order has been confirmed and is being processed
                </p>
              </motion.div>
            </div>

            {/* ── ORDER SUMMARY CARD ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mx-5 mb-4"
            >
              <div className="rounded-xl border border-border/50 bg-secondary/30 p-4 space-y-3">
                <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground">
                  Order Summary
                </p>

                {/* Service Name */}
                <p className="text-sm font-semibold text-foreground leading-relaxed">
                  {sanitizeName(result.product_name)}
                </p>
                {result.quantity && result.quantity > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {result.quantity} accounts
                  </p>
                )}

                <div className="border-t border-border/30" />

                {/* Details rows */}
                <div className="space-y-2.5">
                  {/* Order ID */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Order ID</span>
                    <button
                      onClick={() => copyText(orderId, () => { setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); })}
                      className="flex items-center gap-1.5 group"
                    >
                      <span className="font-mono text-xs font-semibold text-foreground">
                        #{orderId}
                      </span>
                      {copiedId ? (
                        <Check className="w-3 h-3 text-success" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                      )}
                    </button>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Amount Charged</span>
                    <span className="text-base font-bold font-mono tabular-nums text-primary">
                      <Money amount={result.price} />
                    </span>
                  </div>

                  {/* Date */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Date</span>
                    <span className="text-xs text-foreground flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      {formattedDate}, {formattedTime}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <StatusBadge status={status} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── DELIVERY / CREDENTIALS ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mx-5 mb-4"
            >
              {isManual ? (
                <div className="flex items-start gap-3 rounded-xl bg-warning/5 border border-warning/15 p-3.5">
                  <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4 text-warning" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Manual order in progress</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Your order is being processed manually. You will receive credentials via Telegram
                      {result.delivery_time ? ` within ${result.delivery_time}.` : " within 30 minutes."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground">
                    Credentials
                  </p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {credentialsList.map((cred, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {credentialsList.length > 1 && (
                          <span className="text-[10px] font-mono w-5 shrink-0 text-muted-foreground">#{i + 1}</span>
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
                      {copiedCred === "all" ? "Copied all!" : "Copy all credentials"}
                    </button>
                  )}
                  {credentialsList.length === 1 && copiedCred === 0 && (
                    <p className="text-xs text-success font-medium">Copied to clipboard</p>
                  )}
                </div>
              )}
            </motion.div>

            {/* ── ACTION BUTTONS ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mx-5 mb-5 space-y-2.5"
            >
              <Button className="w-full h-11 gap-2 font-semibold text-sm" onClick={handleViewOrders}>
                <Eye className="w-4 h-4" />
                View Order History
              </Button>

              <Button variant="outline" className="w-full h-11 gap-2 font-medium text-sm" onClick={handleNewOrder}>
                <ShoppingCart className="w-4 h-4" />
                Place Another Order
              </Button>

              {/* Download / Share links */}
              <div className="flex items-center justify-center gap-4 pt-1">
                <button onClick={generateReceipt} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Download className="w-3.5 h-3.5" />
                  Download Receipt
                </button>
                <span className="text-border">|</span>
                <button onClick={handleShare} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
