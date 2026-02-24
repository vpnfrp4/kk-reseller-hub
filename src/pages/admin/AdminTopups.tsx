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
      // Fetch topup transactions
      const { data: txData, error: txError } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("type", "topup")
        .order("created_at", { ascending: false });

      if (txError) throw txError;
      if (!txData || txData.length === 0) return [];

      // Fetch profile info for all unique user_ids
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

  return (
    <div className="space-y-8">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Wallet Top-ups</h1>
        <p className="text-muted-foreground text-sm">Review and approve reseller top-up requests</p>
      </div>

      {/* Pending */}
      <div className="space-y-3 animate-fade-in">
        <h3 className="text-sm font-semibold text-warning flex items-center gap-2">
          <Clock className="w-4 h-4" /> Pending ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <div className="glass-card p-8 text-center text-sm text-muted-foreground">
            {isLoading ? "Loading..." : "No pending top-ups"}
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((tx) => (
              <div key={tx.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {tx.reseller_name}{" "}
                    <span className="text-muted-foreground font-normal">({tx.reseller_email})</span>
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="font-mono font-semibold text-foreground text-base">
                      +{tx.amount.toLocaleString()} MMK
                    </span>
                    <span>via {tx.method}</span>
                    <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
      </div>

      {/* Processed */}
      <div className="space-y-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <h3 className="text-sm font-semibold text-muted-foreground">Processed</h3>
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="premium-table">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Reseller</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-4">Amount</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Method</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Date</th>
                  <th className="text-center text-xs font-medium text-muted-foreground p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {processed.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No processed transactions</td></tr>
                ) : processed.map((tx) => (
                  <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-4 text-sm text-foreground">{tx.reseller_name}</td>
                    <td className="p-4 text-sm font-mono text-right text-foreground">+{tx.amount.toLocaleString()}</td>
                    <td className="p-4 text-sm text-muted-foreground">{tx.method}</td>
                    <td className="p-4 text-sm text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</td>
                     <td className="p-4 text-center">
                      <span className={`text-[11px] px-2.5 py-1 rounded-full ${tx.status === "approved" ? "badge-delivered" : "badge-cancelled"}`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
