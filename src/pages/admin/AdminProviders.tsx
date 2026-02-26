import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Pencil, Trash2, ShieldCheck, Star, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DataCard } from "@/components/shared";
import ConfirmModal from "@/components/shared/ConfirmModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ProviderForm {
  name: string;
  fulfillment_type: string;
  is_verified: boolean;
  api_url: string;
  commission_percent: number;
  sort_order: number;
}

const emptyForm: ProviderForm = {
  name: "",
  fulfillment_type: "manual",
  is_verified: false,
  api_url: "",
  commission_percent: 8,
  sort_order: 0,
};

export default function AdminProviders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProviderForm>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["admin-providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("imei_providers")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: productCounts = {} } = useQuery({
    queryKey: ["admin-provider-product-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("provider_id");
      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        if (p.provider_id) counts[p.provider_id] = (counts[p.provider_id] || 0) + 1;
      });
      return counts;
    },
  });

  const filtered = providers.filter((p: any) =>
    !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (provider: any) => {
    setEditId(provider.id);
    setForm({
      name: provider.name,
      fulfillment_type: provider.fulfillment_type || "manual",
      is_verified: provider.is_verified || false,
      api_url: provider.api_url || "",
      commission_percent: provider.commission_percent ?? 8,
      sort_order: provider.sort_order || 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Provider name is required");
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        const { error } = await supabase
          .from("imei_providers")
          .update({
            name: form.name.trim(),
            fulfillment_type: form.fulfillment_type,
            is_verified: form.is_verified,
            api_url: form.api_url.trim() || null,
            commission_percent: form.commission_percent,
            sort_order: form.sort_order,
          })
          .eq("id", editId);
        if (error) throw error;
        toast.success("Provider updated");
      } else {
        const { error } = await supabase
          .from("imei_providers")
          .insert({
            name: form.name.trim(),
            fulfillment_type: form.fulfillment_type,
            is_verified: form.is_verified,
            api_url: form.api_url.trim() || null,
            commission_percent: form.commission_percent,
            sort_order: form.sort_order,
          });
        if (error) throw error;
        toast.success("Provider created");
      }
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save provider");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const count = productCounts[deleteTarget.id] || 0;
      if (count > 0) {
        toast.error(`Cannot delete — ${count} product(s) are linked to this provider`);
        return;
      }
      const { error } = await supabase
        .from("imei_providers")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Provider deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete provider");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Providers</p>
          <p className="text-xs text-muted-foreground mt-0.5">{providers.length} provider{providers.length !== 1 ? "s" : ""} registered</p>
        </div>
        <Button size="sm" className="btn-glow" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Provider
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search providers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Table */}
      <DataCard noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="text-left px-5 py-3 font-semibold">Provider</th>
                <th className="text-center px-3 py-3 font-semibold">Type</th>
                <th className="text-center px-3 py-3 font-semibold">Rating</th>
                <th className="text-center px-3 py-3 font-semibold">Success</th>
                <th className="text-center px-3 py-3 font-semibold">Completed</th>
                <th className="text-center px-3 py-3 font-semibold">Products</th>
                <th className="text-center px-3 py-3 font-semibold">Status</th>
                <th className="text-right px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/10">
                    <td colSpan={8} className="px-5 py-4">
                      <div className="h-4 bg-muted/30 rounded animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">
                    No providers found
                  </td>
                </tr>
              ) : (
                filtered.map((p: any) => (
                  <tr key={p.id} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{p.name}</span>
                        {p.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-primary" />}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn(
                        "text-[11px] px-2.5 py-1 rounded-full font-medium",
                        p.fulfillment_type === "api"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}>
                        {p.fulfillment_type === "api" ? "API" : "Manual"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="font-mono font-semibold">{p.avg_rating || "—"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn(
                        "font-mono font-semibold",
                        (p.success_rate || 0) >= 95 ? "text-primary" : (p.success_rate || 0) >= 80 ? "text-amber-500" : "text-destructive"
                      )}>
                        {p.success_rate ?? "—"}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <TrendingUp className="w-3 h-3 text-muted-foreground" />
                        <span className="font-mono">{(p.total_completed || 0).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-mono">{productCounts[p.id] || 0}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full font-medium",
                        p.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: p.id, name: p.name })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataCard>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Provider" : "Add Provider"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Provider name" />
            </div>
            <div className="space-y-1.5">
              <Label>Fulfillment Type</Label>
              <Select value={form.fulfillment_type} onValueChange={(v) => setForm({ ...form, fulfillment_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.fulfillment_type === "api" && (
              <div className="space-y-1.5">
                <Label>API URL</Label>
                <Input value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} placeholder="https://..." />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Commission %</Label>
              <Input type="number" min={0} max={100} value={form.commission_percent} onChange={(e) => setForm({ ...form, commission_percent: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input type="number" min={0} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Verified</Label>
              <Switch checked={form.is_verified} onCheckedChange={(v) => setForm({ ...form, is_verified: v })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="btn-glow">
              {saving ? "Saving..." : editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Provider"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
        loading={deleting}
      />
    </div>
  );
}