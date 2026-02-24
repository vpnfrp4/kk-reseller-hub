import { useEffect, useState } from "react";
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
import { t } from "@/lib/i18n";

type TxStatus = "pending" | "approved" | "rejected";

interface StepInfo {
  label: string;
  description: string;
  icon: typeof CheckCircle2;
}

const STEPS: StepInfo[] = [
  { label: "တင်သွင်းပြီး", description: "ငွေဖြည့်တောင်းဆိုမှု လက်ခံရရှိပါပြီ", icon: CheckCircle2 },
  { label: "စစ်ဆေးနေသည်", description: "အက်ဒမင်မှ စစ်ဆေးအတည်ပြုနေပါသည်", icon: Clock },
  { label: "ငွေရောက်မည်", description: "ပိုက်ဆံအိတ်တွင် ချက်ချင်းရရှိနိုင်မည်", icon: Wallet },
];

function getActiveStep(status: TxStatus): number {
  if (status === "approved") return 3;
  if (status === "rejected") return -1;
  return 1;
}

export default function TopUpStatusPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const txId = searchParams.get("id");

  const [showConfetti, setShowConfetti] = useState(false);
  const [prevStatus, setPrevStatus] = useState<TxStatus | null>(null);
  const [oldBalance, setOldBalance] = useState<number | null>(null);
  const [justApproved, setJustApproved] = useState(false);

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
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" ? 5000 : false;
    },
  });

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

  // Realtime subscription
  useEffect(() => {
    if (!txId) return;
    const channel = supabase
      .channel(`topup-status-${txId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
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

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("topup-balance-watch")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshProfile();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, refreshProfile]);

  useEffect(() => {
    if (prevStatus && prevStatus !== "approved" && txStatus === "approved") {
      setShowConfetti(true);
      setJustApproved(true);
      if (oldBalance === null && profile) {
        setOldBalance((profile.balance || 0) - (transaction?.amount || 0));
      }
    }
    setPrevStatus(txStatus);
  }, [txStatus]);

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
          <p className="text-muted-foreground">ငွေလွှဲမှတ်တမ်း မတွေ့ပါ</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard/wallet")}>
            {t.nav.wallet.mm}သို့ သွားမည်
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
        { label: t.nav.dashboard.mm, path: "/dashboard" },
        { label: t.nav.wallet.mm, path: "/dashboard/wallet" },
        { label: "ငွေဖြည့်အခြေအနေ" },
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
                <h2 className="text-h1 text-foreground">ငွေဖြည့်မှု အောင်မြင်ပါပြီ</h2>
                <p className="text-body text-muted-foreground">
                  <Money amount={transaction?.amount || 0} className="font-semibold text-foreground inline" /> သင့်ပိုက်ဆံအိတ်သို့ ထည့်ပြီးပါပြီ
                </p>
              </div>

              <div className="rounded-[var(--radius-card)] border border-success/20 bg-success/5 p-6">
                <p className="text-caption text-muted-foreground uppercase tracking-wider mb-2">{t.wallet.availableBalance.mm}</p>
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
                  {t.dashboard.browseProducts.mm}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-12 btn-glass gap-2"
                  onClick={() => navigate("/dashboard/wallet")}
                >
                  <Wallet className="w-4 h-4" />
                  {t.nav.wallet.mm}
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
                <h2 className="text-h1 text-foreground">ငွေဖြည့်မှု ငြင်းပယ်ခံရပါသည်</h2>
                <p className="text-body text-muted-foreground">
                  <Money amount={transaction?.amount || 0} className="font-semibold text-foreground inline" /> တောင်းဆိုမှု အတည်မပြုပါ
                </p>
                <p className="text-caption text-muted-foreground">
                  ငွေလွှဲအချက်အလက်များ ပြန်စစ်ပြီး ထပ်ကြိုးစားပါ
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button className="flex-1 h-12 btn-glow" onClick={() => navigate("/dashboard/wallet")}>
                  ထပ်ကြိုးစားမည်
                </Button>
              </div>
            </div>
          )}

          {/* ── PENDING STATE ── */}
          {isPending && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto"
                  style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.15)" }}>
                  <Clock className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">ငွေဖြည့်နေသည်</h2>
                <p className="text-sm text-muted-foreground">
                  <Money amount={transaction?.amount || 0} className="font-semibold text-foreground inline" /> ({transaction?.method || "Payment"})
                </p>
              </div>

              <div className="space-y-0 px-2">
                {STEPS.map((step, i) => {
                  const stepNum = i + 1;
                  const isDone = stepNum <= activeStep;
                  const isActive = stepNum === activeStep + 1;

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
                            {t.topup.reviewTime.mm}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {typeof queueCount === "number" && queueCount > 0 && (
                <div className="text-center rounded-[var(--radius-card)] border border-border/40 bg-muted/10 py-3 px-4">
                  <p className="text-xs text-muted-foreground">
                    သင့်ရှေ့တွင် <span className="font-semibold text-foreground">{queueCount}</span> တောင်းဆိုမှု ရှိနေပါသေးသည်
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
                <Shield className="w-3.5 h-3.5" />
                <span>ဤစာမျက်နှာသည် အလိုအလျောက် အပ်ဒိတ်ဖြစ်ပါသည်</span>
              </div>

              <Button
                variant="outline"
                className="w-full h-11 btn-glass"
                onClick={() => navigate("/dashboard/wallet")}
              >
                {t.nav.wallet.mm}သို့ ပြန်သွားမည်
              </Button>
            </div>
          )}
        </div>
      </PageContainer>
    </div>
  );
}
