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

interface TopUpDialogProps {
  userId: string | undefined;
}

type PaymentAccount = {
  id: "kpay" | "wavepay";
  provider: string;
  payId: string;
  name: string;
};

const ACCOUNTS: PaymentAccount[] = [
  { id: "kpay", provider: "KBZ Pay", payId: "09787313137", name: "Htun Arkar Kyaw" },
  { id: "wavepay", provider: "Wave Pay", payId: "09777818691", name: "Hnin Thet Wai" },
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

  const handleCopy = useCallback((payId: string) => {
    navigator.clipboard.writeText(payId);
    setCopiedId(payId);
    toast({ title: "Copied!", description: `Pay ID ${payId} copied to clipboard.` });
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
      <DialogContent className="bg-card border-border/30 max-w-lg p-0 overflow-hidden backdrop-blur-xl gap-0">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-border/30">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <DialogHeader className="relative">
            <DialogTitle className="text-lg font-semibold text-foreground flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-gold)" }}>
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              Secure Top-Up
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">Transfer funds and upload your payment screenshot</p>
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
          <form onSubmit={handleSubmitTopup} className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Amount */}
            <div className="space-y-2.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount (MMK)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                className="bg-muted/30 border-border/50 font-mono text-base h-11 focus:border-primary/50 focus:ring-primary/20"
                required
                min={1000}
              />
              <div className="flex gap-2 flex-wrap">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopupAmount(amt.toString())}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      topupAmount === amt.toString()
                        ? "btn-glow scale-[1.02]"
                        : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Accounts */}
            <div className="space-y-2.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Send Payment To</Label>
              <div className="space-y-3">
                {ACCOUNTS.map((account) => {
                  const isSelected = selectedAccount === account.id;
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => setSelectedAccount(account.id)}
                      className={`w-full text-left rounded-xl p-4 border transition-all duration-300 relative overflow-hidden group ${
                        isSelected
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/30 bg-muted/20 hover:border-border/60 hover:bg-muted/30"
                      }`}
                      style={isSelected ? { boxShadow: "0 0 24px hsl(43 76% 47% / 0.1), inset 0 1px 0 hsl(43 76% 47% / 0.1)" } : {}}
                    >
                      {/* Gold top-line for selected */}
                      {isSelected && (
                        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "var(--gradient-gold)" }} />
                      )}

                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2.5 flex-1 min-w-0">
                          {/* Provider Badge */}
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                              isSelected
                                ? "bg-primary/15 text-primary"
                                : "bg-muted/60 text-muted-foreground"
                            }`}>
                              {account.provider}
                            </span>
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
                            )}
                          </div>

                          {/* Pay ID */}
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-lg font-bold text-foreground tracking-wide">
                              {account.payId}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(account.payId);
                              }}
                              className={`p-1.5 rounded-md transition-all duration-200 ${
                                copiedId === account.payId
                                  ? "bg-success/10 text-success scale-110"
                                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                              }`}
                              title="Copy Pay ID"
                            >
                              {copiedId === account.payId ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Account Name + Verified */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{account.name}</span>
                            <div className="flex items-center gap-1 text-success">
                              <BadgeCheck className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-medium">Verified</span>
                            </div>
                          </div>

                          <p className="text-[10px] text-muted-foreground/60">Official Account Only</p>
                        </div>

                        {/* Selection indicator */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all duration-200 ${
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-border/50"
                        }`}>
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Security Notice */}
            <div className="rounded-xl border border-border/30 bg-muted/10 p-3.5 space-y-2">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span>Payments are manually verified for your security.</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                <span>Do not send to unofficial numbers.</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5 text-success flex-shrink-0" />
                <span>Funds will be credited within 5–15 minutes.</span>
              </div>
            </div>

            {/* Screenshot Upload */}
            <div className="space-y-2.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Screenshot</Label>
              {screenshotPreview ? (
                <div className="relative rounded-xl border border-border/30 bg-muted/10 overflow-hidden group">
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
                  <div className="px-3 py-2 border-t border-border/20 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{screenshot?.name}</span>
                    <span className="text-[10px] text-success font-medium">Ready</span>
                  </div>
                </div>
              ) : (
                <label
                  className={`flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
                    isDragging
                      ? "border-primary bg-primary/5 scale-[1.01]"
                      : "border-border/40 bg-muted/10 hover:border-primary/30 hover:bg-muted/20"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isDragging ? "bg-primary/10 text-primary scale-110" : "bg-muted/30 text-muted-foreground"
                  }`}>
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-muted-foreground">
                      {isDragging ? "Drop your screenshot here" : "Click or drag to upload"}
                    </span>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">PNG, JPG up to 5MB</p>
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

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12 text-sm font-bold btn-glow relative overflow-hidden active:scale-[0.98] transition-transform duration-100"
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
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
