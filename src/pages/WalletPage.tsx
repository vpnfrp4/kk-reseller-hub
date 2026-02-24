import Breadcrumb from "@/components/Breadcrumb";
import { useCountUp } from "@/hooks/use-count-up";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import TopUpDialog from "@/components/wallet/TopUpDialog";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react";
import { downloadReceipt } from "@/lib/receipt";
import { Button } from "@/components/ui/button";

export default function WalletPage() {
  const { user, profile } = useAuth();

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
      <Breadcrumb items={[
        { label: "Dashboard", path: "/dashboard" },
        { label: "Wallet" },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
          <p className="text-muted-foreground text-sm">Manage your credit balance</p>
        </div>
        <TopUpDialog userId={user?.id} />
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
          <table className="premium-table">
            <thead>
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Description</th>
                <th className="p-4">Method</th>
                <th className="text-right p-4">Amount</th>
                <th className="text-center p-4">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {(!transactions || transactions.length === 0) ? (
                <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No transactions yet</td></tr>
              ) : transactions.map((tx: any, i: number) => (
                <tr key={tx.id} className="opacity-0 animate-row-in" style={{ animationDelay: `${i * 0.04}s` }}>
                  <td className="p-4 text-sm text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-sm font-medium text-foreground">{tx.description}</td>
                  <td className="p-4 text-sm text-muted-foreground">{tx.method || "—"}</td>
                  <td className={`p-4 text-sm font-mono font-semibold text-right ${tx.type === "topup" ? "text-success" : "text-foreground"}`}>
                    {tx.type === "topup" ? "+" : "-"}{Math.abs(tx.amount).toLocaleString()}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      tx.status === "approved" ? "badge-delivered" :
                      tx.status === "pending" ? "badge-pending" :
                      "badge-cancelled"
                    }`}>{tx.status}</span>
                  </td>
                  <td className="p-4">
                    {tx.type === "topup" && tx.status === "approved" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => downloadReceipt(tx, profile?.name || profile?.email || "User")}
                        title="Download receipt"
                      >
                        <Download className="w-4 h-4 text-primary" />
                      </Button>
                    )}
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
              <div className="flex items-center gap-2">
                <p className={`text-sm font-mono font-semibold ${tx.type === "topup" ? "text-success" : "text-foreground"}`}>
                  {tx.type === "topup" ? "+" : "-"}{Math.abs(tx.amount).toLocaleString()}
                </p>
                {tx.type === "topup" && tx.status === "approved" && (
                  <button
                    onClick={() => downloadReceipt(tx, profile?.name || profile?.email || "User")}
                    className="p-1 rounded hover:bg-muted transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-primary" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
