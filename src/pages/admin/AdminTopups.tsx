import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import { CheckCircle2, XCircle, Clock, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { DataCard, Money, ResponsiveTable } from "@/components/shared";
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

export default function AdminTopups() {
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ txId: string; action: "approve" | "reject"; name: string; amount: number } | null>(null);

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

  const viewScreenshot = async (path: string) => {
    const { data } = await supabase.storage.from("payment-screenshots").createSignedUrl(path, 300);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      toast.error("Could not load screenshot");
    }
  };

  const pending = (transactions || []).filter((t) => t.status === "pending");
  const processed = (transactions || []).filter((t) => t.status !== "pending");

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
      render: (row) => (
        <span className={`text-[11px] px-2.5 py-1 rounded-full ${row.status === "approved" ? "badge-delivered" : "badge-cancelled"}`}>
          {row.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-section">
      <div className="animate-fade-in">
        <h1 className="text-h1 text-foreground">Wallet Top-ups</h1>
        <p className="text-caption text-muted-foreground">Review and approve reseller top-up requests</p>
      </div>

      {/* Pending */}
      <DataCard
        title={`Pending (${pending.length})`}
        className="animate-fade-in"
        actions={<Clock className="w-4 h-4 text-warning" />}
      >
        {pending.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-card">
            {isLoading ? "Loading..." : "No pending top-ups"}
          </p>
        ) : (
          <div className="space-y-compact">
            {pending.map((tx) => (
              <div key={tx.id} className="glass-card p-default flex flex-col sm:flex-row sm:items-center justify-between gap-default">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {tx.reseller_name}{" "}
                    <span className="text-muted-foreground font-normal">({tx.reseller_email})</span>
                  </p>
                  <div className="flex items-center gap-default mt-micro text-xs text-muted-foreground">
                    <span className="font-mono font-semibold text-foreground text-base">
                      +<Money amount={tx.amount} className="inline text-base" />
                    </span>
                    <span>via {tx.method}</span>
                    <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-tight">
                  {tx.screenshot_url && (
                    <Button variant="outline" size="sm" onClick={() => viewScreenshot(tx.screenshot_url!)} className="gap-1 text-xs">
                      <ImageIcon className="w-3 h-3" />
                      Screenshot
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setConfirmDialog({ txId: tx.id, action: "approve", name: tx.reseller_name || "Unknown", amount: tx.amount })}
                    disabled={processing === tx.id}
                    className="bg-success hover:bg-success/80 text-success-foreground gap-1 text-xs"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setConfirmDialog({ txId: tx.id, action: "reject", name: tx.reseller_name || "Unknown", amount: tx.amount })}
                    disabled={processing === tx.id}
                    className="gap-1 text-xs"
                  >
                    <XCircle className="w-3 h-3" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DataCard>

      {/* Processed */}
      <DataCard title="Processed" noPadding className="animate-fade-in">
        <ResponsiveTable
          columns={processedColumns}
          data={processed}
          keyExtractor={(row) => row.id}
          emptyMessage="No processed transactions"
        />
      </DataCard>

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
