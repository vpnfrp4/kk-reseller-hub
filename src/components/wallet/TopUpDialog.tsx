import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TopUpDialogProps {
  userId: string | undefined;
}

type PaymentAccount = {
  id: "kpay" | "wavepay";
  provider: string;
  name: string;
  phone: string;
};

const ACCOUNTS: PaymentAccount[] = [
  { id: "kpay", provider: "KBZ Pay", name: "Htun Arkar Kyaw", phone: "09787313137" },
  { id: "wavepay", provider: "Wave Pay", name: "Hnin Thet Wai", phone: "09777818691" },
];

const PRESET_AMOUNTS = [10000, 30000, 50000, 100000];

export default function TopUpDialog({ userId }: TopUpDialogProps) {
  const queryClient = useQueryClient();
  const [topupAmount, setTopupAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<"kpay" | "wavepay">("kpay");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = useCallback((phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(phone);
    toast({ title: "Copied!", description: `${phone} copied to clipboard.` });
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

  const handleSubmitTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupAmount || !screenshot || !userId) return;
    setUploading(true);

    try {
      const fileExt = screenshot.name.split(".").pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-screenshots")
        .upload(filePath, screenshot);
      if (uploadError) throw uploadError;

      const account = ACCOUNTS.find((a) => a.id === selectedAccount)!;
      await supabase.from("wallet_transactions").insert({
        user_id: userId,
        type: "topup",
        amount: parseInt(topupAmount),
        status: "pending",
        method: account.provider,
        description: `Wallet Top-up via ${account.provider}`,
        screenshot_url: filePath,
      });

      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });

      setTimeout(() => {
        setSubmitted(false);
        setDialogOpen(false);
        setTopupAmount("");
        handleRemoveFile();
      }, 2500);
    } catch (err) {
      console.error("Top-up error:", err);
      toast({ title: "Error", description: "Failed to submit top-up request.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const resetOnClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSubmitted(false);
      setTopupAmount("");
      handleRemoveFile();
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={resetOnClose}>
      <DialogTrigger asChild>
        <Button className="btn-glow gap-2">
          <Plus className="w-4 h-4" />
          Top Up
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border/30 max-w-lg p-0 overflow-hidden backdrop-blur-xl gap-0 rounded-[var(--radius-modal)]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/40">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[var(--radius-btn)] bg-primary/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              Secure Top-Up
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">Transfer funds and upload payment proof.</p>
          </DialogHeader>
        </div>

        {submitted ? (
          <div className="text-center py-12 px-6 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto" style={{ boxShadow: "0 0 30px hsl(var(--success) / 0.2)" }}>
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <p className="text-foreground font-semibold text-lg">Request Submitted</p>
            <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
              Your payment will be verified and credited within 5–15 minutes.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitTopup} className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* ── Section 1: Amount ── */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount (MMK)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                className="bg-muted/20 border-border/50 font-mono text-lg h-12 rounded-[var(--radius-input)] focus:border-primary/50 focus:ring-primary/20"
                required
                min={1000}
              />
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
            </div>

            {/* ── Section 2: Payment Methods ── */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Send Payment To</Label>
              <div className="space-y-3">
                {ACCOUNTS.map((account) => {
                  const isSelected = selectedAccount === account.id;
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => setSelectedAccount(account.id)}
                      className={cn(
                        "w-full text-left rounded-[16px] p-6 border-2 transition-all duration-200 relative",
                        isSelected
                          ? "border-primary bg-primary/[0.03]"
                          : "border-[hsl(220_13%_90%)] bg-card hover:border-border"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-3 flex-1 min-w-0">
                          {/* Provider Badge */}
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full",
                              isSelected
                                ? "bg-primary/10 text-primary"
                                : "bg-muted/60 text-muted-foreground"
                            )}>
                              {account.provider}
                            </span>
                            {isSelected && (
                              <div className="flex items-center gap-1 text-primary">
                                <BadgeCheck className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-medium">Verified</span>
                              </div>
                            )}
                          </div>

                          {/* Account Holder */}
                          <p className="text-sm font-semibold text-foreground">{account.name}</p>

                          {/* Phone Number + Copy */}
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xl font-bold text-foreground tracking-wide">
                              {account.phone}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(account.phone);
                              }}
                              className={cn(
                                "p-1.5 rounded-lg transition-all duration-200",
                                copiedId === account.phone
                                  ? "bg-success/10 text-success scale-110"
                                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                              )}
                              title="Copy number"
                            >
                              {copiedId === account.phone ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Radio indicator */}
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all duration-200",
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-border"
                        )}>
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Safety Section ── */}
            <div className="rounded-[var(--radius-card)] border border-border/40 bg-muted/10 p-4 space-y-2.5">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                <span>Official verified account</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Shield className="w-4 h-4 text-success flex-shrink-0" />
                <span>Manual verification for security</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Clock className="w-4 h-4 text-success flex-shrink-0" />
                <span>Funds credited within 5–15 minutes</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground/70 pt-1 border-t border-border/30">
                <AlertTriangle className="w-4 h-4 text-warning/70 flex-shrink-0" />
                <span>Do not transfer to any other number.</span>
              </div>
            </div>

            {/* ── Upload Section ── */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Screenshot</Label>
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
                    <span className="text-[10px] text-success font-medium">Ready</span>
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
                      {isDragging ? "Drop your screenshot here" : "Upload payment screenshot"}
                    </span>
                    <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG up to 5MB</p>
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
                disabled={!topupAmount || !screenshot || uploading}
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  "Submit Top-Up Request"
                )}
              </Button>
              <p className="text-xs text-muted-foreground/60 text-center">Top-up requests are reviewed manually.</p>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
