import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import ResellerDetailModal from "@/components/admin/ResellerDetailModal";
import { DataCard, Money, ResponsiveTable } from "@/components/shared";
import type { Column } from "@/components/shared";

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

  const columns: Column<any>[] = [
    {
      key: "name",
      label: "Name",
      priority: true,
      render: (row) => (
        <span className="cursor-pointer hover:text-primary transition-colors" onClick={() => setSelectedReseller(row)}>
          {row.name || "—"}
        </span>
      ),
    },
    {
      key: "email",
      label: "Email",
      hideOnMobile: true,
    },
    {
      key: "balance",
      label: "Balance",
      align: "right" as const,
      render: (row) => <Money amount={row.balance} />,
    },
    {
      key: "total_spent",
      label: "Spent",
      align: "right" as const,
      hideOnMobile: true,
      render: (row) => <Money amount={row.total_spent} className="text-muted-foreground" />,
    },
    {
      key: "total_orders",
      label: "Orders",
      align: "center" as const,
      render: (row) => <span className="font-mono tabular-nums">{row.total_orders}</span>,
    },
    {
      key: "created_at",
      label: "Joined",
      hideOnMobile: true,
      render: (row) => <span className="text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      align: "center" as const,
      hideOnMobile: true,
      render: (row) => (
        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelectedReseller(row)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-section">
      <div className="animate-fade-in">
        <h1 className="text-h1 text-foreground">Resellers</h1>
        <p className="text-caption text-muted-foreground">View all registered resellers</p>
      </div>

      <DataCard noPadding className="animate-fade-in">
        <ResponsiveTable
          columns={columns}
          data={resellers || []}
          keyExtractor={(row) => row.id}
          emptyMessage="No resellers yet"
          onRowClick={setSelectedReseller}
        />
      </DataCard>

      <ResellerDetailModal
        reseller={selectedReseller}
        open={!!selectedReseller}
        onOpenChange={(open) => { if (!open) setSelectedReseller(null); }}
      />
    </div>
  );
}
