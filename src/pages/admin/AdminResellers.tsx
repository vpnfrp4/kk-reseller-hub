import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import ResellerDetailModal from "@/components/admin/ResellerDetailModal";

export default function AdminResellers() {
  const [selectedReseller, setSelectedReseller] = useState<any>(null);

  const { data: resellers } = useQuery({
    queryKey: ["admin-resellers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Resellers</h1>
        <p className="text-muted-foreground text-sm">View all registered resellers</p>
      </div>

      <div className="glass-card overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Email</th>
                <th className="text-right text-xs font-medium text-muted-foreground p-4">Balance</th>
                <th className="text-right text-xs font-medium text-muted-foreground p-4">Spent</th>
                <th className="text-center text-xs font-medium text-muted-foreground p-4">Orders</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Joined</th>
                <th className="text-center text-xs font-medium text-muted-foreground p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(!resellers || resellers.length === 0) ? (
                <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">No resellers yet</td></tr>
              ) : resellers.map((r: any) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm font-medium text-foreground cursor-pointer hover:text-primary" onClick={() => setSelectedReseller(r)}>{r.name || "—"}</td>
                  <td className="p-4 text-sm text-muted-foreground">{r.email}</td>
                  <td className="p-4 text-sm font-mono text-right text-foreground">{r.balance.toLocaleString()}</td>
                  <td className="p-4 text-sm font-mono text-right text-muted-foreground">{r.total_spent.toLocaleString()}</td>
                  <td className="p-4 text-sm font-mono text-center text-muted-foreground">{r.total_orders}</td>
                  <td className="p-4 text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-center">
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelectedReseller(r)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ResellerDetailModal
        reseller={selectedReseller}
        open={!!selectedReseller}
        onOpenChange={(open) => { if (!open) setSelectedReseller(null); }}
      />
    </div>
  );
}
