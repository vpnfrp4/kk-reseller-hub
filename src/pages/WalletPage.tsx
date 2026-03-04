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
  ChevronRight,
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

const PRESET_AMOUNTS = [10000, 30000, 50000, 100000];
const MIN_AMOUNT = 5000;

const METHOD_ICONS: Record<string, string> = {
  kpay: "💳", wavemoney: "📱", wave: "📱", cb: "🏦", cbpay: "🏦",
  aya: "🏧", ayapay: "🏧", kbz: "💰", kbzpay: "💰", binance: "₿", mpu: "🔒",
};

type Step = "select" | "invoice" | "history";

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

  const CopyBtn = ({ text, label }: { text: string; label: string }) => (
    <button type="button" onClick={(e) => { e.stopPropagation(); handleCopy(text, label); }}
      className={cn("p-1.5 rounded-lg transition-all duration-200",
        copiedId === text ? "bg-success/10 text-success scale-110" : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/60")}>
      {copiedId === text ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );

  const handleSelectMethod = (methodId: string) => {
    setSelectedMethod(methodId);
    setStep("invoice");
  };

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
      const { data: matchedTx } = await supabase.from("wallet_transactions").select("*")
        .eq("user_id", user.id).eq("status", "pending").eq("type", "topup")
        .ilike("description", `%${verifyTxId.trim()}%`).limit(1);
      if (matchedTx && matchedTx.length > 0) {
        toast({ title: "✅ Transaction Found", description: `Your top-up of ${matchedTx[0].amount.toLocaleString()} MMK is pending admin approval.` });
      } else {
        const { data: matchById } = await supabase.from("wallet_transactions").select("*")
          .eq("user_id", user.id).eq("type", "topup").eq("id", verifyTxId.trim()).limit(1);
        if (matchById && matchById.length > 0) {
          toast({ title: "✅ Transaction Found", description: `Status: ${matchById[0].status}. Amount: ${matchById[0].amount.toLocaleString()} MMK` });
        } else {
          toast({ title: "❌ Not Found", description: "No matching transaction found.", variant: "destructive" });
        }
      }
    } catch { toast({ title: "Error", description: "Verification failed.", variant: "destructive" }); }
    finally { setVerifying(false); }
  };

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

  return (
    <PullToRefresh onRefresh={async () => { await Promise.all([refetchTransactions(), queryClient.invalidateQueries({ queryKey: ["payment-methods"] })]); }}>
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {step === "invoice" ? (
            <button onClick={() => setStep("select")}
              className="p-2 rounded-[var(--radius-btn)] bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : step === "history" ? (
            <button onClick={() => setStep("select")}
              className="p-2 rounded-[var(--radius-btn)] bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-10 h-10 rounded-[var(--radius-card)] bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {step === "select" ? "Payment Gateway" : step === "invoice" ? `Pay via ${activeMethod?.provider || ""}` : "Transaction History"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {step === "select" ? "Select a payment method to add funds" : step === "invoice" ? "Complete your payment details below" : "View all wallet transactions"}
            </p>
          </div>
        </div>

        {/* Balance + History toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-[var(--radius-card)] bg-secondary border border-border">
            <Wallet className="w-4 h-4 text-primary" />
            {!profile ? (
              <Skeleton className="h-5 w-24" />
            ) : (
              <>
                <Money amount={profile.balance || 0} className="font-mono font-bold text-foreground tabular-nums" />
              </>
            )}
          </div>
          {step !== "history" && (
            <button onClick={() => setStep("history")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-btn)] bg-secondary border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
              <History className="w-3.5 h-3.5" /> History
            </button>
          )}
        </div>
      </div>

      {/* ═══ STEP CONTENT ═══ */}
      <AnimatePresence mode="wait">
        {step === "select" && (
          <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-6">
              {[
                { n: 1, label: "Select Method" },
                { n: 2, label: "Enter Details" },
                { n: 3, label: "Upload Proof" },
              ].map((s, i) => (
                <div key={s.n} className="flex items-center gap-2">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                    s.n === 1 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground border border-border")}>
                    {s.n}
                  </div>
                  <span className={cn("text-xs font-medium hidden sm:inline", s.n === 1 ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
                  {i < 2 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 mx-1" />}
                </div>
              ))}
            </div>

            {/* Payment Methods Grid */}
            {methodsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-3 p-5 rounded-[var(--radius-card)] border border-border/40 bg-card">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(paymentMethods || []).map((m: any) => (
                <motion.button key={m.method_id} type="button"
                  onClick={() => handleSelectMethod(m.method_id)}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="group flex flex-col items-center gap-3 p-5 rounded-[var(--radius-card)] border border-border/40 bg-card hover:border-primary/40 hover:bg-primary/[0.04] transition-all duration-200"
                  style={{ boxShadow: "var(--shadow-card)" }}>
                  <span className="text-3xl">{METHOD_ICONS[m.method_id] || "💳"}</span>
                  <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{m.provider}</span>
                  <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">Tap to select</span>
                </motion.button>
              ))}
            </div>
            )}

            {/* Pending Topups */}
            {pendingTopups.length > 0 && (
              <div className="mt-6 rounded-[var(--radius-card)] border border-warning/15 bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
                <div className="px-5 py-3 border-b border-border/30 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-warning" />
                  <span className="text-sm font-semibold text-foreground">Pending Top-Ups ({pendingTopups.length})</span>
                </div>
                <div className="divide-y divide-border/20">
                  {pendingTopups.map((tx: any) => (
                    <div key={tx.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <span className="font-mono text-sm font-semibold text-primary">+{tx.amount.toLocaleString()} MMK</span>
                        <span className="text-xs text-muted-foreground ml-2">{tx.method}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-warning/10 text-warning">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Auto-Verify Section */}
            <div className="mt-6 rounded-[var(--radius-card)] border bg-card p-5 space-y-3" style={{ borderColor: "hsl(var(--gold) / 0.15)", boxShadow: "0 0 30px hsl(var(--gold) / 0.03)" }}>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Search className="w-4 h-4" style={{ color: "hsl(var(--gold))" }} />
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
                  className="h-11 px-5 rounded-[var(--radius-btn)] font-semibold shrink-0"
                  style={{ background: "linear-gradient(135deg, hsl(var(--gold)), hsl(38 92% 40%))", color: "#000" }}>
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {step === "invoice" && activeMethod && (
          <motion.div key="invoice" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-6">
              {[
                { n: 1, label: "Select Method" },
                { n: 2, label: "Enter Details" },
                { n: 3, label: "Upload Proof" },
              ].map((s, i) => (
                <div key={s.n} className="flex items-center gap-2">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                    s.n <= 2 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground border border-border")}>
                    {s.n <= 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.n}
                  </div>
                  <span className={cn("text-xs font-medium hidden sm:inline", s.n <= 2 ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
                  {i < 2 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 mx-1" />}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* LEFT: Invoice / Account Details */}
              <div className="space-y-5">
                {/* Account Details Card */}
                <div className="rounded-[var(--radius-card)] border border-primary/20 bg-card p-6" style={{ boxShadow: "0 0 40px hsl(var(--primary) / 0.06)" }}>
                  <div className="flex items-center gap-2 mb-5">
                    <BadgeCheck className="w-5 h-5 text-primary" />
                    <span className="text-sm font-bold uppercase tracking-wider text-primary">{activeMethod.provider} — Official Account</span>
                  </div>

                  {isBinance ? (
                    <div className="space-y-5">
                      <DetailField label="Binance UID" value={activeMethod.binance_uid} onCopy={() => handleCopy(activeMethod.binance_uid, "Binance UID")} copied={copiedId === activeMethod.binance_uid} large />
                      <div className="flex gap-6">
                        <DetailField label="Network" value={activeMethod.network} />
                        <DetailField label="Currency" value={activeMethod.accepted_currency} />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <DetailField label="Account Name" value={activeMethod.name} />
                      <DetailField label="Phone Number" value={activeMethod.phone} onCopy={() => handleCopy(activeMethod.phone, "Phone")} copied={copiedId === activeMethod.phone} large />
                    </div>
                  )}

                  <div className="mt-5 pt-4 border-t border-border/15 flex items-center gap-2 text-[10px] text-muted-foreground/50">
                    <Shield className="w-3 h-3" />
                    Transfer only to official verified accounts
                  </div>
                </div>

                {/* Security Info */}
                <div className="rounded-[var(--radius-card)] border border-border/30 bg-card p-4 space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" /> Verified official accounts only
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Shield className="w-3.5 h-3.5 text-success shrink-0" /> Manual verification for your security
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-warning shrink-0" /> Top-ups are usually approved within 5 minutes
                  </div>
                </div>
              </div>

              {/* RIGHT: Submit Form */}
              <form onSubmit={handleSubmitTopup} className="rounded-[var(--radius-card)] border border-border/40 bg-card p-6 space-y-5" style={{ boxShadow: "var(--shadow-card)" }}>
                <h3 className="text-sm font-bold text-foreground">Payment Details</h3>

                {/* Amount */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Amount (MMK)</Label>
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
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Payment Screenshot</Label>
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
                      onDrop={handleDrop}>
                      <Upload className={cn("w-5 h-5", isDragging ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-xs text-muted-foreground">{isDragging ? "Drop here" : "Drag & drop or click to upload"}</span>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e.target.files?.[0] || null)} />
                    </label>
                  )}
                </div>

                {/* Submit */}
                <Button type="submit" className="w-full h-12 text-sm font-bold rounded-[var(--radius-btn)] btn-glow"
                  disabled={!topupAmount || !screenshot || parsedAmount < MIN_AMOUNT || !activeMethod || submissionState === "uploading" || (isBinance && !binanceTxId.trim())}>
                  {submissionState === "uploading" ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</span>
                  ) : (
                    <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Submit Top-Up Request</span>
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        )}

        {step === "history" && (
          <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <div className="rounded-[var(--radius-card)] border border-border/40 bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Transaction History</h3>
              </div>
              {txLoading ? (
                <div className="p-5 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <ResponsiveTable columns={txColumns} data={transactions || []} keyExtractor={(row) => row.id} emptyMessage="No transactions yet" />
              )}
            </div>
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
