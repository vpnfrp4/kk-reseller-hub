import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  ArrowLeft,
  Download,
  Copy,
  CheckCircle2,
  Shield,
  Upload,
  X,
  Loader2,
  AlertTriangle,
  BadgeCheck,
  Search,
  Clock,
  History,
  CreditCard,
  Smartphone,
  Bitcoin,
  ChevronRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { downloadReceipt } from "@/lib/receipt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money, ResponsiveTable } from "@/components/shared";
import PullToRefresh from "@/components/shared/PullToRefresh";
import type { Column } from "@/components/shared";
import { t, useT } from "@/lib/i18n";
import { MmStatus } from "@/components/shared/MmLabel";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import QRCode from "@/components/shared/QRCode";

const PRESET_AMOUNTS = [10000, 30000, 50000, 100000];
const MIN_AMOUNT = 5000;

const METHOD_META: Record<string, { icon: typeof CreditCard; gradient: string; desc: string }> = {
  kpay: { icon: Smartphone, gradient: "from-blue-500/20 to-blue-600/5", desc: "Fast mobile payment" },
  kbz: { icon: Smartphone, gradient: "from-blue-500/20 to-blue-600/5", desc: "Fast mobile payment" },
  kbzpay: { icon: Smartphone, gradient: "from-blue-500/20 to-blue-600/5", desc: "Fast mobile payment" },
  wavemoney: { icon: Smartphone, gradient: "from-amber-500/20 to-yellow-600/5", desc: "Mobile wallet transfer" },
  wave: { icon: Smartphone, gradient: "from-amber-500/20 to-yellow-600/5", desc: "Mobile wallet transfer" },
  cb: { icon: CreditCard, gradient: "from-emerald-500/20 to-green-600/5", desc: "Bank transfer" },
  cbpay: { icon: CreditCard, gradient: "from-emerald-500/20 to-green-600/5", desc: "Bank transfer" },
  aya: { icon: CreditCard, gradient: "from-purple-500/20 to-violet-600/5", desc: "Bank transfer" },
  ayapay: { icon: CreditCard, gradient: "from-purple-500/20 to-violet-600/5", desc: "Bank transfer" },
  binance: { icon: Bitcoin, gradient: "from-yellow-500/20 to-amber-600/5", desc: "Crypto payment (USDT)" },
  mpu: { icon: CreditCard, gradient: "from-sky-500/20 to-cyan-600/5", desc: "Card payment" },
};

const fallbackMeta = { icon: CreditCard, gradient: "from-primary/20 to-primary/5", desc: "Payment method" };

type Step = "select" | "details" | "upload";

export default function WalletPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const l = useT();

  const [step, setStep] = useState<Step>("select");
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [topupAmount, setTopupAmount] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submissionState, setSubmissionState] = useState<"idle" | "uploading">("idle");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [binanceTxId, setBinanceTxId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [verifyTxId, setVerifyTxId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { data: transactions, refetch: refetchTransactions, isLoading: txLoading } = useQuery({
    queryKey: ["wallet-transactions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallet_transactions").select("*").eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: paymentMethods, isLoading: methodsLoading } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_methods").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('wallet-tx-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${user.id}` }, () => { refetchTransactions(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const parsedAmount = parseInt(topupAmount) || 0;
  const isAmountTooLow = topupAmount.length > 0 && parsedAmount < MIN_AMOUNT && parsedAmount > 0;
  const activeMethod = paymentMethods?.find((m: any) => m.method_id === selectedMethod);
  const isBinance = selectedMethod === "binance";
  const pendingTopups = (transactions || []).filter((t: any) => t.type === "topup" && t.status === "pending");

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
    setScreenshot(null); setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleSelectMethod = (methodId: string) => {
    setSelectedMethod(methodId);
    setStep("details");
  };

  const handleSubmitTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupAmount || !screenshot || !user?.id || parsedAmount < MIN_AMOUNT || !activeMethod) return;
    if (isBinance && !binanceTxId.trim()) return;

    // Duplicate TX ID check for Binance
    if (isBinance && binanceTxId.trim()) {
      const { data: existingTx } = await supabase.from("wallet_transactions").select("id")
        .eq("user_id", user.id).eq("type", "topup")
        .ilike("description", `%TxID: ${binanceTxId.trim()}%`).limit(1);
      if (existingTx && existingTx.length > 0) {
        toast({ title: "Duplicate Transaction", description: "This Transaction ID has already been submitted.", variant: "destructive" });
        return;
      }
    }

    setSubmissionState("uploading");
    try {
      const fileExt = screenshot.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("payment-screenshots").upload(filePath, screenshot);
      if (uploadError) throw uploadError;
      const methodLabel = activeMethod?.provider || selectedMethod;
      const description = isBinance ? `Wallet Top-up via ${methodLabel} (TxID: ${binanceTxId.trim()})` : `Wallet Top-up via ${methodLabel}`;
      const { data: insertedTx, error: insertError } = await supabase.from("wallet_transactions").insert({
        user_id: user.id, type: "topup", amount: parsedAmount, status: "pending",
        method: methodLabel, description, screenshot_url: filePath,
      }).select("id").single();
      if (insertError) throw insertError;
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      if (insertedTx?.id) navigate(`/dashboard/topup-status/${insertedTx.id}`);
    } catch (err) {
      console.error("Top-up error:", err);
      toast({ title: "Error", description: "Failed to submit top-up request.", variant: "destructive" });
      setSubmissionState("idle");
    }
  };

  const handleVerifyPayment = async () => {
    if (!verifyTxId.trim() || !user?.id) return;
    setVerifying(true);
    try {
      // Search by TX ID in description
      const { data: matchedTx } = await supabase.from("wallet_transactions").select("*")
        .eq("user_id", user.id).eq("type", "topup")
        .ilike("description", `%${verifyTxId.trim()}%`).limit(1);

      if (matchedTx && matchedTx.length > 0) {
        const tx = matchedTx[0];
        if (tx.status === "approved") {
          toast({ title: "Payment Verified", description: `${tx.amount.toLocaleString()} MMK was credited to your wallet.` });
          navigate(`/dashboard/topup-status/${tx.id}`);
        } else if (tx.status === "pending") {
          toast({ title: "Pending Approval", description: `Your top-up of ${tx.amount.toLocaleString()} MMK is awaiting admin verification.` });
          navigate(`/dashboard/topup-status/${tx.id}`);
        } else if (tx.status === "rejected") {
          toast({ title: "Payment Rejected", description: `Your top-up of ${tx.amount.toLocaleString()} MMK was not approved.`, variant: "destructive" });
        }
        return;
      }

      // Search by transaction UUID
      const { data: matchById } = await supabase.from("wallet_transactions").select("*")
        .eq("user_id", user.id).eq("type", "topup").eq("id", verifyTxId.trim()).limit(1);
      if (matchById && matchById.length > 0) {
        const tx = matchById[0];
        toast({ title: tx.status === "approved" ? "Approved" : tx.status === "pending" ? "Pending" : "Rejected", description: `Amount: ${tx.amount.toLocaleString()} MMK` });
        navigate(`/dashboard/topup-status/${tx.id}`);
        return;
      }

      toast({ title: "Not Found", description: "No matching transaction found. Please check the ID.", variant: "destructive" });
    } catch { toast({ title: "Error", description: "Verification failed.", variant: "destructive" }); }
    finally { setVerifying(false); }
  };

  const goBack = () => {
    if (step === "upload") setStep("details");
    else if (step === "details") setStep("select");
  };

  const STEPS_INFO = [
    { key: "select", label: "Select Method", icon: CreditCard },
    { key: "details", label: "Payment Details", icon: Wallet },
    { key: "upload", label: "Upload Proof", icon: Upload },
  ] as const;

  const currentStepIdx = STEPS_INFO.findIndex(s => s.key === step);

  const txColumns: Column<any>[] = [
    { key: "created_at", label: "Date", hideOnMobile: true, render: (row) => <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</span> },
    { key: "description", label: "Description", priority: true },
    { key: "method", label: "Method", hideOnMobile: true, render: (row) => <span className="text-xs text-muted-foreground">{row.method || "—"}</span> },
    { key: "amount", label: "Amount", align: "right" as const, render: (row) => (
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

  // History view
  if (showHistory) {
    return (
      <PullToRefresh onRefresh={async () => { await refetchTransactions(); }}>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowHistory(false)}
              className="p-2 rounded-[var(--radius-btn)] bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Transaction History</h1>
              <p className="text-xs text-muted-foreground">View all wallet transactions</p>
            </div>
          </div>
          <div className="rounded-[var(--radius-card)] border border-border/40 bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
            {txLoading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-20" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-16" /><Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <ResponsiveTable columns={txColumns} data={transactions || []} keyExtractor={(row) => row.id} emptyMessage="No transactions yet" />
            )}
          </div>
        </div>
      </PullToRefresh>
    );
  }

  return (
    <PullToRefresh onRefresh={async () => { await Promise.all([refetchTransactions(), queryClient.invalidateQueries({ queryKey: ["payment-methods"] })]); }}>
      <div className="space-y-6">
        {/* ═══ HEADER ═══ */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step !== "select" ? (
              <button onClick={goBack}
                className="p-2 rounded-[var(--radius-btn)] bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-10 h-10 rounded-[var(--radius-card)] bg-primary/10 border border-primary/20 flex items-center justify-center"
                style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.1)" }}>
                <Wallet className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-foreground">
                {step === "select" ? "Payment Gateway" : step === "details" ? "Payment Details" : "Upload Proof"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {step === "select" ? "Choose your preferred payment method" : step === "details" ? `Pay via ${activeMethod?.provider || ""}` : "Upload your payment screenshot"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Balance chip */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-card)] bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
              <Wallet className="w-4 h-4 text-primary" />
              {!profile ? <Skeleton className="h-5 w-24" /> : <Money amount={profile.balance || 0} className="font-mono font-bold text-foreground tabular-nums" />}
            </div>
            <button onClick={() => setShowHistory(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-btn)] bg-secondary border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/20 transition-all">
              <History className="w-3.5 h-3.5" /> History
            </button>
          </div>
        </div>

        {/* ═══ STEP PROGRESS BAR ═══ */}
        <div className="relative">
          <div className="flex items-center justify-between relative z-10">
            {STEPS_INFO.map((s, i) => {
              const isDone = i < currentStepIdx;
              const isActive = i === currentStepIdx;
              const StepIcon = s.icon;
              return (
                <div key={s.key} className="flex flex-col items-center gap-2 relative flex-1">
                  {/* Connector line */}
                  {i > 0 && (
                    <div className="absolute top-5 right-1/2 w-full h-0.5 -z-10" style={{ transform: "translateX(-50%)" }}>
                      <div className={cn("h-full transition-all duration-500", isDone || isActive ? "bg-primary" : "bg-border/50")} />
                    </div>
                  )}
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative",
                    isDone
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "bg-primary/10 border-2 border-primary text-primary"
                        : "bg-secondary border border-border text-muted-foreground"
                  )}>
                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : <StepIcon className="w-4 h-4" />}
                  </div>
                  <span className={cn(
                    "text-[10px] sm:text-xs font-semibold transition-colors text-center",
                    isDone || isActive ? "text-foreground" : "text-muted-foreground/50"
                  )}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Background track */}
          <div className="absolute top-5 left-[16.6%] right-[16.6%] h-0.5 bg-border/30 -z-0" />
          <div
            className="absolute top-5 left-[16.6%] h-0.5 bg-primary transition-all duration-500 -z-0"
            style={{ width: `${currentStepIdx * 33.3}%` }}
          />
        </div>

        {/* ═══ STEP CONTENT ═══ */}
        <AnimatePresence mode="wait">
          {/* ── STEP 1: SELECT METHOD ── */}
          {step === "select" && (
            <motion.div key="select" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
              <div className="space-y-6">
                {/* Payment Methods Grid */}
                {methodsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-6 rounded-[var(--radius-card)] border border-border/40 bg-card">
                        <Skeleton className="w-12 h-12 rounded-2xl mb-4" />
                        <Skeleton className="h-5 w-24 mb-2" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(paymentMethods || []).map((m: any) => {
                      const meta = METHOD_META[m.method_id] || fallbackMeta;
                      const MethodIcon = meta.icon;
                      return (
                         <motion.button
                          key={m.method_id}
                          type="button"
                          onClick={() => handleSelectMethod(m.method_id)}
                          whileHover={{ scale: 1.02, y: -4 }}
                          whileTap={{ scale: 0.97 }}
                          className={cn(
                            "group relative text-left p-6 rounded-[var(--radius-card)] border transition-all duration-300 overflow-hidden",
                            "border-border/40 bg-card hover:border-primary/40",
                            "hover:shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.15),0_0_0_1px_hsl(var(--primary)/0.08)]"
                          )}
                          style={{ boxShadow: "var(--shadow-card)" }}
                        >
                          {/* Animated glow */}
                          <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-primary/[0.04] blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none group-hover:bg-primary/[0.08]" />
                          {/* Top accent */}
                          <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="h-full bg-gradient-to-r from-primary/60 via-primary/25 to-transparent" />
                          </div>

                          <div className="relative z-10 space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                              <MethodIcon className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors duration-300 font-display">
                                {m.provider}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                {meta.desc}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-primary/60 font-medium">
                              <BadgeCheck className="w-3 h-3" />
                              Verified Account
                            </div>
                          </div>

                          {/* Arrow indicator */}
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center group-hover:shadow-[0_0_12px_hsl(var(--primary)/0.15)]">
                              <ChevronRight className="w-4 h-4 text-primary" />
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* Pending Topups */}
                {pendingTopups.length > 0 && (
                  <div className="rounded-[var(--radius-card)] border border-warning/15 bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
                    <div className="px-5 py-3 border-b border-border/30 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-warning" />
                      <span className="text-sm font-semibold text-foreground">Pending Top-Ups ({pendingTopups.length})</span>
                    </div>
                    <div className="divide-y divide-border/20">
                      {pendingTopups.map((tx: any) => (
                        <button
                          key={tx.id}
                          onClick={() => navigate(`/dashboard/topup-status/${tx.id}`)}
                          className="w-full px-5 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-semibold text-primary">+{tx.amount.toLocaleString()} MMK</span>
                            <span className="text-xs text-muted-foreground">{tx.method}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-warning/10 text-warning">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Auto-Verify */}
                <div className="rounded-[var(--radius-card)] border border-primary/15 bg-card p-5 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Search className="w-4 h-4 text-primary" />
                    Verify Payment
                  </h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Already transferred? Paste your Transaction ID to check payment status.
                  </p>
                  <div className="flex gap-2">
                    <Input type="text" placeholder="Enter Transaction ID..." value={verifyTxId}
                      onChange={(e) => setVerifyTxId(e.target.value)}
                      className="bg-muted/20 border-border/50 font-mono text-sm h-11 rounded-[var(--radius-input)] flex-1" />
                    <Button type="button" onClick={handleVerifyPayment} disabled={!verifyTxId.trim() || verifying}
                      className="h-11 px-5 rounded-[var(--radius-btn)] font-semibold shrink-0 btn-glow">
                      {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: PAYMENT DETAILS ── */}
          {step === "details" && activeMethod && (
            <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* LEFT: Account Details */}
                <div className="space-y-5">
                  {/* Official Account Card */}
                  <div className="rounded-[var(--radius-card)] border border-primary/20 bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
                    <div className="px-6 py-4 border-b border-border/20 bg-primary/[0.03]">
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="w-5 h-5 text-primary" />
                        <span className="text-sm font-bold uppercase tracking-wider text-primary">{activeMethod.provider} — Official Account</span>
                      </div>
                    </div>

                    <div className="p-6 space-y-5">
                      {isBinance ? (
                        <>
                          <div className="flex flex-col sm:flex-row gap-5">
                            <div className="flex-1 space-y-5">
                              <DetailField label="Binance UID" value={activeMethod.binance_uid} onCopy={() => handleCopy(activeMethod.binance_uid, "Binance UID")} copied={copiedId === activeMethod.binance_uid} large />
                              <div className="flex gap-6">
                                <DetailField label="Network" value={activeMethod.network} />
                                <DetailField label="Currency" value={activeMethod.accepted_currency} />
                              </div>
                            </div>
                            {/* QR Code for Binance UID */}
                            <div className="flex flex-col items-center gap-2 shrink-0">
                              <QRCode value={activeMethod.binance_uid || ""} size={120} />
                              <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider font-medium">Scan to pay</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col sm:flex-row gap-5">
                            <div className="flex-1 space-y-5">
                              <DetailField label="Account Name" value={activeMethod.name} />
                              <DetailField label="Phone Number" value={activeMethod.phone} onCopy={() => handleCopy(activeMethod.phone, "Phone")} copied={copiedId === activeMethod.phone} large />
                            </div>
                            {/* QR Code for phone number */}
                            {activeMethod.phone && (
                              <div className="flex flex-col items-center gap-2 shrink-0">
                                <QRCode value={activeMethod.phone} size={120} />
                                <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider font-medium">Scan to pay</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="px-6 py-3 border-t border-border/15 flex items-center gap-2 text-[10px] text-muted-foreground/50 bg-muted/5">
                      <Shield className="w-3 h-3" />
                      Transfer only to official verified accounts
                    </div>
                  </div>

                  {/* Trust Indicators */}
                  <div className="rounded-[var(--radius-card)] border border-border/30 bg-card p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">Verified official accounts only</p>
                        <p className="text-[10px] text-muted-foreground">All payment accounts are verified by admin</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Shield className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">Manual verification for security</p>
                        <p className="text-[10px] text-muted-foreground">Every transaction is manually verified</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                        <Zap className="w-3.5 h-3.5 text-warning" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">Usually approved within 5 minutes</p>
                        <p className="text-[10px] text-muted-foreground">Fast processing during business hours</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Amount + Form */}
                <div className="rounded-[var(--radius-card)] border border-border/40 bg-card p-6 space-y-5" style={{ boxShadow: "var(--shadow-card)" }}>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Payment Details
                  </h3>

                  {/* Amount */}
                  <div className="space-y-3">
                    <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Top-Up Amount</Label>
                    <div className="relative">
                      <Input type="number" placeholder="Enter amount..." value={topupAmount}
                        onChange={(e) => setTopupAmount(e.target.value)}
                        className="bg-muted/20 border-border/50 font-mono text-lg h-12 rounded-[var(--radius-input)] focus:border-primary/50 pr-14"
                        required min={MIN_AMOUNT} />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">MMK</span>
                    </div>
                    {isAmountTooLow && (
                      <p className="text-xs text-warning flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> Min: {MIN_AMOUNT.toLocaleString()} MMK</p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_AMOUNTS.map((amt) => (
                        <button key={amt} type="button" onClick={() => setTopupAmount(amt.toString())}
                          className={cn("px-4 py-2 rounded-[var(--radius-btn)] text-xs font-semibold transition-all duration-200",
                            topupAmount === amt.toString()
                              ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.2)]"
                              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground")}>
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

                  {/* Continue to upload step */}
                  <Button
                    type="button"
                    className="w-full h-12 text-sm font-bold rounded-[var(--radius-btn)] btn-glow gap-2"
                    disabled={!topupAmount || parsedAmount < MIN_AMOUNT || (isBinance && !binanceTxId.trim())}
                    onClick={() => setStep("upload")}
                  >
                    Continue to Upload Proof
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: UPLOAD PROOF ── */}
          {step === "upload" && activeMethod && (
            <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <form onSubmit={handleSubmitTopup} className="max-w-lg mx-auto space-y-6">
                {/* Summary Card */}
                <div className="rounded-[var(--radius-card)] border border-border/40 bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Payment Summary</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Method</span>
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <BadgeCheck className="w-3.5 h-3.5 text-primary" />
                        {activeMethod.provider}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className="text-lg font-bold font-mono text-primary tabular-nums">{parsedAmount.toLocaleString()} MMK</span>
                    </div>
                    {isBinance && binanceTxId && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">TxID</span>
                        <span className="text-xs font-mono text-foreground truncate max-w-[180px]">{binanceTxId}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Area */}
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Screenshot</Label>
                  {screenshotPreview ? (
                    <div className="relative rounded-[var(--radius-card)] border border-success/20 bg-card overflow-hidden group">
                      <img src={screenshotPreview} alt="Payment" className="w-full max-h-48 object-contain bg-background/50" />
                      <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={handleRemoveFile} className="p-2 rounded-lg bg-destructive/90 text-destructive-foreground"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="px-4 py-2.5 border-t border-border/20 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{screenshot?.name}</span>
                        <span className="text-[10px] text-success font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ready</span>
                      </div>
                    </div>
                  ) : (
                    <label
                      className={cn(
                        "flex flex-col items-center gap-3 p-10 border-2 border-dashed rounded-[var(--radius-card)] cursor-pointer transition-all duration-300",
                        isDragging
                          ? "border-primary bg-primary/5 scale-[1.01]"
                          : "border-border/40 bg-muted/10 hover:border-primary/30 hover:bg-muted/20"
                      )}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300",
                        isDragging ? "bg-primary/10 text-primary scale-110" : "bg-muted/30 text-muted-foreground"
                      )}>
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-medium text-muted-foreground">
                          {isDragging ? "Drop your screenshot here" : "Drag & drop or click to upload"}
                        </span>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">PNG, JPG up to 10MB</p>
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e.target.files?.[0] || null)} />
                    </label>
                  )}
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full h-12 text-sm font-bold rounded-[var(--radius-btn)] btn-glow relative overflow-hidden"
                  disabled={!screenshot || submissionState === "uploading"}
                >
                  {submissionState === "uploading" ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</span>
                  ) : (
                    <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Submit Top-Up Request</span>
                  )}
                </Button>

                <p className="text-[10px] text-muted-foreground/50 text-center flex items-center justify-center gap-1.5">
                  <Shield className="w-3 h-3" />
                  Your payment is verified manually for maximum security
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PullToRefresh>
  );
}

/* ═══ DETAIL FIELD HELPER ═══ */
function DetailField({ label, value, onCopy, copied, large }: {
  label: string; value: string; onCopy?: () => void; copied?: boolean; large?: boolean;
}) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">{label}</span>
      <div className="flex items-center gap-2 mt-1">
        <span className={cn("font-semibold text-foreground", large ? "font-mono text-xl tracking-wide" : "text-sm")}>{value}</span>
        {onCopy && (
          <button type="button" onClick={onCopy}
            className={cn("p-1.5 rounded-lg transition-all duration-200",
              copied ? "bg-success/10 text-success scale-110" : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/60")}>
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
