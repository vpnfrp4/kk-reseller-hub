import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layers, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface PricingTiersDialogProps {
  productId: string;
  productName: string;
}

interface Tier {
  id: string;
  min_qty: number;
  max_qty: number | null;
  unit_price: number;
}

export default function PricingTiersDialog({ productId, productName }: PricingTiersDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ min_qty: "", max_qty: "", unit_price: "" });

  const { data: tiers = [], isLoading } = useQuery({
    queryKey: ["pricing-tiers", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_tiers")
        .select("*")
        .eq("product_id", productId)
        .order("min_qty", { ascending: true });
      if (error) throw error;
      return (data || []) as Tier[];
    },
    enabled: open,
  });

  const resetForm = () => {
    setForm({ min_qty: "", max_qty: "", unit_price: "" });
    setEditingId(null);
    setAdding(false);
  };

  const startEdit = (tier: Tier) => {
    setAdding(false);
    setEditingId(tier.id);
    setForm({
      min_qty: tier.min_qty.toString(),
      max_qty: tier.max_qty?.toString() || "",
      unit_price: tier.unit_price.toString(),
    });
  };

  const startAdd = () => {
    setEditingId(null);
    setAdding(true);
    setForm({ min_qty: "", max_qty: "", unit_price: "" });
  };

  const handleSave = async () => {
    const min_qty = parseInt(form.min_qty);
    const unit_price = parseInt(form.unit_price);
    const max_qty = form.max_qty ? parseInt(form.max_qty) : null;

    if (!min_qty || min_qty < 1 || !unit_price || unit_price < 1) {
      toast.error("Min qty and unit price are required");
      return;
    }
    if (max_qty !== null && max_qty < min_qty) {
      toast.error("Max qty must be ≥ min qty");
      return;
    }

    const payload = { product_id: productId, min_qty, max_qty, unit_price };

    if (editingId) {
      const { error } = await supabase.from("pricing_tiers").update(payload).eq("id", editingId);
      if (error) { toast.error(error.message); return; }
      toast.success("Tier updated");
    } else {
      const { error } = await supabase.from("pricing_tiers").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Tier added");
    }

    queryClient.invalidateQueries({ queryKey: ["pricing-tiers", productId] });
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this pricing tier?")) return;
    const { error } = await supabase.from("pricing_tiers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Tier deleted");
    queryClient.invalidateQueries({ queryKey: ["pricing-tiers", productId] });
  };

  const tierCount = tiers.length;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <button
          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors relative"
          title="Pricing tiers"
        >
          <Layers className="w-4 h-4" />
          {tierCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-0.5">
              {tierCount}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Pricing Tiers — {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Existing tiers */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
          ) : tiers.length === 0 && !adding ? (
            <p className="text-sm text-muted-foreground text-center py-4">No tiers yet. Default wholesale price will be used.</p>
          ) : (
            <div className="space-y-1.5">
              {tiers.map((tier) =>
                editingId === tier.id ? (
                  <TierForm key={tier.id} form={form} setForm={setForm} onSave={handleSave} onCancel={resetForm} />
                ) : (
                  <div
                    key={tier.id}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-muted/40 border border-border/50 group"
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-muted-foreground">
                        {tier.min_qty}–{tier.max_qty ?? "∞"}
                      </span>
                      <span className="font-mono font-medium text-foreground">
                        {tier.unit_price.toLocaleString()} MMK
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(tier)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(tier.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* Add form */}
          {adding && !editingId && (
            <TierForm form={form} setForm={setForm} onSave={handleSave} onCancel={resetForm} />
          )}

          {/* Add button */}
          {!adding && !editingId && (
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={startAdd}>
              <Plus className="w-3.5 h-3.5" /> Add Tier
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TierForm({
  form,
  setForm,
  onSave,
  onCancel,
}: {
  form: { min_qty: string; max_qty: string; unit_price: string };
  setForm: (f: any) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-end gap-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
      <div className="space-y-1 flex-1">
        <Label className="text-[10px] text-muted-foreground">Min Qty</Label>
        <Input
          type="number"
          min={1}
          value={form.min_qty}
          onChange={(e) => setForm({ ...form, min_qty: e.target.value })}
          className="h-8 text-xs bg-muted/50 border-border font-mono"
        />
      </div>
      <div className="space-y-1 flex-1">
        <Label className="text-[10px] text-muted-foreground">Max Qty</Label>
        <Input
          type="number"
          min={1}
          value={form.max_qty}
          onChange={(e) => setForm({ ...form, max_qty: e.target.value })}
          placeholder="∞"
          className="h-8 text-xs bg-muted/50 border-border font-mono"
        />
      </div>
      <div className="space-y-1 flex-1">
        <Label className="text-[10px] text-muted-foreground">Price</Label>
        <Input
          type="number"
          min={1}
          value={form.unit_price}
          onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
          className="h-8 text-xs bg-muted/50 border-border font-mono"
        />
      </div>
      <div className="flex gap-1 pb-0.5">
        <button onClick={onSave} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

