import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, Image as ImageIcon, Settings2, ExternalLink, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { DataCard, Money, ResponsiveTable, StatusBadge } from "@/components/shared";
import type { Column } from "@/components/shared";

interface TopupTransaction {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  method: string | null;
  description: string;
  screenshot_url: string | null;
  created_at: string;
  reseller_name?: string;
  reseller_email?: string;
}

/* ─── Screenshot Thumbnail ─── */
function ScreenshotThumb({ path, onClick }: { path: string; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.storage.from("payment-screenshots").createSignedUrl(path, 600).then(({ data }) => {
      if (!cancelled && data?.signedUrl) setUrl(data.signedUrl);
    });
    return () => { cancelled = true; };
  }, [path]);

  if (!url) {
    return (
      <div className="w-12 h-12 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-center shrink-0 animate-pulse">
        <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <button onClick={onClick} className="relative w-12 h-12 rounded-lg border border-border/50 overflow-hidden shrink-0 group hover:ring-2 hover:ring-primary/40 transition-all">
      <img src={url} alt="Payment screenshot" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <ExternalLink className="w-3.5 h-3.5 text-foreground" />
      </div>
    </button>
  );
}

/* ─── Auto-Approve Settings ─── */
const AUTO_APPROVE_KEY = "admin-auto-approve-topups";
const AUTO_APPROVE_THRESHOLD_KEY = "admin-auto-approve-threshold";

function getAutoApprove(): boolean {
  try { return localStorage.getItem(AUTO_APPROVE_KEY) === "true"; } catch { return false; }
}
function getAutoApproveThreshold(): number {
  try { return Number(localStorage.getItem(AUTO_APPROVE_THRESHOLD_KEY)) || 50000; } catch { return 50000; }
}

export default function AdminTopups() {
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ txId: string; action: "approve" | "reject"; name: string; amount: number } | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Auto-approve settings
  const [autoApprove, setAutoApprove] = useState(getAutoApprove);
  const [autoThreshold, setAutoThreshold] = useState(getAutoApproveThreshold);

  useEffect(() => {
    localStorage.setItem(AUTO_APPROVE_KEY, String(autoApprove));
  }, [autoApprove]);
  useEffect(() => {
    localStorage.setItem(AUTO_APPROVE_THRESHOLD_KEY, String(autoThreshold));
  }, [autoThreshold]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-topups-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallet_transactions" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-topups"] });
          queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["admin-topups"],
    queryFn: async () => {
      const { data: txData, error: txError } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("type", "topup")
        .order("created_at", { ascending: false });

      if (txError) throw txError;
      if (!txData || txData.length === 0) return [];

      const userIds = [...new Set(txData.map((t) => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      return txData.map((tx) => {
        const profile = profileMap.get(tx.user_id);
        return {
          ...tx,
          reseller_name: profile?.name || "Unknown",
          reseller_email: profile?.email || "",
        } as TopupTransaction;
      });
    },
  });

  const handleAction = async (txId: string, action: "approve" | "reject") => {
    setProcessing(txId);
    try {
      const { data, error } = await supabase.functions.invoke("approve-topup", {
        body: { transaction_id: txId, action },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast.success(`Top-up ${action === "approve" ? "approved" : "rejected"}`);
      queryClient.invalidateQueries({ queryKey: ["admin-topups"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setProcessing(null);
    }
  };

  const openScreenshot = async (path: string) => {
    const { data } = await supabase.storage.from("payment-screenshots").createSignedUrl(path, 300);
    if (data?.signedUrl) {
      setLightboxUrl(data.signedUrl);
    } else {
      toast.error("Could not load screenshot");
    }
  };

  const pending = (transactions || []).filter((t) => t.status === "pending");
  const processed = (transactions || []).filter((t) => t.status !== "pending");

  // Stats
  const approvedTotal = processed.filter(t => t.status === "approved").reduce((s, t) => s + t.amount, 0);
  const rejectedCount = processed.filter(t => t.status === "rejected").length;

  const processedColumns: Column<TopupTransaction>[] = [
    {
      key: "reseller_name",
      label: "Reseller",
      priority: true,
    },
    {
      key: "amount",
      label: "Amount",
      align: "right" as const,
      render: (row) => (
        <span className="text-success font-semibold">
          +<Money amount={row.amount} className="inline" />
        </span>
      ),
    },
    {
      key: "method",
      label: "Method",
      hideOnMobile: true,
      render: (row) => <span className="text-muted-foreground">{row.method || "—"}</span>,
    },
    {
      key: "created_at",
      label: "Date",
      hideOnMobile: true,
      render: (row) => <span className="text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</span>,
    },
    {
      key: "status",
      label: "Status",
      align: "center" as const,
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-xl font-bold text-foreground">Wallet Top-ups</h1>
        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.1em] mt-1">Review and approve reseller top-up requests</p>
      </div>

      {/* Settings + Stats — side by side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 animate-fade-in">
        {/* Auto-Approve Settings */}
        <DataCard title="Auto-Approve Settings" actions={<Settings2 className="w-4 h-4 text-muted-foreground" />}>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Switch checked={autoApprove} onCheckedChange={setAutoApprove} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <Label className="text-sm font-medium text-foreground">Auto-Approve Top-ups</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  Automatically approve requests below the threshold amount
                </p>
              </div>
            </div>
            {autoApprove && (
              <div className="flex items-center gap-3 pl-10">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Max Amount:</Label>
                <Input
                  type="number"
                  value={autoThreshold}
                  onChange={(e) => setAutoThreshold(Number(e.target.value) || 0)}
                  className="w-28 h-8 text-sm"
                />
                <span className="text-xs text-muted-foreground">MMK</span>
              </div>
            )}
          </div>
        </DataCard>

        {/* Quick Stats */}
        <DataCard title="Top-up Statistics" actions={<TrendingUp className="w-4 h-4 text-muted-foreground" />}>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-warning tabular-nums">{pending.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success tabular-nums">{approvedTotal.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Approved (MMK)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive tabular-nums">{rejectedCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Rejected</p>
            </div>
          </div>
        </DataCard>
      </div>

      {/* Pending Requests */}
      <DataCard
        title={`Pending Requests (${pending.length})`}
        className="animate-fade-in [animation-delay:0.08s]"
        actions={<Clock className="w-4 h-4 text-warning" />}
      >
        {pending.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            {isLoading ? "Loading..." : "No pending top-ups"}
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((tx) => (
              <div
                key={tx.id}
                className="rounded-xl border border-border/60 bg-secondary/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex gap-3 flex-1 min-w-0">
                  {tx.screenshot_url && (
                    <ScreenshotThumb path={tx.screenshot_url} onClick={() => openScreenshot(tx.screenshot_url!)} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {tx.reseller_name}
                      <span className="text-muted-foreground font-normal text-xs ml-1.5">({tx.reseller_email})</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                      <span className="font-mono font-semibold text-foreground text-base">
                        +<Money amount={tx.amount} className="inline text-base" />
                      </span>
                      <span className="text-muted-foreground/60">•</span>
                      <span>via {tx.method}</span>
                      <span className="text-muted-foreground/60">•</span>
                      <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                      {autoApprove && tx.amount <= autoThreshold && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full badge-completed">Auto-eligible</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 sm:ml-4">
                  <Button
                    size="sm"
                    onClick={() => setConfirmDialog({ txId: tx.id, action: "approve", name: tx.reseller_name || "Unknown", amount: tx.amount })}
                    disabled={processing === tx.id}
                    className="bg-success hover:bg-success/80 text-success-foreground gap-1.5 text-xs h-9 px-4"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setConfirmDialog({ txId: tx.id, action: "reject", name: tx.reseller_name || "Unknown", amount: tx.amount })}
                    disabled={processing === tx.id}
                    className="gap-1.5 text-xs h-9 px-4"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DataCard>

      {/* Processed History */}
      <DataCard title="Processed History" noPadding className="animate-fade-in [animation-delay:0.15s]">
        <ResponsiveTable
          columns={processedColumns}
          data={processed}
          keyExtractor={(row) => row.id}
          emptyMessage="No processed transactions"
        />
      </DataCard>

      {/* Screenshot Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={(open) => !open && setLightboxUrl(null)}>
        <DialogContent className="bg-card border-border max-w-lg p-2">
          {lightboxUrl && (
            <img src={lightboxUrl} alt="Payment screenshot" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              {confirmDialog?.action === "approve" ? "Approve Top-up" : "Reject Top-up"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.action === "approve"
                ? `This will add ${confirmDialog?.amount.toLocaleString()} MMK to ${confirmDialog?.name}'s balance. This action cannot be undone.`
                : `This will reject ${confirmDialog?.name}'s top-up request of ${confirmDialog?.amount.toLocaleString()} MMK. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmDialog?.action === "approve" ? "bg-success hover:bg-success/80 text-success-foreground" : "bg-destructive hover:bg-destructive/80 text-destructive-foreground"}
              onClick={() => {
                if (confirmDialog) {
                  handleAction(confirmDialog.txId, confirmDialog.action);
                  setConfirmDialog(null);
                }
              }}
            >
              {confirmDialog?.action === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}