import { useState } from "react";
import { useCountUp } from "@/hooks/use-count-up";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Wallet,
  Plus,
  Upload,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
} from "lucide-react";

export default function WalletPage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [topupAmount, setTopupAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"kpay" | "wavepay">("kpay");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);

  const presetAmounts = [10000, 30000, 50000, 100000];

  const { data: transactions } = useQuery({
    queryKey: ["wallet-transactions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallet_transactions")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const handleSubmitTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupAmount || !screenshot || !user) return;
    setUploading(true);

    try {
      const fileExt = screenshot.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-screenshots")
        .upload(filePath, screenshot);

      if (uploadError) throw uploadError;

      await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        type: "topup",
        amount: parseInt(topupAmount),
        status: "pending",
        method: paymentMethod === "kpay" ? "KPay" : "WavePay",
        description: `Wallet Top-up via ${paymentMethod === "kpay" ? "KPay" : "WavePay"}`,
        screenshot_url: filePath,
      });

      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });

      setTimeout(() => {
        setSubmitted(false);
        setDialogOpen(false);
        setTopupAmount("");
        setScreenshot(null);
      }, 2500);
    } catch (err) {
      console.error("Top-up error:", err);
    } finally {
      setUploading(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (status === "pending") return <Clock className="w-4 h-4 text-warning" />;
    return <XCircle className="w-4 h-4 text-destructive" />;
  };

  const totalDeposited = (transactions || [])
    .filter((t: any) => t.type === "topup" && t.status === "approved")
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const displayBalance = useCountUp(profile?.balance || 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
          <p className="text-muted-foreground text-sm">Manage your credit balance</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-glow gap-2">
              <Plus className="w-4 h-4" />
              Top Up
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border/50 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground">Top Up Wallet</DialogTitle>
            </DialogHeader>

            {submitted ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
                <p className="text-foreground font-semibold">Top-up request submitted!</p>
                <p className="text-sm text-muted-foreground">We'll review your payment and credit your account shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitTopup} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Amount (MMK)</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="bg-muted/50 border-border font-mono"
                    required
                    min={1000}
                  />
                  <div className="flex gap-2 flex-wrap">
                    {presetAmounts.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTopupAmount(amt.toString())}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                          topupAmount === amt.toString()
                            ? "btn-glow"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["kpay", "wavepay"] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`p-3 rounded-lg border text-center text-sm font-medium transition-all duration-200 ${
                          paymentMethod === method
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground"
                        }`}
                      >
                        {method === "kpay" ? "KPay" : "WavePay"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Payment Screenshot</Label>
                  <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors duration-200 bg-muted/20">
                    {screenshot ? (
                      <>
                        <ImageIcon className="w-8 h-8 text-success" />
                        <span className="text-sm text-foreground">{screenshot.name}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Click to upload screenshot</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                <Button type="submit" className="w-full btn-glow" disabled={!topupAmount || !screenshot || uploading}>
                  {uploading ? "Submitting..." : "Submit Top-up Request"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Wallet Hero */}
      <div className="wallet-hero p-6 lg:p-8 animate-fade-in" style={{ animationDelay: "0.05s" }}>
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Available Balance</span>
            </div>
            <p className="text-4xl font-bold font-mono gold-shimmer glow-text">
              {displayBalance.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">MMK</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-5 h-5 text-success" />
              <span className="text-sm text-muted-foreground">Total Deposited</span>
            </div>
            <p className="text-3xl font-bold font-mono text-foreground">{totalDeposited.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">MMK</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownRight className="w-5 h-5 text-ice" />
              <span className="text-sm text-muted-foreground">Total Spent</span>
            </div>
            <p className="text-3xl font-bold font-mono text-foreground">
              {(profile?.total_spent || 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">MMK</p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <div className="p-6 border-b border-border/50">
          <h3 className="font-semibold text-foreground">Transaction History</h3>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Date</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Description</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Method</th>
                <th className="text-right text-xs font-medium text-muted-foreground p-4">Amount</th>
                <th className="text-center text-xs font-medium text-muted-foreground p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {(!transactions || transactions.length === 0) ? (
                <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No transactions yet</td></tr>
              ) : transactions.map((tx: any) => (
                <tr key={tx.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors duration-200">
                  <td className="p-4 text-sm text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-sm font-medium text-foreground">{tx.description}</td>
                  <td className="p-4 text-sm text-muted-foreground">{tx.method || "—"}</td>
                  <td className={`p-4 text-sm font-mono font-semibold text-right ${tx.type === "topup" ? "text-success" : "text-foreground"}`}>
                    {tx.type === "topup" ? "+" : "-"}{Math.abs(tx.amount).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1.5">
                      {statusIcon(tx.status)}
                      <span className="text-xs capitalize text-muted-foreground">{tx.status}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-border/30">
          {(!transactions || transactions.length === 0) ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No transactions yet</p>
          ) : transactions.map((tx: any) => (
            <div key={tx.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {statusIcon(tx.status)}
                <div>
                  <p className="text-sm font-medium text-foreground">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}{tx.method ? ` · ${tx.method}` : ""}</p>
                </div>
              </div>
              <p className={`text-sm font-mono font-semibold ${tx.type === "topup" ? "text-success" : "text-foreground"}`}>
                {tx.type === "topup" ? "+" : "-"}{Math.abs(tx.amount).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
