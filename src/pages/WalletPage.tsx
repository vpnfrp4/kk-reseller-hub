import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { mockTransactions } from "@/data/mock-data";
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
  const { user } = useAuth();
  const [topupAmount, setTopupAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"kpay" | "wavepay">("kpay");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const presetAmounts = [10000, 30000, 50000, 100000];

  const handleSubmitTopup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupAmount || !screenshot) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setDialogOpen(false);
      setTopupAmount("");
      setScreenshot(null);
    }, 2000);
  };

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (status === "pending") return <Clock className="w-4 h-4 text-warning" />;
    return <XCircle className="w-4 h-4 text-destructive" />;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
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
          <DialogContent className="bg-card border-border max-w-md">
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
                {/* Amount */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Amount (MMK)</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="bg-muted/50 border-border font-mono"
                    required
                  />
                  <div className="flex gap-2 flex-wrap">
                    {presetAmounts.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTopupAmount(amt.toString())}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          topupAmount === amt.toString()
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["kpay", "wavepay"] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`p-3 rounded-lg border text-center text-sm font-medium transition-all ${
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

                {/* Screenshot upload */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Payment Screenshot</Label>
                  <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/20">
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

                <Button type="submit" className="w-full btn-glow" disabled={!topupAmount || !screenshot}>
                  Submit Top-up Request
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Available Balance</span>
          </div>
          <p className="text-3xl font-bold font-mono text-foreground glow-text">
            {user?.balance?.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">MMK</p>
        </div>

        <div className="stat-card animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpRight className="w-5 h-5 text-success" />
            <span className="text-sm text-muted-foreground">Total Deposited</span>
          </div>
          <p className="text-3xl font-bold font-mono text-foreground">180,000</p>
          <p className="text-xs text-muted-foreground mt-1">MMK</p>
        </div>

        <div className="stat-card animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-2 mb-3">
            <ArrowDownRight className="w-5 h-5 text-warning" />
            <span className="text-sm text-muted-foreground">Total Spent</span>
          </div>
          <p className="text-3xl font-bold font-mono text-foreground">
            {user?.totalSpent?.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">MMK</p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: "0.3s" }}>
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold text-foreground">Transaction History</h3>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Date</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Description</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Method</th>
                <th className="text-right text-xs font-medium text-muted-foreground p-4">Amount</th>
                <th className="text-center text-xs font-medium text-muted-foreground p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockTransactions.map((tx) => (
                <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm text-muted-foreground">{tx.date}</td>
                  <td className="p-4 text-sm font-medium text-foreground">{tx.description}</td>
                  <td className="p-4 text-sm text-muted-foreground">{tx.method || "—"}</td>
                  <td className={`p-4 text-sm font-mono font-semibold text-right ${tx.type === "topup" ? "text-success" : "text-foreground"}`}>
                    {tx.type === "topup" ? "+" : ""}{tx.amount.toLocaleString()}
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

        {/* Mobile list */}
        <div className="md:hidden divide-y divide-border/50">
          {mockTransactions.map((tx) => (
            <div key={tx.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {statusIcon(tx.status)}
                <div>
                  <p className="text-sm font-medium text-foreground">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{tx.date}{tx.method ? ` · ${tx.method}` : ""}</p>
                </div>
              </div>
              <p className={`text-sm font-mono font-semibold ${tx.type === "topup" ? "text-success" : "text-foreground"}`}>
                {tx.type === "topup" ? "+" : ""}{tx.amount.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
