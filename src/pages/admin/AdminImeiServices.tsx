import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeName } from "@/lib/sanitize-name";
import { toast } from "sonner";
import {
  Search, RefreshCw, Save, X, Edit2, Database, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface IfreeService {
  id: string;
  name: string;
  price: string | null;
  description: string | null;
  cached_at: string;
  custom_name: string | null;
  selling_price: number | null;
  markup_price: number | null;
  is_enabled: boolean;
  service_group: string | null;
}

const SERVICE_GROUPS = ["General", "iPhone", "iPad", "Apple Watch", "Samsung", "Xiaomi", "Huawei", "FMI", "MDM", "Carrier", "Other"];

export default function AdminImeiServices() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<IfreeService>>({});
  const [syncing, setSyncing] = useState(false);

  // Fetch USD rate for preview calculations
  const { data: usdRate } = useQuery({
    queryKey: ["usd-rate"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "usd_mmk_rate")
        .single();
      return (data?.value as any)?.rate ? Number((data.value as any).rate) : 4200;
    },
  });
  const rate = usdRate || 4200;

  const { data: services, isLoading } = useQuery({
    queryKey: ["admin-ifree-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ifree_services_cache")
        .select("*")
        .order("id");
      if (error) throw error;
      return (data || []) as IfreeService[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: { id: string; custom_name?: string; selling_price?: number; markup_price?: number; is_enabled?: boolean; service_group?: string }) => {
      const { id, ...fields } = updates;
      const { error } = await supabase
        .from("ifree_services_cache")
        .update(fields)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ifree-services"] });
      toast.success("Service updated");
      setEditingId(null);
      setEditData({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleEnabled = (service: IfreeService) => {
    updateMutation.mutate({ id: service.id, is_enabled: !service.is_enabled });
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-ifree-services");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["admin-ifree-services"] });
      toast.success(`Synced ${data?.total || 0} services (markup preserved)`);
    } catch (e: any) {
      toast.error(e.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const startEdit = (service: IfreeService) => {
    setEditingId(service.id);
    setEditData({
      custom_name: service.custom_name || "",
      markup_price: service.markup_price || 0,
      service_group: service.service_group || "General",
    });
  };

  // Calculate selling price from provider + markup
  const calcSellingPrice = (providerPrice: string | null, markupUsd: number): number => {
    const provider = providerPrice ? Number(providerPrice) : 0;
    return Math.ceil((provider + markupUsd) * rate);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const service = services?.find((s) => s.id === editingId);
    const markupUsd = editData.markup_price || 0;
    const sellingMmk = calcSellingPrice(service?.price || null, markupUsd);

    updateMutation.mutate({
      id: editingId,
      custom_name: editData.custom_name || undefined,
      markup_price: markupUsd,
      selling_price: sellingMmk,
      service_group: editData.service_group || "General",
    });
  };

  const filtered = (services || []).filter((s) => {
    const displayName = s.custom_name || sanitizeName(s.name);
    const matchSearch = !search || displayName.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search);
    const matchGroup = groupFilter === "all" || s.service_group === groupFilter;
    const matchStatus = statusFilter === "all" || (statusFilter === "enabled" ? s.is_enabled : !s.is_enabled);
    return matchSearch && matchGroup && matchStatus;
  });

  const enabledCount = (services || []).filter((s) => s.is_enabled).length;
  const totalCount = (services || []).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header-card animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3.5">
            <div className="page-header-icon">
              <Database className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">IMEI Service Manager</h1>
              <p className="page-header-subtitle">
                Manage iFreeiCloud API services — {enabledCount}/{totalCount} enabled
              </p>
            </div>
          </div>
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:brightness-110 text-white shadow-lg"
          >
            <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Refresh List"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-end animate-fade-in" style={{ animationDelay: "50ms" }}>
        <div className="flex-1 min-w-[180px]">
          <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-muted/20 border-border/40 rounded-[var(--radius-input)]"
            />
          </div>
        </div>
        <div className="min-w-[130px]">
          <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Group</label>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="h-9 bg-muted/20 border-border/40 rounded-[var(--radius-input)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {SERVICE_GROUPS.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[120px]">
          <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 bg-muted/20 border-border/40 rounded-[var(--radius-input)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="enabled">Enabled</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: "100ms" }}>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No services found</p>
            {totalCount === 0 && (
              <Button onClick={handleSync} variant="outline" className="mt-3 gap-2">
                <RefreshCw className="w-4 h-4" /> Fetch from API
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/20">
                    {["ID", "Service Name", "Provider $", "Markup $", "Sell Price", "Group", "Status", "Actions"].map((h) => (
                      <th key={h} className={cn(
                        "text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 text-left",
                        (h === "Provider $" || h === "Markup $" || h === "Sell Price") && "text-right",
                        h === "Status" && "text-center",
                        h === "Actions" && "text-right",
                      )}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const isEditing = editingId === s.id;
                    const displayName = s.custom_name || sanitizeName(s.name);
                    const editMarkup = editData.markup_price || 0;
                    const previewSell = isEditing ? calcSellingPrice(s.price, editMarkup) : (s.selling_price || 0);

                    return (
                      <tr
                        key={s.id}
                        className={cn(
                          "border-b border-border/10 transition-all duration-200",
                          "hover:bg-muted/20",
                          !s.is_enabled && "opacity-50",
                          isEditing && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                        )}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-muted-foreground">{s.id}</span>
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <Input
                              value={editData.custom_name || ""}
                              onChange={(e) => setEditData((d) => ({ ...d, custom_name: e.target.value }))}
                              placeholder={sanitizeName(s.name)}
                              className="h-8 text-sm bg-muted/30 border-border/40"
                            />
                          ) : (
                            <span className="text-sm font-medium text-foreground">{displayName}</span>
                          )}
                        </td>
                        {/* Provider Price (read-only) */}
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs text-muted-foreground font-mono">
                            {s.price ? `$${s.price}` : "—"}
                          </span>
                        </td>
                        {/* Markup (editable) */}
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-xs text-muted-foreground">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editData.markup_price || ""}
                                onChange={(e) => setEditData((d) => ({ ...d, markup_price: Number(e.target.value) }))}
                                placeholder="0.00"
                                className="h-8 text-sm bg-muted/30 border-border/40 w-20 text-right"
                              />
                            </div>
                          ) : (
                            <span className={cn("text-xs font-mono", (s.markup_price ?? 0) > 0 ? "text-primary font-semibold" : "text-muted-foreground")}>
                              {(s.markup_price ?? 0) > 0 ? `$${Number(s.markup_price).toFixed(2)}` : "—"}
                            </span>
                          )}
                        </td>
                        {/* Selling Price (auto-calculated) */}
                        <td className="px-4 py-3 text-right">
                          <span className={cn("text-sm font-mono", previewSell > 0 ? "text-success font-semibold" : "text-muted-foreground")}>
                            {previewSell > 0 ? `${previewSell.toLocaleString()} MMK` : "—"}
                          </span>
                          {isEditing && previewSell > 0 && (
                            <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                              auto-calculated
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <Select
                              value={editData.service_group || "General"}
                              onValueChange={(v) => setEditData((d) => ({ ...d, service_group: v }))}
                            >
                              <SelectTrigger className="h-8 text-xs bg-muted/30 border-border/40 w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SERVICE_GROUPS.map((g) => (
                                  <SelectItem key={g} value={g}>{g}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground font-medium">
                              {s.service_group || "General"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Switch
                            checked={s.is_enabled}
                            onCheckedChange={() => toggleEnabled(s)}
                            className="data-[state=checked]:bg-success"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center gap-1 justify-end">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditingId(null); setEditData({}); }}>
                                <X className="w-4 h-4" />
                              </Button>
                              <Button size="sm" className="h-8 gap-1 text-xs" onClick={saveEdit} disabled={updateMutation.isPending}>
                                <Save className="w-3.5 h-3.5" />
                                Save
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-muted-foreground hover:text-primary" onClick={() => startEdit(s)}>
                              <Edit2 className="w-3.5 h-3.5" />
                              Edit
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2 p-3">
              {filtered.map((s) => {
                const isEditing = editingId === s.id;
                const displayName = s.custom_name || sanitizeName(s.name);
                const editMarkup = editData.markup_price || 0;
                const previewSell = isEditing ? calcSellingPrice(s.price, editMarkup) : (s.selling_price || 0);

                return (
                  <div
                    key={s.id}
                    className={cn(
                      "glass-card p-3 space-y-2 transition-all",
                      !s.is_enabled && "opacity-50",
                      isEditing && "ring-1 ring-primary/20 bg-primary/5",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-[10px] text-muted-foreground">#{s.id}</span>
                        {isEditing ? (
                          <Input
                            value={editData.custom_name || ""}
                            onChange={(e) => setEditData((d) => ({ ...d, custom_name: e.target.value }))}
                            placeholder={sanitizeName(s.name)}
                            className="h-8 text-sm mt-1"
                          />
                        ) : (
                          <p className="text-sm font-medium text-foreground line-clamp-2">{displayName}</p>
                        )}
                      </div>
                      <Switch
                        checked={s.is_enabled}
                        onCheckedChange={() => toggleEnabled(s)}
                        className="data-[state=checked]:bg-success shrink-0"
                      />
                    </div>

                    {/* Pricing row */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground/60 block">Provider</span>
                        <span className="font-mono text-muted-foreground">{s.price ? `$${s.price}` : "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground/60 block">Markup</span>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editData.markup_price || ""}
                            onChange={(e) => setEditData((d) => ({ ...d, markup_price: Number(e.target.value) }))}
                            placeholder="$0.00"
                            className="h-7 text-xs w-20"
                          />
                        ) : (
                          <span className={cn("font-mono", (s.markup_price ?? 0) > 0 ? "text-primary font-semibold" : "text-muted-foreground")}>
                            {(s.markup_price ?? 0) > 0 ? `$${Number(s.markup_price).toFixed(2)}` : "—"}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground/60 block">Sell Price</span>
                        <span className={cn("font-mono", previewSell > 0 ? "text-success font-semibold" : "text-muted-foreground")}>
                          {previewSell > 0 ? `${previewSell.toLocaleString()}` : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      {isEditing ? (
                        <Select
                          value={editData.service_group || "General"}
                          onValueChange={(v) => setEditData((d) => ({ ...d, service_group: v }))}
                        >
                          <SelectTrigger className="h-7 text-[11px] w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SERVICE_GROUPS.map((g) => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                          {s.service_group || "General"}
                        </span>
                      )}
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingId(null); setEditData({}); }}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" className="h-7 text-xs gap-1" onClick={saveEdit} disabled={updateMutation.isPending}>
                            <Save className="w-3 h-3" /> Save
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => startEdit(s)}>
                          <Edit2 className="w-3 h-3" /> Edit
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer count */}
            <div className="border-t border-border/20 px-4 py-3 text-xs text-muted-foreground">
              Showing {filtered.length} of {totalCount} services
            </div>
          </>
        )}
      </div>
    </div>
  );
}
