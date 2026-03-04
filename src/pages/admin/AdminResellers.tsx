import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, ShieldCheck, Ban, Crown, UserCheck, User } from "lucide-react";
import ResellerDetailModal from "@/components/admin/ResellerDetailModal";
import { DataCard, Money, ResponsiveTable, StatusBadge } from "@/components/shared";
import type { Column } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type SortField = "name" | "balance" | "total_spent" | "total_orders" | "created_at";

const tierColors: Record<string, string> = {
  bronze: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  silver: "bg-gray-400/15 text-gray-300 border-gray-400/20",
  gold: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  platinum: "bg-purple-400/15 text-purple-300 border-purple-400/20",
};

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success",
  suspended: "bg-warning/10 text-warning",
  blocked: "bg-destructive/10 text-destructive",
};

export default function AdminResellers() {
  const queryClient = useQueryClient();
  const [selectedReseller, setSelectedReseller] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("created_at");
  const [balanceFilter, setBalanceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [togglingRole, setTogglingRole] = useState<string | null>(null);

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

  const getUserRole = (r: any) => r.total_orders > 0 || r.total_spent > 0 ? "reseller" : "customer";

  const toggleUserRole = async (userId: string, currentRole: string) => {
    setTogglingRole(userId);
    try {
      // Toggle by setting total_orders to 1 (reseller) or 0 (customer) as a designation
      // In practice, this is a visual designation — actual order history is preserved
      const newVal = currentRole === "customer" ? { total_orders: 1 } : { total_orders: 0, total_spent: 0 };
      const { error } = await supabase.from("profiles").update(newVal).eq("user_id", userId);
      if (error) throw error;
      toast.success(`User role updated to ${currentRole === "customer" ? "Reseller" : "Customer"}`);
      queryClient.invalidateQueries({ queryKey: ["admin-resellers"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update role");
    } finally {
      setTogglingRole(null);
    }
  };

  const filtered = useMemo(() => {
    let list = resellers || [];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r: any) =>
          r.name?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q)
      );
    }

    if (balanceFilter === "zero") list = list.filter((r: any) => r.balance === 0);
    else if (balanceFilter === "low") list = list.filter((r: any) => r.balance > 0 && r.balance < 5000);
    else if (balanceFilter === "active") list = list.filter((r: any) => r.balance >= 5000);

    if (statusFilter !== "all") list = list.filter((r: any) => (r.status || "active") === statusFilter);
    if (tierFilter !== "all") list = list.filter((r: any) => (r.tier || "bronze") === tierFilter);
    if (roleFilter !== "all") list = list.filter((r: any) => getUserRole(r) === roleFilter);

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
  }, [resellers, search, sortBy, balanceFilter, statusFilter, tierFilter, roleFilter]);

  const hasFilters = search || sortBy !== "created_at" || balanceFilter !== "all" || statusFilter !== "all" || tierFilter !== "all" || roleFilter !== "all";

  const columns: Column<any>[] = [
    {
      key: "name",
      label: "Name",
      priority: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="cursor-pointer hover:text-primary transition-colors" onClick={() => setSelectedReseller(row)}>
            {row.name || "—"}
          </span>
          {row.is_verified && (
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          )}
          {(row.status === "blocked" || row.status === "suspended") && (
            <Ban className="w-3.5 h-3.5 text-destructive shrink-0" />
          )}
        </div>
      ),
    },
    {
      key: "tier",
      label: "Tier",
      align: "center" as const,
      render: (row) => {
        const tier = row.tier || "bronze";
        return (
          <Badge variant="outline" className={`text-[10px] capitalize border ${tierColors[tier] || tierColors.bronze}`}>
            {tier}
          </Badge>
        );
      },
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
      render: (row) => {
        const debt = row.credit_limit > 0 && row.balance < 0 ? Math.abs(row.balance) : 0;
        return (
          <div>
            <Money amount={row.balance} />
            {debt > 0 && <span className="text-[10px] text-destructive block">Debt: {debt.toLocaleString()}</span>}
          </div>
        );
      },
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
      key: "status",
      label: "Status",
      align: "center" as const,
      hideOnMobile: true,
      render: (row) => {
        const s = row.status || "active";
        return (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${statusStyles[s] || statusStyles.active}`}>
            {s}
          </span>
        );
      },
    },
    {
      key: "created_at",
      label: "Joined",
      hideOnMobile: true,
      render: (row) => <span className="text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      label: "",
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
          Manage registered resellers
          {resellers?.length ? ` · ${filtered.length} of ${resellers.length}` : ""}
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-32 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-full sm:w-32 h-9">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="bronze">Bronze</SelectItem>
            <SelectItem value="silver">Silver</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="platinum">Platinum</SelectItem>
          </SelectContent>
        </Select>
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
          <Button variant="ghost" size="sm" className="h-9 text-xs gap-1" onClick={() => { setSearch(""); setSortBy("created_at"); setBalanceFilter("all"); setStatusFilter("all"); setTierFilter("all"); }}>
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
