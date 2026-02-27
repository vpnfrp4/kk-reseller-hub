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
import { Money, ResponsiveTable } from "@/components/shared";
import type { Column } from "@/components/shared";
import { t, useT } from "@/lib/i18n";
import MmLabel, { MmStatus } from "@/components/shared/MmLabel";
import { cn } from "@/lib/utils";

export default function WalletPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [balanceFlash, setBalanceFlash] = useState(false);
  const prevBalanceRef = useRef<number | null>(null);
  const l = useT();

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
      label: l(t.orders.date),
      hideOnMobile: true,
      render: (row) => <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</span>,
    },
    {
      key: "description",
      label: l(t.detail.description),
      priority: true,
    },
    {
      key: "method",
      label: l(t.topup.paymentMethods),
      hideOnMobile: true,
      render: (row) => <span className="text-xs text-muted-foreground">{row.method || "—"}</span>,
    },
    {
      key: "amount",
      label: l(t.topup.amount),
      align: "right" as const,
      render: (row) => (
        <span className={cn("font-mono font-semibold text-sm", row.type === "topup" ? "text-primary" : "text-foreground")}>
          {row.type === "topup" ? "+" : "-"}
          <Money amount={Math.abs(row.amount)} className="inline" />
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      align: "center" as const,
      render: (row) => <MmStatus status={row.status} />,
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
    <div className="space-y-[var(--space-section)]">
      <Breadcrumb items={[
        { label: l(t.nav.dashboard), path: "/dashboard" },
        { label: l(t.nav.wallet) },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--space-default)] animate-fade-in">
        <div>
          <h1 className="text-foreground">
            <MmLabel mm={t.wallet.title.mm} en={t.wallet.title.en} />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{l(t.wallet.subtitle)}</p>
        </div>
        <TopUpDialog
          userId={user?.id}
          onSubmitted={(txId) => navigate(`/dashboard/topup-status/${txId}`)}
        />
      </div>

      {/* Wallet Hero */}
      <div className="wallet-hero p-[var(--space-card)] lg:p-[var(--space-section)] animate-fade-in" style={{ animationDelay: "0.05s" }}>
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-[var(--space-card)]">
          {/* Balance */}
          <div>
            <div className="flex items-center gap-[var(--space-tight)] mb-2">
              <Wallet className="w-5 h-5 text-primary" />
              <MmLabel mm={t.wallet.availableBalance.mm} en={t.wallet.availableBalance.en} className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground" />
            </div>
            <p
              className={cn(
                "text-4xl font-bold font-mono tabular-nums tracking-tight transition-all duration-500",
                balanceFlash ? "scale-105 text-primary" : "text-foreground"
              )}
              style={!balanceFlash ? {
                backgroundImage: "linear-gradient(90deg, hsl(var(--foreground)) 0%, hsl(43 65% 72%) 40%, hsl(43 65% 52%) 50%, hsl(43 65% 72%) 60%, hsl(var(--foreground)) 100%)",
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "gold-shimmer 4s ease-in-out infinite",
              } : undefined}
            >
              {displayBalance.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground/50 mt-[var(--space-micro)]">MMK</p>
          </div>

          {/* Total Deposited */}
          <div>
            <div className="flex items-center gap-[var(--space-tight)] mb-2">
              <ArrowUpRight className="w-5 h-5 text-primary" />
              <MmLabel mm={t.wallet.totalDeposited.mm} en={t.wallet.totalDeposited.en} className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold font-mono tabular-nums text-foreground tracking-tight">
              {totalDeposited.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground/50 mt-[var(--space-micro)]">MMK</p>
          </div>

          {/* Total Spent */}
          <div>
            <div className="flex items-center gap-[var(--space-tight)] mb-2">
              <ArrowDownRight className="w-5 h-5 text-ice" />
              <MmLabel mm={t.wallet.totalSpent.mm} en={t.wallet.totalSpent.en} className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold font-mono tabular-nums text-foreground tracking-tight">
              {(profile?.total_spent || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground/50 mt-[var(--space-micro)]">MMK</p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="p-[var(--space-card)] border-b border-border/30">
          <h3 className="text-sm font-semibold text-foreground">{l(t.wallet.txHistory)}</h3>
        </div>
        <ResponsiveTable
          columns={txColumns}
          data={transactions || []}
          keyExtractor={(row) => row.id}
          emptyMessage={l(t.wallet.noTx)}
        />
      </div>
    </div>
  );
}
