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
      ? credentialsList.map((c, i) => `<div style="background:#0ea5e908;border:1px solid #0ea5e920;border-radius:8px;padding:8px 12px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#0ea5e9;word-break:break-all;">${credentialsList.length > 1 ? `<span style="color:#888;margin-right:6px;">#${i+1}</span>` : ""}${c}</div>`).join("")
      : `<div style="background:#f59e0b10;border:1px solid #f59e0b25;border-radius:8px;padding:12px;color:#f59e0b;font-size:13px;text-align:center;">Manual fulfillment — credentials will be delivered soon</div>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Receipt</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;background:#0D1117;color:#e5e5e5;padding:40px}.r{max-width:440px;margin:0 auto;background:linear-gradient(145deg,#161b22,#0d1117);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;position:relative;overflow:hidden}.r::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#0ea5e9,#22d3ee,#0ea5e9)}.hd{text-align:center;margin-bottom:24px}.logo{font-size:22px;font-weight:700;background:linear-gradient(135deg,#0ea5e9,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.sub{font-size:11px;color:#666;margin-top:4px;letter-spacing:2px;text-transform:uppercase}.dv{border:none;border-top:1px dashed #ffffff0d;margin:20px 0}.rw{display:flex;justify-content:space-between;align-items:center;padding:8px 0;font-size:13px}.rw .l{color:#888}.rw .v{font-weight:500;text-align:right;max-width:60%}.amt .v{font-size:26px;font-weight:700;font-family:'JetBrains Mono',monospace;background:linear-gradient(135deg,#22c55e,#4ade80);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.pn{font-size:14px;font-weight:600;color:#e5e5e5;line-height:1.5;margin-bottom:4px}.creds{display:flex;flex-direction:column;gap:6px;margin-top:12px}.ft{text-align:center;margin-top:24px;font-size:10px;color:#444}</style></head><body><div class="r"><div class="hd"><div class="logo">KK Reseller Hub</div><div class="sub">Order Receipt</div></div><hr class="dv"/><div class="pn">${sanitizeName(result.product_name)}</div><hr class="dv"/><div class="rw amt"><span class="l">Amount</span><span class="v">${result.price.toLocaleString()} MMK</span></div><div class="rw"><span class="l">Order ID</span><span class="v" style="font-family:'JetBrains Mono',monospace;font-size:12px">#${orderId}</span></div><div class="rw"><span class="l">Date</span><span class="v">${formattedDate}, ${formattedTime}</span></div><hr class="dv"/><div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${credentialsList.length > 0 ? "Credentials" : "Delivery"}</div><div class="creds">${creds}</div><hr class="dv"/><div class="ft"><p>Thank you for your order</p><p style="margin-top:4px">&copy; ${new Date().getFullYear()} KKTech</p></div></div></body></html>`;
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
          {/* Overlay — deep dark with backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className={cn(
              "fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
              "w-[92%] max-w-[460px] max-h-[90vh] overflow-y-auto",
              className,
            )}
            style={{
              background: "linear-gradient(160deg, #161b22, #0d1117)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "16px",
              boxShadow: "0 32px 64px -16px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04)",
            }}
          >
            {showConfetti && <Confetti />}

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-lg transition-colors"
              style={{ color: "rgba(255,255,255,0.4)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
            >
              <X className="w-4 h-4" />
            </button>

            {/* ── SUCCESS ICON ── */}
            <div className="flex flex-col items-center pt-8 pb-4">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.15 }}
                className="relative"
              >
                {/* Glow ring */}
                <div
                  className="absolute inset-0 rounded-full animate-pulse"
                  style={{
                    background: "radial-gradient(circle, rgba(34, 197, 94, 0.25) 0%, transparent 70%)",
                    transform: "scale(2.2)",
                  }}
                />
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center relative"
                  style={{
                    background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))",
                    border: "1.5px solid rgba(34, 197, 94, 0.3)",
                    boxShadow: "0 0 24px rgba(34, 197, 94, 0.2)",
                  }}
                >
                  <CheckCircle2 className="w-8 h-8" style={{ color: "#22c55e" }} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-center mt-4"
              >
                <h2 className="text-lg font-bold" style={{ color: "#f0f6fc" }}>
                  Order Placed Successfully
                </h2>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
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
              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <p className="text-[10px] uppercase tracking-[0.15em] font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Order Summary
                </p>

                {/* Service Name */}
                <p className="text-sm font-semibold leading-relaxed" style={{ color: "#f0f6fc" }}>
                  {sanitizeName(result.product_name)}
                </p>
                {result.quantity && result.quantity > 1 && (
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {result.quantity} accounts
                  </p>
                )}

                {/* Divider */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

                {/* Details rows */}
                <div className="space-y-2.5">
                  {/* Order ID */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Order ID</span>
                    <button
                      onClick={() => copyText(orderId, () => { setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); })}
                      className="flex items-center gap-1.5 group"
                    >
                      <span className="font-mono text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
                        #{orderId}
                      </span>
                      {copiedId ? (
                        <Check className="w-3 h-3" style={{ color: "#22c55e" }} />
                      ) : (
                        <Copy className="w-3 h-3 transition-colors" style={{ color: "rgba(255,255,255,0.3)" }} />
                      )}
                    </button>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Amount Charged</span>
                    <span className="text-base font-bold font-mono tabular-nums" style={{ color: "#22c55e" }}>
                      <Money amount={result.price} />
                    </span>
                  </div>

                  {/* Date */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Date</span>
                    <span className="text-xs flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                      <Calendar className="w-3 h-3" style={{ color: "rgba(255,255,255,0.3)" }} />
                      {formattedDate}, {formattedTime}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Status</span>
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
                <div
                  className="flex items-start gap-3 rounded-xl p-3.5"
                  style={{
                    background: "rgba(245, 158, 11, 0.05)",
                    border: "1px solid rgba(245, 158, 11, 0.12)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "rgba(245, 158, 11, 0.1)" }}
                  >
                    <Clock className="w-4 h-4" style={{ color: "#f59e0b" }} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium" style={{ color: "#f0f6fc" }}>Manual order in progress</p>
                    <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Your order is being processed manually. You will receive credentials via Telegram
                      {result.delivery_time ? ` within ${result.delivery_time}.` : " within 30 minutes."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.15em] font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Credentials
                  </p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {credentialsList.map((cred, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {credentialsList.length > 1 && (
                          <span className="text-[10px] font-mono w-5 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>#{i + 1}</span>
                        )}
                        <code
                          className="flex-1 text-xs font-mono px-3 py-2 rounded-lg break-all"
                          style={{
                            color: "#0ea5e9",
                            background: "rgba(14, 165, 233, 0.06)",
                            border: "1px solid rgba(14, 165, 233, 0.12)",
                          }}
                        >
                          {cred}
                        </code>
                        <button
                          onClick={() => copyText(cred, () => { setCopiedCred(i); setTimeout(() => setCopiedCred(null), 2000); })}
                          className="p-1.5 rounded-lg transition-colors shrink-0"
                          style={{ color: "rgba(255,255,255,0.3)" }}
                        >
                          {copiedCred === i ? <Check className="w-3.5 h-3.5" style={{ color: "#22c55e" }} /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                  {credentialsList.length > 1 && (
                    <button
                      onClick={() => copyText(result.credentials, () => { setCopiedCred("all"); setTimeout(() => setCopiedCred(null), 2000); })}
                      className="text-xs font-medium transition-colors"
                      style={{ color: "#0ea5e9" }}
                    >
                      {copiedCred === "all" ? "Copied all!" : "Copy all credentials"}
                    </button>
                  )}
                  {credentialsList.length === 1 && copiedCred === 0 && (
                    <p className="text-xs font-medium" style={{ color: "#22c55e" }}>Copied to clipboard</p>
                  )}
                </div>
              )}
            </motion.div>

            {/* ── ACTION BUTTONS ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mx-5 mb-5 space-y-3"
            >
              {/* Primary: View Order History */}
              <button
                onClick={handleViewOrders}
                className="w-full flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200"
                style={{
                  height: "44px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                  color: "#ffffff",
                  boxShadow: "0 4px 12px rgba(14, 165, 233, 0.25)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(14, 165, 233, 0.35)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(14, 165, 233, 0.25)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <Eye className="w-4 h-4" />
                View Order History
              </button>

              {/* Secondary: Place Another Order */}
              <button
                onClick={handleNewOrder}
                className="w-full flex items-center justify-center gap-2 font-medium text-sm transition-all duration-200"
                style={{
                  height: "44px",
                  borderRadius: "10px",
                  background: "transparent",
                  color: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.85)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <ShoppingCart className="w-4 h-4" />
                Place Another Order
              </button>

              {/* Download / Share links */}
              <div className="flex items-center justify-center gap-4 pt-1">
                <button
                  onClick={generateReceipt}
                  className="flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Receipt
                </button>
                <span style={{ color: "rgba(255,255,255,0.1)" }}>|</span>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                >
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
