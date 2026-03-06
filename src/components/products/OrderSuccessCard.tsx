import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Copy, Check, Download, Share2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/shared";
import Confetti from "@/components/Confetti";
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
  onClose,
}: OrderSuccessCardProps) {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCred, setCopiedCred] = useState<number | "all" | null>(null);
  const [open, setOpen] = useState(true);

  const credentialsList = result.credentials?.split("\n").filter(Boolean) || [];
  const isManual = !credentialsList.length || result.fulfillment_mode === "manual";
  const orderId = result.order_id.slice(0, 8).toUpperCase();

  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const formattedTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const copyText = (text: string, cb: () => void) => {
    navigator.clipboard.writeText(text);
    cb();
  };

  const handleViewOrders = onViewOrders || (() => navigate("/dashboard/orders"));

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const generateReceipt = () => {
    const creds = credentialsList.length > 0
      ? credentialsList.map((c, i) => `<div style="background:#0d9488 0a;border:1px solid #0d948820;border-radius:8px;padding:8px 12px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#0d9488;word-break:break-all;">${credentialsList.length > 1 ? `<span style="color:#888;margin-right:6px;">#${i+1}</span>` : ""}${c}</div>`).join("")
      : `<div style="background:#f59e0b10;border:1px solid #f59e0b25;border-radius:8px;padding:12px;color:#f59e0b;font-size:13px;text-align:center;">Manual fulfillment — credentials will be delivered soon</div>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Receipt</title></head><body style="font-family:system-ui;background:#f8fafb;padding:40px"><div style="max-width:440px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px"><div style="text-align:center;margin-bottom:24px"><div style="font-size:22px;font-weight:700;color:#0d9488">KK Reseller Hub</div><div style="font-size:11px;color:#888;margin-top:4px;letter-spacing:2px;text-transform:uppercase">Order Receipt</div></div><hr style="border:none;border-top:1px solid #f0f0f0;margin:20px 0"/><div style="font-size:14px;font-weight:600;margin-bottom:4px">${sanitizeName(result.product_name)}</div><hr style="border:none;border-top:1px solid #f0f0f0;margin:20px 0"/><div style="display:flex;justify-content:space-between;padding:8px 0"><span style="color:#888">Amount</span><span style="font-size:26px;font-weight:700;font-family:monospace;color:#0d9488">${result.price.toLocaleString()} MMK</span></div><div style="display:flex;justify-content:space-between;padding:8px 0"><span style="color:#888">Order ID</span><span style="font-family:monospace;font-size:12px">#${orderId}</span></div><div style="display:flex;justify-content:space-between;padding:8px 0"><span style="color:#888">Date</span><span>${formattedDate}, ${formattedTime}</span></div><hr style="border:none;border-top:1px solid #f0f0f0;margin:20px 0"/><div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${credentialsList.length > 0 ? "Credentials" : "Delivery"}</div><div style="display:flex;flex-direction:column;gap:6px">${creds}</div><hr style="border:none;border-top:1px solid #f0f0f0;margin:20px 0"/><div style="text-align:center;font-size:10px;color:#aaa"><p>Thank you for your order</p><p style="margin-top:4px">&copy; ${new Date().getFullYear()} KKTech</p></div></div></body></html>`;
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
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 9999 }}
        >
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-[92%] max-w-[440px] max-h-[90vh] overflow-y-auto rounded-[20px] border border-[rgba(255,255,255,0.1)]"
            style={{ background: "#0D1117" }}
          >
            {showConfetti && <Confetti />}

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-[#8b949e] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Success Icon */}
            <div className="flex flex-col items-center pt-8 pb-2">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.15 }}
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)", boxShadow: "0 0 40px rgba(16,185,129,0.2)" }}>
                  <CheckCircle2 className="w-9 h-9" style={{ color: "#10b981", filter: "drop-shadow(0 0 8px rgba(16,185,129,0.5))" }} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-center mt-4"
              >
                <h2 className="text-lg font-bold text-white">
                  Order Placed Successfully
                </h2>
                <p className="text-xs mt-1.5" style={{ color: "#8b949e" }}>
                  Your order has been confirmed and is being processed
                </p>
              </motion.div>
            </div>

            {/* Order Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mx-5 my-4"
            >
              <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[10px] uppercase tracking-[0.15em] font-semibold" style={{ color: "#8b949e" }}>
                  Order Summary
                </p>

                {/* Service Name */}
                <p className="text-sm font-semibold text-white text-center leading-relaxed">
                  {sanitizeName(result.product_name)}
                </p>
                {result.quantity && result.quantity > 1 && (
                  <p className="text-xs text-center" style={{ color: "#8b949e" }}>
                    {result.quantity} accounts
                  </p>
                )}

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

                {/* Details rows */}
                <div className="space-y-3">
                  {/* Order ID */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "#8b949e" }}>Order ID</span>
                    <button
                      onClick={() => copyText(orderId, () => { setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); })}
                      className="flex items-center gap-1.5 group"
                    >
                      <span className="font-mono text-xs font-semibold text-white">
                        #{orderId}
                      </span>
                      {copiedId ? (
                        <Check className="w-3 h-3" style={{ color: "#10b981" }} />
                      ) : (
                        <Copy className="w-3 h-3 group-hover:text-white transition-colors" style={{ color: "#8b949e" }} />
                      )}
                    </button>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "#8b949e" }}>Amount Charged</span>
                    <span className="text-base font-bold font-mono tabular-nums" style={{ color: "#10b981" }}>
                      <Money amount={result.price} />
                    </span>
                  </div>

                  {/* Date */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "#8b949e" }}>Date</span>
                    <span className="text-xs text-white">
                      {formattedDate}, {formattedTime}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Credentials / Manual */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mx-5 mb-4"
            >
              {isManual ? (
                <div className="flex items-start gap-3 rounded-xl p-3.5" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(245,158,11,0.1)" }}>
                    <CheckCircle2 className="w-4 h-4" style={{ color: "#f59e0b" }} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">Manual order in progress</p>
                    <p className="text-xs leading-relaxed" style={{ color: "#8b949e" }}>
                      Your order is being processed manually. You will receive credentials via Telegram
                      {result.delivery_time ? ` within ${result.delivery_time}.` : " within 30 minutes."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.15em] font-semibold" style={{ color: "#8b949e" }}>
                    Credentials
                  </p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {credentialsList.map((cred, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {credentialsList.length > 1 && (
                          <span className="text-[10px] font-mono w-5 shrink-0" style={{ color: "#8b949e" }}>#{i + 1}</span>
                        )}
                        <code className="flex-1 text-xs font-mono px-3 py-2 rounded-lg break-all" style={{ color: "#10b981", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.12)" }}>
                          {cred}
                        </code>
                        <button
                          onClick={() => copyText(cred, () => { setCopiedCred(i); setTimeout(() => setCopiedCred(null), 2000); })}
                          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0"
                          style={{ color: "#8b949e" }}
                        >
                          {copiedCred === i ? <Check className="w-3.5 h-3.5" style={{ color: "#10b981" }} /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                  {credentialsList.length > 1 && (
                    <button
                      onClick={() => copyText(result.credentials, () => { setCopiedCred("all"); setTimeout(() => setCopiedCred(null), 2000); })}
                      className="text-xs font-medium transition-colors"
                      style={{ color: "#10b981" }}
                    >
                      {copiedCred === "all" ? "Copied all!" : "Copy all credentials"}
                    </button>
                  )}
                  {credentialsList.length === 1 && copiedCred === 0 && (
                    <p className="text-xs font-medium" style={{ color: "#10b981" }}>Copied to clipboard</p>
                  )}
                </div>
              )}
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mx-5 space-y-2.5"
              style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }}
            >
              <button
                onClick={handleViewOrders}
                className="w-full h-12 rounded-xl font-semibold text-sm text-white transition-all hover:brightness-110"
                style={{ background: "linear-gradient(135deg, #0d9488, #0ea5e9)" }}
              >
                View My Orders
              </button>

              <button
                onClick={handleClose}
                className="w-full h-11 rounded-xl font-medium text-sm text-white/70 hover:text-white transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}
              >
                Close
              </button>

              {/* Download / Share */}
              <div className="flex items-center justify-center gap-4 pt-1">
                <button onClick={generateReceipt} className="flex items-center gap-1.5 text-xs transition-colors hover:text-white" style={{ color: "#8b949e" }}>
                  <Download className="w-3.5 h-3.5" />
                  Download Receipt
                </button>
                <span style={{ color: "rgba(255,255,255,0.1)" }}>|</span>
                <button onClick={handleShare} className="flex items-center gap-1.5 text-xs transition-colors hover:text-white" style={{ color: "#8b949e" }}>
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
