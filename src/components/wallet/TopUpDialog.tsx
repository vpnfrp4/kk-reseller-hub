import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Upload,
  CheckCircle2,
  Copy,
  Shield,
  AlertTriangle,
  Clock,
  X,
  Loader2,
  BadgeCheck,
  ArrowRight,
  Wallet,
  Camera,
  UserCheck,
  CreditCard,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { t, useT } from "@/lib/i18n";
import MmLabel from "@/components/shared/MmLabel";

interface TopUpDialogProps {
  userId: string | undefined;
  defaultAmount?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  onSubmitted?: (transactionId: string) => void;
}

const PRESET_AMOUNTS = [10000, 30000, 50000, 100000];
const MIN_AMOUNT = 5000;

type SubmissionState = "idle" | "uploading" | "submitted";

export default function TopUpDialog({
  userId,
  defaultAmount,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
  onSubmitted,
}: TopUpDialogProps) {
  const l = useT();
  const queryClient = useQueryClient();
  const [topupAmount, setTopupAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<string>("kpay");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [binanceTxId, setBinanceTxId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isControlled = controlledOpen !== undefined;
  const dialogOpen = isControlled ? controlledOpen : internalOpen;
  const setDialogOpen = isControlled
    ? (open: boolean) => controlledOnOpenChange?.(open)
    : setInternalOpen;

  // Fetch payment methods from DB
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

  const activeMethod = paymentMethods?.find((m: any) => m.method_id === selectedMethod);
  const isBinance = selectedMethod === "binance";
  const hasMethodSelected = !!selectedMethod && !!activeMethod;

  const PROCESS_STEPS = [
    { icon: CreditCard, label: t.topup.transferFunds },
    { icon: Camera, label: t.topup.uploadScreenshot },
    { icon: UserCheck, label: t.topup.adminVerify },
    { icon: Wallet, label: t.topup.walletCredited },
  ];

  useEffect(() => {
    if (dialogOpen && defaultAmount && defaultAmount > 0) {
      setTopupAmount(defaultAmount.toString());
    }
  }, [dialogOpen, defaultAmount]);

  // Set default selected method when methods load
  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0 && !paymentMethods.find((m: any) => m.method_id === selectedMethod)) {
      setSelectedMethod(paymentMethods[0].method_id);
    }
  }, [paymentMethods]);

  const parsedAmount = parseInt(topupAmount) || 0;
  const isAmountTooLow = topupAmount.length > 0 && parsedAmount < MIN_AMOUNT && parsedAmount > 0;

  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast({ title: l(t.topupExtra.copiedToast), description: `${label} ${l(t.topupExtra.copiedDesc)}` });
    setTimeout(() => setCopiedId(null), 2000);
  }, [l]);

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

  const handleSubmitTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupAmount || !screenshot || !userId || parsedAmount < MIN_AMOUNT || !hasMethodSelected) return;
    if (isBinance && !binanceTxId.trim()) return;
    setSubmissionState("uploading");

    try {
      const fileExt = screenshot.name.split(".").pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-screenshots")
        .upload(filePath, screenshot);
      if (uploadError) throw uploadError;

      const method = activeMethod;
      const methodLabel = method?.provider || selectedMethod;
      const description = isBinance
        ? `Wallet Top-up via ${methodLabel} (TxID: ${binanceTxId.trim()})`
        : `Wallet Top-up via ${methodLabel}`;

      const { data: insertedTx, error: insertError } = await supabase.from("wallet_transactions").insert({
        user_id: userId,
        type: "topup",
        amount: parsedAmount,
        status: "pending",
        method: methodLabel,
        description,
        screenshot_url: filePath,
      }).select("id").single();

      if (insertError) throw insertError;

      setSubmissionState("submitted");
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });

      if (insertedTx?.id && onSubmitted) {
        onSubmitted(insertedTx.id);
        return;
      }
    } catch (err) {
      console.error("Top-up error:", err);
      toast({ title: l(t.topupExtra.errorTitle), description: l(t.topupExtra.errorDesc), variant: "destructive" });
      setSubmissionState("idle");
    }
  };

  const resetOnClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSubmissionState("idle");
      setTopupAmount("");
      setBinanceTxId("");
      handleRemoveFile();
    }
  };

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
      title="Copy"
    >
      {copiedId === text ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={resetOnClose}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button className="btn-glow gap-2">
            <Plus className="w-4 h-4" />
            {l(t.wallet.topUp)}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="bg-card border-border/30 max-w-lg p-0 overflow-hidden backdrop-blur-xl gap-0 rounded-[var(--radius-modal)]">
        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-border/40">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[var(--radius-btn)] bg-primary/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <MmLabel mm={t.topup.title.mm} en={t.topup.title.en} />
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">{l(t.topup.subtitle)}</p>
          </DialogHeader>
        </div>

        {submissionState === "submitted" ? (
          <div className="px-7 py-8 space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto" style={{ boxShadow: "0 0 30px hsl(var(--success) / 0.15)" }}>
                <CheckCircle2 className="w-7 h-7 text-success" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{l(t.topup.submitted)}</h3>
              <p className="text-sm text-muted-foreground">{parsedAmount.toLocaleString()} MMK</p>
            </div>

            <div className="space-y-0">
              {[
                { label: t.topup.requestSubmitted, done: true },
                { label: t.topup.underReview, active: true },
                { label: t.topup.walletCreditedStep, done: false },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                      step.done
                        ? "bg-success text-success-foreground"
                        : step.active
                          ? "bg-primary/10 border-2 border-primary text-primary"
                          : "bg-muted border border-border text-muted-foreground"
                    )}>
                      {step.done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>
                    {i < 2 && <div className={cn("w-px h-6", step.done ? "bg-success/30" : "bg-border")} />}
                  </div>
                  <div className="pt-1">
                    <p className={cn("text-sm font-medium", step.done ? "text-foreground" : step.active ? "text-primary" : "text-muted-foreground")}>
                      {l(step.label)}
                    </p>
                    {step.active && (
                      <p className="text-xs text-muted-foreground mt-0.5">{l(t.topup.reviewTime)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Button
              className="w-full h-12 rounded-[var(--radius-btn)] btn-glow"
              onClick={() => resetOnClose(false)}
            >
              {l(t.topup.done)}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmitTopup} className="px-7 py-6 space-y-6 max-h-[72vh] overflow-y-auto">
            {/* ── AMOUNT ── */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {l(t.topup.amount)}
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder={l(t.topupExtra.enterAmount)}
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  className="bg-muted/20 border-border/50 font-mono text-lg h-12 rounded-[var(--radius-input)] focus:border-primary/50 focus:ring-primary/20 pr-14"
                  required
                  min={MIN_AMOUNT}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">MMK</span>
              </div>

              {isAmountTooLow && (
                <p className="text-xs text-warning flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  {l(t.topup.minAmount)} {MIN_AMOUNT.toLocaleString()} MMK
                </p>
              )}

              <div className="flex gap-2 flex-wrap">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopupAmount(amt.toString())}
                    className={cn(
                      "px-4 py-2 rounded-[var(--radius-btn)] text-xs font-semibold transition-all duration-200",
                      topupAmount === amt.toString()
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {amt.toLocaleString()}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground/60">{l(t.topupExtra.mostResellers)}</p>
            </div>

            {/* ── PAYMENT METHODS (Click-to-Reveal) ── */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {l(t.topup.paymentMethods)}
              </Label>
              <div className="space-y-3">
                {(paymentMethods || []).map((account: any) => {
                  const isSelected = selectedMethod === account.method_id;
                  const isBinanceMethod = account.method_id === "binance";
                  return (
                    <div
                      key={account.method_id}
                      className={cn(
                        "rounded-[16px] border transition-all duration-200 overflow-hidden",
                        isSelected
                          ? "border-primary/40 bg-primary/[0.03] shadow-[0_0_20px_hsl(43_65%_52%/0.06)]"
                          : "border-border/50 bg-secondary/40 hover:border-muted-foreground/20"
                      )}
                    >
                      {/* ── Collapsed Header ── */}
                      <button
                        type="button"
                        onClick={() => setSelectedMethod(isSelected ? "" : account.method_id)}
                        className="w-full text-left px-5 py-4 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0",
                            isSelected
                              ? "bg-primary/10 text-primary"
                              : "bg-muted/60 text-muted-foreground"
                          )}>
                            {account.provider}
                          </span>
                          <span className={cn(
                            "text-sm font-medium truncate",
                            isSelected ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {account.name || account.provider}
                          </span>
                          <div className="flex items-center gap-1 text-primary/70 shrink-0">
                            <BadgeCheck className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-medium">{l(t.topup.verified)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!isSelected && (
                            <span className="text-[10px] text-muted-foreground/50 hidden sm:inline">
                              Tap to view
                            </span>
                          )}
                          <ArrowRight
                            className={cn(
                              "w-4 h-4 transition-transform duration-200",
                              isSelected
                                ? "rotate-90 text-primary"
                                : "text-muted-foreground/40"
                            )}
                          />
                        </div>
                      </button>

                      {/* ── Expanded Details ── */}
                      <div
                        className={cn(
                          "grid transition-all duration-200 ease-in-out",
                          isSelected ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="px-5 pb-5 pt-1 space-y-3 border-t border-border/20">
                            {isBinanceMethod ? (
                              <div className="space-y-3">
                                <div>
                                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Binance UID</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="font-mono text-xl font-bold text-foreground tracking-wide">
                                      {account.binance_uid}
                                    </span>
                                    <CopyButton text={account.binance_uid} label="Binance UID" />
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div>
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Network</span>
                                    <p className="text-sm font-semibold text-foreground mt-0.5">{account.network}</p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Currency</span>
                                    <p className="text-sm font-semibold text-foreground mt-0.5">{account.accepted_currency}</p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div>
                                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Account Name</span>
                                  <p className="text-sm font-semibold text-foreground mt-0.5">{account.name}</p>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Phone Number</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="font-mono text-xl font-bold text-foreground tracking-wide">
                                      {account.phone}
                                    </span>
                                    <CopyButton text={account.phone} label={account.provider} />
                                  </div>
                                </div>
                              </div>
                            )}
                            <p className="text-[10px] text-muted-foreground/40 flex items-center gap-1.5 pt-1 border-t border-border/15">
                              <Shield className="w-3 h-3" />
                              Transfer only to official verified accounts.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── BINANCE TRANSACTION ID ── */}
            {isBinance && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Transaction ID (TxID)
                </Label>
                <Input
                  type="text"
                  placeholder="Enter your Binance Transaction ID"
                  value={binanceTxId}
                  onChange={(e) => setBinanceTxId(e.target.value)}
                  className="bg-muted/20 border-border/50 font-mono text-sm h-11 rounded-[var(--radius-input)] focus:border-primary/50 focus:ring-primary/20"
                  required
                />
                <p className="text-[11px] text-muted-foreground/70">
                  Find this in your Binance transaction history after sending USDT.
                </p>
              </div>
            )}

            {/* ── PROCESS STEPS ── */}
            <div className="rounded-[var(--radius-card)] border border-border/40 bg-muted/10 p-4">
              <div className="grid grid-cols-4 gap-2">
                {PROCESS_STEPS.map((step, i) => (
                  <div key={i} className="text-center space-y-1.5">
                    <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center mx-auto">
                      <step.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <p className="text-[10px] font-medium text-foreground leading-tight">{l(step.label)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── SAFETY ── */}
            <div className="rounded-[var(--radius-card)] border border-border/40 bg-muted/10 p-4 space-y-2">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                <span>{l(t.topupExtra.verifiedAccount)}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Shield className="w-4 h-4 text-success flex-shrink-0" />
                <span>{l(t.topupExtra.manualVerify)}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground/70 pt-1.5 border-t border-border/30">
                <AlertTriangle className="w-4 h-4 text-warning/70 flex-shrink-0" />
                <span>{l(t.topupExtra.doNotTransfer)}</span>
              </div>
            </div>

            {/* ── UPLOAD ── */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {l(t.topup.uploadProof)}
              </Label>
              {screenshotPreview ? (
                <div className="relative rounded-[var(--radius-card)] border border-border/30 bg-muted/10 overflow-hidden group">
                  <img
                    src={screenshotPreview}
                    alt="Payment screenshot"
                    className="w-full max-h-40 object-contain bg-background/50"
                  />
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-2 rounded-lg bg-destructive/90 text-destructive-foreground hover:bg-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="px-4 py-2.5 border-t border-border/20 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{screenshot?.name}</span>
                    <span className="text-[10px] text-success font-medium">{l(t.topupExtra.ready)}</span>
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
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-[var(--radius-card)] flex items-center justify-center transition-all duration-300",
                    isDragging ? "bg-primary/10 text-primary scale-110" : "bg-muted/30 text-muted-foreground"
                  )}>
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-muted-foreground">
                      {isDragging ? l(t.topupExtra.dropFile) : l(t.topup.dragDrop)}
                    </span>
                    <p className="text-xs text-muted-foreground/60 mt-1">{l(t.topupExtra.maxFileSize)}</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  />
                </label>
              )}
            </div>

            {/* ── CTA ── */}
            <div className="space-y-2">
              <Button
                type="submit"
                className="w-full h-12 text-sm font-bold rounded-[var(--radius-btn)] btn-glow relative overflow-hidden active:scale-[0.98] transition-transform duration-100"
                disabled={!topupAmount || !screenshot || parsedAmount < MIN_AMOUNT || !hasMethodSelected || submissionState === "uploading" || (isBinance && !binanceTxId.trim())}
              >
                {submissionState === "uploading" ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {l(t.topupExtra.submitting)}
                  </span>
                ) : (
                  l(t.topup.submit)
                )}
              </Button>
              <p className="text-xs text-muted-foreground/60 text-center">{l(t.topupExtra.securityNote)}</p>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
