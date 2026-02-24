import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  Download,
} from "lucide-react";
import { downloadReceipt } from "@/lib/receipt";
import { Button } from "@/components/ui/button";
import { DataCard, Money, ResponsiveTable } from "@/components/shared";
import type { Column } from "@/components/shared";

export default function WalletPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [balanceFlash, setBalanceFlash] = useState(false);
  const prevBalanceRef = useRef<number | null>(null);

  const { data: transactions, refetch: refetchTransactions } = useQuery({
    queryKey: ["wallet-transactions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallet_transactions")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Detect balance changes and trigger flash animation
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

  // Realtime transaction updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('wallet-tx-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refetchTransactions();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const totalDeposited = (transactions || [])
    .filter((t: any) => t.type === "topup" && t.status === "approved")
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const displayBalance = useCountUp(profile?.balance || 0);

  const txColumns: Column<any>[] = [
    {
      key: "created_at",
      label: "Date",
      hideOnMobile: true,
      render: (row) => <span className="text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</span>,
    },
    {
      key: "description",
      label: "Description",
      priority: true,
    },
    {
      key: "method",
      label: "Method",
      hideOnMobile: true,
      render: (row) => <span className="text-muted-foreground">{row.method || "—"}</span>,
    },
    {
      key: "amount",
      label: "Amount",
      align: "right" as const,
      render: (row) => (
        <span className={`font-mono font-semibold ${row.type === "topup" ? "text-success" : "text-foreground"}`}>
          {row.type === "topup" ? "+" : "-"}
          <Money amount={Math.abs(row.amount)} className="inline" />
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      align: "center" as const,
      render: (row) => (
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          row.status === "approved" ? "badge-delivered" :
          row.status === "pending" ? "badge-pending" :
          "badge-cancelled"
        }`}>{row.status}</span>
      ),
    },
    {
      key: "actions",
      label: "",
      hideOnMobile: true,
      render: (row) =>
        row.type === "topup" && row.status === "approved" ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => downloadReceipt(row, profile?.name || profile?.email || "User")}
            title="Download receipt"
          >
            <Download className="w-4 h-4 text-primary" />
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-section">
      <Breadcrumb items={[
        { label: "Dashboard", path: "/dashboard" },
        { label: "Wallet" },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-default animate-fade-in">
        <div>
          <h1 className="text-h1 text-foreground">Wallet</h1>
          <p className="text-caption text-muted-foreground">Manage your credit balance</p>
        </div>
        <TopUpDialog
          userId={user?.id}
          onSubmitted={(txId) => navigate(`/dashboard/wallet/topup-status?id=${txId}`)}
        />
      </div>

      {/* Wallet Hero */}
      <div className="wallet-hero p-card lg:p-8 animate-fade-in" style={{ animationDelay: "0.05s" }}>
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-default">
          <div>
            <div className="flex items-center gap-tight mb-2">
              <Wallet className="w-5 h-5 text-primary" />
              <span className="text-caption text-muted-foreground">Available Balance</span>
            </div>
            <p className={`text-4xl font-bold font-mono gold-shimmer glow-text transition-all duration-500 ${
              balanceFlash ? "scale-110 text-success drop-shadow-[0_0_20px_hsl(var(--success)/0.6)]" : ""
            }`}>
              {displayBalance.toLocaleString()}
            </p>
            <p className="text-caption text-muted-foreground mt-micro">MMK</p>
          </div>

          <div>
            <div className="flex items-center gap-tight mb-2">
              <ArrowUpRight className="w-5 h-5 text-success" />
              <span className="text-caption text-muted-foreground">Total Deposited</span>
            </div>
            <p className="text-3xl font-bold font-mono text-foreground">{totalDeposited.toLocaleString()}</p>
            <p className="text-caption text-muted-foreground mt-micro">MMK</p>
          </div>

          <div>
            <div className="flex items-center gap-tight mb-2">
              <ArrowDownRight className="w-5 h-5 text-ice" />
              <span className="text-caption text-muted-foreground">Total Spent</span>
            </div>
            <p className="text-3xl font-bold font-mono text-foreground">
              {(profile?.total_spent || 0).toLocaleString()}
            </p>
            <p className="text-caption text-muted-foreground mt-micro">MMK</p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <DataCard title="Transaction History" noPadding className="animate-fade-in">
        <ResponsiveTable
          columns={txColumns}
          data={transactions || []}
          keyExtractor={(row) => row.id}
          emptyMessage="No transactions yet"
        />
      </DataCard>
    </div>
  );
}
