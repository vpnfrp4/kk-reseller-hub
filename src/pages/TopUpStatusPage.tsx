import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCountUp } from "@/hooks/use-count-up";
import Breadcrumb from "@/components/Breadcrumb";
import Confetti from "@/components/Confetti";
import { Button } from "@/components/ui/button";
import { PageContainer, Money } from "@/components/shared";
import {
  CheckCircle2,
  Clock,
  Loader2,
  ShoppingCart,
  Wallet,
  Shield,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TxStatus = "pending" | "approved" | "rejected";

interface StepInfo {
  label: string;
  description: string;
  icon: typeof CheckCircle2;
}

const STEPS: StepInfo[] = [
  { label: "Request Submitted", description: "Your top-up request has been received", icon: CheckCircle2 },
  { label: "Payment Under Review", description: "Admin is verifying your payment", icon: Clock },
  { label: "Wallet Credited", description: "Funds available in your wallet", icon: Wallet },
];

function getActiveStep(status: TxStatus): number {
  if (status === "approved") return 3;
  if (status === "rejected") return -1;
  return 1; // pending → step 2 active (0-indexed: step 1 done, step 2 active)
}

export default function TopUpStatusPage() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const txId = searchParams.get("id");

  const [showConfetti, setShowConfetti] = useState(false);
  const [prevStatus, setPrevStatus] = useState<TxStatus | null>(null);
  const [oldBalance, setOldBalance] = useState<number | null>(null);
  const [justApproved, setJustApproved] = useState(false);

  // Fetch the specific transaction
  const { data: transaction } = useQuery({
    queryKey: ["topup-status", txId],
    queryFn: async () => {
      if (!txId) return null;
      const { data } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("id", txId)
        .single();
      return data;
    },
    enabled: !!txId,
    refetchInterval: false, // we use realtime instead
  });

  // Count pending requests ahead
  const { data: queueCount } = useQuery({
    queryKey: ["topup-queue", txId],
    queryFn: async () => {
      if (!txId || !transaction) return 0;
      const { count } = await supabase
        .from("wallet_transactions")
        .select("id", { count: "exact", head: true })
        .eq("type", "topup")
        .eq("status", "pending")
        .lt("created_at", transaction.created_at);
      return count || 0;
    },
    enabled: !!txId && !!transaction && transaction.status === "pending",
  });

  const txStatus = (transaction?.status || "pending") as TxStatus;
  const activeStep = getActiveStep(txStatus);

  // Realtime subscription for this transaction
  useEffect(() => {
    if (!txId) return;
    const channel = supabase
      .channel(`topup-status-${txId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wallet_transactions",
          filter: `id=eq.${txId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["topup-status", txId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [txId, queryClient]);

  // Also listen for profile balance changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("topup-balance-watch")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  // Detect status change to approved → trigger success
  useEffect(() => {
    if (prevStatus && prevStatus !== "approved" && txStatus === "approved") {
      setShowConfetti(true);
      setJustApproved(true);
      // Store old balance for count-up animation
      if (oldBalance === null && profile) {
        setOldBalance((profile.balance || 0) - (transaction?.amount || 0));
      }
    }
    setPrevStatus(txStatus);
  }, [txStatus]);

  // Capture initial balance before approval for animation
  useEffect(() => {
    if (txStatus === "pending" && profile && oldBalance === null) {
      setOldBalance(profile.balance || 0);
    }
  }, [profile, txStatus]);

  const animatedBalance = useCountUp(
    justApproved ? (profile?.balance || 0) : 0,
    800
  );

  if (!txId) {
    return (
      <PageContainer>
        <div className="text-center py-page">
          <p className="text-muted-foreground">No transaction specified.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard/wallet")}>
            Go to Wallet
          </Button>
        </div>
      </PageContainer>
    );
  }

  const isApproved = txStatus === "approved";
  const isRejected = txStatus === "rejected";
  const isPending = txStatus === "pending";

  return (
    <div className="space-y-section">
      <Breadcrumb items={[
        { label: "Dashboard", path: "/dashboard" },
        { label: "Wallet", path: "/dashboard/wallet" },
        { label: "Top-Up Status" },
      ]} />

      <PageContainer maxWidth="max-w-xl">
        <div className="glass-card p-8 sm:p-10 relative overflow-hidden animate-fade-in">
          {showConfetti && <Confetti duration={4000} />}

          {/* ── SUCCESS STATE ── */}
          {isApproved && (
            <div className="text-center space-y-6 animate-fade-in relative z-10">
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto animate-scale-in"
                style={{ boxShadow: "0 0 40px hsl(var(--success) / 0.2)" }}>
                <PartyPopper className="w-10 h-10 text-success" />
              </div>

              <div className="space-y-2">
                <h2 className="text-h1 text-foreground">Top-Up Successful!</h2>
                <p className="text-body text-muted-foreground">
                  <Money amount={transaction?.amount || 0} className="font-semibold text-foreground inline" /> has been credited to your wallet.
                </p>
              </div>

              {/* Balance Animation */}
              <div className="rounded-[var(--radius-card)] border border-success/20 bg-success/5 p-6">
                <p className="text-caption text-muted-foreground uppercase tracking-wider mb-2">New Wallet Balance</p>
                <p className="text-4xl font-bold font-mono tabular-nums text-success tracking-tight">
                  {justApproved
                    ? animatedBalance.toLocaleString()
                    : (profile?.balance || 0).toLocaleString()
                  }
                  <span className="text-base font-semibold text-muted-foreground ml-2">MMK</span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  className="flex-1 h-12 btn-glow gap-2"
                  onClick={() => navigate("/dashboard/products")}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Continue Shopping
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-12 btn-glass gap-2"
                  onClick={() => navigate("/dashboard/wallet")}
                >
                  <Wallet className="w-4 h-4" />
                  View Wallet
                </Button>
              </div>
            </div>
          )}

          {/* ── REJECTED STATE ── */}
          {isRejected && (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <Shield className="w-10 h-10 text-destructive" />
              </div>

              <div className="space-y-2">
                <h2 className="text-h1 text-foreground">Top-Up Rejected</h2>
                <p className="text-body text-muted-foreground">
                  Your request for <Money amount={transaction?.amount || 0} className="font-semibold text-foreground inline" /> was not approved.
                </p>
                <p className="text-caption text-muted-foreground">
                  Please verify your payment details and try again, or contact support.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button className="flex-1 h-12 btn-glow" onClick={() => navigate("/dashboard/wallet")}>
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* ── PENDING STATE — STATUS TRACKER ── */}
          {isPending && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto"
                  style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.15)" }}>
                  <Clock className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Top-Up In Progress</h2>
                <p className="text-sm text-muted-foreground">
                  <Money amount={transaction?.amount || 0} className="font-semibold text-foreground inline" /> via {transaction?.method || "Payment"}
                </p>
              </div>

              {/* Steps */}
              <div className="space-y-0 px-2">
                {STEPS.map((step, i) => {
                  const stepNum = i + 1;
                  const isDone = stepNum <= activeStep;
                  const isActive = stepNum === activeStep + 1;
                  const isFuture = stepNum > activeStep + 1;

                  return (
                    <div key={i} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500",
                          isDone
                            ? "bg-success text-success-foreground shadow-[0_0_12px_hsl(var(--success)/0.3)]"
                            : isActive
                              ? "bg-primary/10 border-2 border-primary text-primary"
                              : "bg-muted border border-border text-muted-foreground"
                        )}>
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : isActive ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <span className="text-sm font-bold">{stepNum}</span>
                          )}
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={cn(
                            "w-px h-8 transition-all duration-500",
                            isDone ? "bg-success/40" : "bg-border"
                          )} />
                        )}
                      </div>
                      <div className="pt-2 pb-4">
                        <p className={cn(
                          "text-sm font-medium transition-colors",
                          isDone ? "text-foreground" : isActive ? "text-primary" : "text-muted-foreground"
                        )}>
                          {step.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                        {isActive && (
                          <p className="text-xs text-primary/80 mt-1 flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                            </span>
                            Usually completed within 5–15 minutes
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Queue indicator */}
              {typeof queueCount === "number" && queueCount > 0 && (
                <div className="text-center rounded-[var(--radius-card)] border border-border/40 bg-muted/10 py-3 px-4">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{queueCount}</span> request{queueCount !== 1 ? "s" : ""} ahead of you
                  </p>
                </div>
              )}

              {/* Security footer */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
                <Shield className="w-3.5 h-3.5" />
                <span>This page updates automatically — no refresh needed</span>
              </div>

              <Button
                variant="outline"
                className="w-full h-11 btn-glass"
                onClick={() => navigate("/dashboard/wallet")}
              >
                Back to Wallet
              </Button>
            </div>
          )}
        </div>
      </PageContainer>
    </div>
  );
}
