import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import ResellerDetailModal from "@/components/admin/ResellerDetailModal";
import { DataCard, Money, ResponsiveTable } from "@/components/shared";
import type { Column } from "@/components/shared";

type SortField = "name" | "balance" | "total_spent" | "total_orders" | "created_at";

export default function AdminResellers() {
  const [selectedReseller, setSelectedReseller] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("created_at");
  const [balanceFilter, setBalanceFilter] = useState<string>("all");

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

  const filtered = useMemo(() => {
    let list = resellers || [];

    // Search by name or email
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r: any) =>
          r.name?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q)
      );
    }

    // Balance filter
    if (balanceFilter === "zero") list = list.filter((r: any) => r.balance === 0);
    else if (balanceFilter === "low") list = list.filter((r: any) => r.balance > 0 && r.balance < 5000);
    else if (balanceFilter === "active") list = list.filter((r: any) => r.balance >= 5000);

    // Sort
    list = [...list].sort((a: any, b: any) => {
      switch (sortBy) {
        case "name": return (a.name || "").localeCompare(b.name || "");
        case "balance": return b.balance - a.balance;
        case "total_spent": return b.total_spent - a.total_spent;
        case "total_orders": return b.total_orders - a.total_orders;
        case "created_at":
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return list;
  }, [resellers, search, sortBy, balanceFilter]);

  const hasFilters = search || sortBy !== "created_at" || balanceFilter !== "all";

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
        <p className="text-caption text-muted-foreground">
          View all registered resellers
          {resellers?.length ? ` · ${filtered.length} of ${resellers.length}` : ""}
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Select value={balanceFilter} onValueChange={setBalanceFilter}>
          <SelectTrigger className="w-full sm:w-36 h-9">
            <SelectValue placeholder="Balance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Balances</SelectItem>
            <SelectItem value="active">≥ 5,000 MMK</SelectItem>
            <SelectItem value="low">1–4,999 MMK</SelectItem>
            <SelectItem value="zero">Zero Balance</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortField)}>
          <SelectTrigger className="w-full sm:w-36 h-9">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Newest</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="balance">Balance</SelectItem>
            <SelectItem value="total_spent">Total Spent</SelectItem>
            <SelectItem value="total_orders">Total Orders</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-xs gap-1" onClick={() => { setSearch(""); setSortBy("created_at"); setBalanceFilter("all"); }}>
            <X className="w-3 h-3" /> Clear
          </Button>
        )}
      </div>

      <DataCard noPadding className="animate-fade-in">
        <ResponsiveTable
          columns={columns}
          data={filtered}
          keyExtractor={(row) => row.id}
          emptyMessage={search ? `No resellers matching "${search}"` : "No resellers yet"}
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
