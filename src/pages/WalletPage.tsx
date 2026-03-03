import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "@/components/Breadcrumb";
import { useCountUp } from "@/hooks/use-count-up";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Copy,
  CheckCircle2,
  Shield,
  Upload,
  X,
  Loader2,
  Camera,
  CreditCard,
  UserCheck,
  AlertTriangle,
  BadgeCheck,
  Search,
  Clock,
  Smartphone,
  Send,
  FileCheck,
  CircleDollarSign,
} from "lucide-react";
import { downloadReceipt } from "@/lib/receipt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money, ResponsiveTable } from "@/components/shared";
import type { Column } from "@/components/shared";
import { t, useT } from "@/lib/i18n";
import MmLabel, { MmStatus } from "@/components/shared/MmLabel";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const PRESET_AMOUNTS = [10000, 30000, 50000, 100000];
const MIN_AMOUNT = 5000;

// Payment method logos/icons mapping
const METHOD_ICONS: Record<string, string> = {
  kpay: "💳",
  wavemoney: "📱",
  wave: "📱",
  cb: "🏦",
  cbpay: "🏦",
  aya: "🏧",
  ayapay: "🏧",
  kbz: "💰",
  kbzpay: "💰",
  binance: "₿",
  mpu: "🔒",
};

export default function WalletPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [balanceFlash, setBalanceFlash] = useState(false);
  const prevBalanceRef = useRef<number | null>(null);
  const l = useT();

  // Top-up form state
  const [topupAmount, setTopupAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submissionState, setSubmissionState] = useState<"idle" | "uploading" | "submitted">("idle");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [binanceTxId, setBinanceTxId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-verify state
  const [verifyTxId, setVerifyTxId] = useState("");
  const [verifying, setVerifying] = useState(false);

  const { data: transactions, refetch: refetchTransactions } = useQuery({
    queryKey: ["wallet-transactions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  // Set default selected method
  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0 && !selectedMethod) {
      setSelectedMethod(paymentMethods[0].method_id);
    }
  }, [paymentMethods]);

  useEffect(() => {
    const currentBalance = profile?.balance ?? 0;
    if (prevBalanceRef.current !== null && prevBalanceRef.current !== currentBalance) {
      setBalanceFlash(true);
      refetchTransactions();
      const timer = setTimeout(() => setBalanceFlash(false), 1500);
      return () => clearTimeout(timer);
    }
    prevBalanceRef.current = currentBalance;
  }, [profile?.balance]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('wallet-tx-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${user.id}` }, () => { refetchTransactions(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const totalDeposited = (transactions || [])
    .filter((t: any) => t.type === "topup" && t.status === "approved")
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const pendingTopups = (transactions || []).filter((t: any) => t.type === "topup" && t.status === "pending");

  const displayBalance = useCountUp(profile?.balance || 0);
  const parsedAmount = parseInt(topupAmount) || 0;
  const isAmountTooLow = topupAmount.length > 0 && parsedAmount < MIN_AMOUNT && parsedAmount > 0;
  const activeMethod = paymentMethods?.find((m: any) => m.method_id === selectedMethod);
  const isBinance = selectedMethod === "binance";

  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleFileSelect = useCallback((file: File | null) => {
    if (!file) return;
    setScreenshot(file);
    const reader = new FileReader();
    reader.onloadend = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFileSelect(file);
  }, [handleFileSelect]);

  const CopyButton = ({ text, label }: { text: string; label: string }) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); handleCopy(text, label); }}
      className={cn(
        "p-1.5 rounded-lg transition-all duration-200",
        copiedId === text
          ? "bg-success/10 text-success scale-110"
          : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/60"
      )}
    >
      {copiedId === text ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );

  const handleSubmitTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupAmount || !screenshot || !user?.id || parsedAmount < MIN_AMOUNT || !activeMethod) return;
    if (isBinance && !binanceTxId.trim()) return;
    setSubmissionState("uploading");

    try {
      const fileExt = screenshot.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("payment-screenshots").upload(filePath, screenshot);
      if (uploadError) throw uploadError;

      const methodLabel = activeMethod?.provider || selectedMethod;
      const description = isBinance
        ? `Wallet Top-up via ${methodLabel} (TxID: ${binanceTxId.trim()})`
        : `Wallet Top-up via ${methodLabel}`;

      const { data: insertedTx, error: insertError } = await supabase.from("wallet_transactions").insert({
        user_id: user.id, type: "topup", amount: parsedAmount, status: "pending",
        method: methodLabel, description, screenshot_url: filePath,
      }).select("id").single();

      if (insertError) throw insertError;
      setSubmissionState("submitted");
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });

      if (insertedTx?.id) {
        navigate(`/dashboard/topup-status/${insertedTx.id}`);
      }
    } catch (err) {
      console.error("Top-up error:", err);
      toast({ title: "Error", description: "Failed to submit top-up request. Please try again.", variant: "destructive" });
      setSubmissionState("idle");
    }
  };

  const handleVerifyPayment = async () => {
    if (!verifyTxId.trim() || !user?.id) return;
    setVerifying(true);
    try {
      // Search for a pending transaction matching the entered ID in the description
      const { data: matchedTx } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .eq("type", "topup")
        .ilike("description", `%${verifyTxId.trim()}%`)
        .limit(1);

      if (matchedTx && matchedTx.length > 0) {
        toast({ title: "✅ Transaction Found", description: `Your top-up of ${matchedTx[0].amount.toLocaleString()} MMK is pending admin approval.` });
      } else {
        // Also check by searching the order code in the ID field
        const { data: matchById } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("user_id", user.id)
          .eq("type", "topup")
          .eq("id", verifyTxId.trim())
          .limit(1);

        if (matchById && matchById.length > 0) {
          toast({ title: "✅ Transaction Found", description: `Status: ${matchById[0].status}. Amount: ${matchById[0].amount.toLocaleString()} MMK` });
        } else {
          toast({ title: "❌ Not Found", description: "No matching transaction found. Please double-check your Transaction ID.", variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "Error", description: "Verification failed. Please try again.", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const resetForm = () => {
    setSubmissionState("idle");
    setTopupAmount("");
    setBinanceTxId("");
    handleRemoveFile();
  };

  const txColumns: Column<any>[] = [
    { key: "created_at", label: l(t.orders.date), hideOnMobile: true, render: (row) => <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</span> },
    { key: "description", label: l(t.detail.description), priority: true },
    { key: "method", label: l(t.topup.paymentMethods), hideOnMobile: true, render: (row) => <span className="text-xs text-muted-foreground">{row.method || "—"}</span> },
    { key: "amount", label: l(t.topup.amount), align: "right" as const, render: (row) => (
      <span className={cn("font-mono font-semibold text-sm", row.type === "topup" ? "text-primary" : "text-foreground")}>
        {row.type === "topup" ? "+" : "-"}<Money amount={Math.abs(row.amount)} className="inline" />
      </span>
    )},
    { key: "status", label: "Status", align: "center" as const, render: (row) => <MmStatus status={row.status} /> },
    { key: "actions", label: "", hideOnMobile: true, render: (row) =>
      row.type === "topup" && row.status === "approved" ? (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadReceipt(row, profile?.name || profile?.email || "User")} title="Download receipt">
          <Download className="w-4 h-4 text-primary" />
        </Button>
      ) : null,
    },
  ];

  const pendingColumns: Column<any>[] = [
    { key: "created_at", label: "Date", render: (row) => <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span> },
    { key: "amount", label: "Amount", align: "right" as const, render: (row) => <span className="font-mono font-semibold text-sm text-primary">+{row.amount.toLocaleString()} MMK</span> },
    { key: "method", label: "Method", render: (row) => <span className="text-xs text-muted-foreground">{row.method || "—"}</span> },
    { key: "status", label: "Status", align: "center" as const, render: () => (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-warning/10 text-warning">
        <Clock className="w-3 h-3" /> Pending
      </span>
    )},
  ];

  return (
    <div className="space-y-[var(--space-section)]">
      <Breadcrumb items={[
        { label: l(t.nav.dashboard), path: "/dashboard" },
        { label: l(t.nav.wallet) },
      ]} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--space-default)] animate-fade-in">
        <div>
          <h1 className="text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--radius-card)] bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <MmLabel mm={t.wallet.title.mm} en={t.wallet.title.en} />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 ml-[52px]">{l(t.wallet.subtitle)}</p>
        </div>
      </div>

      {/* Wallet Hero - Balance Cards */}
      <div className="wallet-hero p-[var(--space-card)] lg:p-[var(--space-section)] animate-fade-in" style={{ animationDelay: "0.05s" }}>
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-[var(--space-card)]">
          <div>
            <div className="flex items-center gap-[var(--space-tight)] mb-2">
              <Wallet className="w-5 h-5 text-primary" />
              <MmLabel mm={t.wallet.availableBalance.mm} en={t.wallet.availableBalance.en} className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground" />
            </div>
            <p className={cn("text-4xl font-bold font-mono tabular-nums tracking-tight transition-all duration-500", balanceFlash ? "scale-105 text-primary" : "text-foreground")}
              style={!balanceFlash ? { backgroundImage: "linear-gradient(90deg, hsl(var(--foreground)) 0%, hsl(43 65% 72%) 40%, hsl(43 65% 52%) 50%, hsl(43 65% 72%) 60%, hsl(var(--foreground)) 100%)", backgroundSize: "200% 100%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "gold-shimmer 4s ease-in-out infinite" } : undefined}>
              {displayBalance.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground/50 mt-[var(--space-micro)]">MMK</p>
          </div>
          <div>
            <div className="flex items-center gap-[var(--space-tight)] mb-2">
              <ArrowUpRight className="w-5 h-5 text-primary" />
              <MmLabel mm={t.wallet.totalDeposited.mm} en={t.wallet.totalDeposited.en} className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold font-mono tabular-nums text-foreground tracking-tight">{totalDeposited.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground/50 mt-[var(--space-micro)]">MMK</p>
          </div>
          <div>
            <div className="flex items-center gap-[var(--space-tight)] mb-2">
              <ArrowDownRight className="w-5 h-5 text-ice" />
              <MmLabel mm={t.wallet.totalSpent.mm} en={t.wallet.totalSpent.en} className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold font-mono tabular-nums text-foreground tracking-tight">{(profile?.total_spent || 0).toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground/50 mt-[var(--space-micro)]">MMK</p>
          </div>
        </div>
      </div>

      {/* ═══════════════ PAYMENT GATEWAY SECTION ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-[var(--space-card)] animate-fade-in" style={{ animationDelay: "0.1s" }}>
        
        {/* LEFT: Payment Methods + Details (3 cols) */}
        <div className="lg:col-span-3 space-y-[var(--space-card)]">
          
          {/* How to Pay Steps */}
          <div className="glass-card p-[var(--space-card)]">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <CircleDollarSign className="w-4 h-4 text-primary" />
              How to Top Up
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: 1, icon: Smartphone, title: "Choose Method", desc: "Select your preferred payment method below" },
                { step: 2, icon: Send, title: "Transfer Exact Amount", desc: "Send the exact amount to the official account" },
                { step: 3, icon: FileCheck, title: "Upload & Submit", desc: "Upload proof or verify with Transaction ID" },
              ].map((s) => (
                <div key={s.step} className="flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))", border: "1px solid hsl(var(--primary) / 0.2)" }}>
                    <s.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Step {s.step}: {s.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Methods Grid */}
          <div className="glass-card p-[var(--space-card)]">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              {l(t.topup.paymentMethods)}
            </h3>

            {/* Method Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-5">
              {(paymentMethods || []).map((m: any) => {
                const isActive = selectedMethod === m.method_id;
                return (
                  <motion.button
                    key={m.method_id}
                    type="button"
                    onClick={() => setSelectedMethod(m.method_id)}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "relative flex flex-col items-center gap-2 p-3 rounded-[var(--radius-card)] border transition-all duration-200",
                      isActive
                        ? "border-primary/50 bg-primary/[0.06] shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
                        : "border-border/40 bg-secondary/30 hover:border-muted-foreground/20 hover:bg-secondary/50"
                    )}
                  >
                    <span className="text-2xl">{METHOD_ICONS[m.method_id] || "💳"}</span>
                    <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isActive ? "text-primary" : "text-muted-foreground")}>
                      {m.provider}
                    </span>
                    {isActive && (
                      <motion.div layoutId="method-indicator" className="absolute -bottom-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Selected Method Details */}
            <AnimatePresence mode="wait">
              {activeMethod && (
                <motion.div
                  key={selectedMethod}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-[var(--radius-card)] border border-primary/20 bg-primary/[0.03] p-5"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <BadgeCheck className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">{activeMethod.provider} — Official Account</span>
                  </div>

                  {isBinance ? (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Binance UID</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-xl font-bold text-foreground tracking-wide">{activeMethod.binance_uid}</span>
                          <CopyButton text={activeMethod.binance_uid} label="Binance UID" />
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Network</span>
                          <p className="text-sm font-semibold text-foreground mt-0.5">{activeMethod.network}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Currency</span>
                          <p className="text-sm font-semibold text-foreground mt-0.5">{activeMethod.accepted_currency}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Account Name</span>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{activeMethod.name}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Phone Number</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-xl font-bold text-foreground tracking-wide">{activeMethod.phone}</span>
                          <CopyButton text={activeMethod.phone} label={activeMethod.provider} />
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground/40 flex items-center gap-1.5 pt-3 mt-4 border-t border-border/15">
                    <Shield className="w-3 h-3" />
                    Transfer only to official verified accounts. Use Order ID as note/reference.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT: Top-Up Form (2 cols) */}
        <div className="lg:col-span-2 space-y-[var(--space-card)]">
          
          {/* Submit Top-Up Form */}
          <form onSubmit={handleSubmitTopup} className="glass-card p-[var(--space-card)] space-y-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-primary" />
              Submit Top-Up Request
            </h3>

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Amount (MMK)</Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="Enter amount..."
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  className="bg-muted/20 border-border/50 font-mono text-lg h-12 rounded-[var(--radius-input)] focus:border-primary/50 pr-14"
                  required min={MIN_AMOUNT}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">MMK</span>
              </div>
              {isAmountTooLow && (
                <p className="text-xs text-warning flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> Min: {MIN_AMOUNT.toLocaleString()} MMK</p>
              )}
              <div className="flex gap-2 flex-wrap">
                {PRESET_AMOUNTS.map((amt) => (
                  <button key={amt} type="button" onClick={() => setTopupAmount(amt.toString())}
                    className={cn("px-3 py-1.5 rounded-[var(--radius-btn)] text-xs font-semibold transition-all duration-200",
                      topupAmount === amt.toString() ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                    {amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Binance TxID */}
            {isBinance && (
              <div className="space-y-2">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Transaction ID (TxID)</Label>
                <Input type="text" placeholder="Enter Binance TxID" value={binanceTxId}
                  onChange={(e) => setBinanceTxId(e.target.value)}
                  className="bg-muted/20 border-border/50 font-mono text-sm h-11 rounded-[var(--radius-input)]" required />
              </div>
            )}

            {/* Upload */}
            <div className="space-y-2">
              <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Payment Proof</Label>
              {screenshotPreview ? (
                <div className="relative rounded-[var(--radius-card)] border border-border/30 bg-muted/10 overflow-hidden group">
                  <img src={screenshotPreview} alt="Payment" className="w-full max-h-32 object-contain bg-background/50" />
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button type="button" onClick={handleRemoveFile} className="p-2 rounded-lg bg-destructive/90 text-destructive-foreground"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="px-3 py-2 border-t border-border/20 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">{screenshot?.name}</span>
                    <span className="text-[10px] text-success font-medium">Ready</span>
                  </div>
                </div>
              ) : (
                <label
                  className={cn("flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-[var(--radius-card)] cursor-pointer transition-all",
                    isDragging ? "border-primary bg-primary/5" : "border-border/40 bg-muted/10 hover:border-primary/30")}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <Upload className={cn("w-5 h-5", isDragging ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-xs text-muted-foreground">{isDragging ? "Drop here" : "Drag & drop or click"}</span>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e.target.files?.[0] || null)} />
                </label>
              )}
            </div>

            {/* Safety */}
            <div className="rounded-[var(--radius-card)] border border-border/40 bg-muted/10 p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" /> Verified official accounts only
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Shield className="w-3.5 h-3.5 text-success shrink-0" /> Manual verification for security
              </div>
            </div>

            {/* Submit */}
            <Button type="submit"
              className="w-full h-12 text-sm font-bold rounded-[var(--radius-btn)] btn-glow"
              disabled={!topupAmount || !screenshot || parsedAmount < MIN_AMOUNT || !activeMethod || submissionState === "uploading" || (isBinance && !binanceTxId.trim())}
            >
              {submissionState === "uploading" ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</span>
              ) : (
                l(t.topup.submit)
              )}
            </Button>
          </form>

          {/* Auto-Verify Section */}
          <div className="glass-card p-[var(--space-card)] space-y-4"
            style={{ border: "1px solid hsl(var(--gold) / 0.15)", boxShadow: "0 0 30px hsl(var(--gold) / 0.03)" }}>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Search className="w-4 h-4" style={{ color: "hsl(var(--gold))" }} />
              <span>Auto-Verify by Transaction ID</span>
            </h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Forgot to add a reference note during your transfer? Paste your Transaction ID here to check your payment status.
            </p>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter Transaction ID..."
                value={verifyTxId}
                onChange={(e) => setVerifyTxId(e.target.value)}
                className="bg-muted/20 border-border/50 font-mono text-sm h-11 rounded-[var(--radius-input)] flex-1"
              />
              <Button
                type="button"
                onClick={handleVerifyPayment}
                disabled={!verifyTxId.trim() || verifying}
                className="h-11 px-5 rounded-[var(--radius-btn)] font-semibold shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(var(--gold)), hsl(38 92% 40%))", color: "#000" }}
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Topups */}
      {pendingTopups.length > 0 && (
        <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: "0.15s", border: "1px solid hsl(var(--warning) / 0.15)" }}>
          <div className="p-[var(--space-card)] border-b border-border/30 flex items-center gap-2">
            <Clock className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-semibold text-foreground">Pending Top-Ups ({pendingTopups.length})</h3>
          </div>
          <ResponsiveTable columns={pendingColumns} data={pendingTopups} keyExtractor={(row) => row.id} emptyMessage="No pending top-ups" />
        </div>
      )}

      {/* Transaction History */}
      <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <div className="p-[var(--space-card)] border-b border-border/30">
          <h3 className="text-sm font-semibold text-foreground">{l(t.wallet.txHistory)}</h3>
        </div>
        <ResponsiveTable columns={txColumns} data={transactions || []} keyExtractor={(row) => row.id} emptyMessage={l(t.wallet.noTx)} />
      </div>
    </div>
  );
}
