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
import { Checkbox } from "@/components/ui/checkbox";
import { Layers, Plus, Trash2, Copy, AlertTriangle, Package } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TierRow {
  min_qty: string;
  max_qty: string;
  unit_price: string;
}

const emptyTier = (): TierRow => ({ min_qty: "", max_qty: "", unit_price: "" });

export default function BulkTierDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [tiers, setTiers] = useState<TierRow[]>([emptyTier()]);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, icon, duration, image_url").order("sort_order", { ascending: true });
      return data || [];
    },
    enabled: open,
  });

  const reset = () => {
    setSelectedProducts(new Set());
    setTiers([emptyTier()]);
    setReplaceExisting(true);
  };

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map((p: any) => p.id)));
    }
  };

  const updateTier = (index: number, field: keyof TierRow, value: string) => {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const removeTier = (index: number) => {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApply = async () => {
    if (selectedProducts.size === 0) {
      toast.error("Select at least one product");
      return;
    }

    const validTiers = tiers.filter((t) => t.min_qty && t.unit_price);
    if (validTiers.length === 0) {
      toast.error("Add at least one valid tier");
      return;
    }

    // Validate tiers
    for (const t of validTiers) {
      const min = parseInt(t.min_qty);
      const price = parseInt(t.unit_price);
      const max = t.max_qty ? parseInt(t.max_qty) : null;
      if (min < 1 || price < 1) {
        toast.error("Min qty and price must be ≥ 1");
        return;
      }
      if (max !== null && max < min) {
        toast.error("Max qty must be ≥ min qty");
        return;
      }
    }

    setSaving(true);
    try {
      const productIds = Array.from(selectedProducts);

      // Delete existing tiers if replacing
      if (replaceExisting) {
        for (const pid of productIds) {
          await supabase.from("pricing_tiers").delete().eq("product_id", pid);
        }
      }

      // Insert new tiers for each product
      const inserts = productIds.flatMap((pid) =>
        validTiers.map((t) => ({
          product_id: pid,
          min_qty: parseInt(t.min_qty),
          max_qty: t.max_qty ? parseInt(t.max_qty) : null,
          unit_price: parseInt(t.unit_price),
        }))
      );

      const { error } = await supabase.from("pricing_tiers").insert(inserts);
      if (error) throw error;

      toast.success(`Applied ${validTiers.length} tier${validTiers.length > 1 ? "s" : ""} to ${productIds.length} product${productIds.length > 1 ? "s" : ""}`);

      // Invalidate all pricing tier queries
      queryClient.invalidateQueries({ queryKey: ["pricing-tiers"] });

      setOpen(false);
      reset();
    } catch (err: any) {
      toast.error(err.message || "Failed to apply tiers");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Copy className="w-4 h-4" />
          Bulk Tiers
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Bulk Tier Creation
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Step 1: Select products */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Select Products ({selectedProducts.size}/{products.length})
              </Label>
              <button onClick={toggleAll} className="text-[11px] text-primary hover:underline">
                {selectedProducts.size === products.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <ScrollArea className="h-[140px] rounded-lg border border-border/50 bg-muted/20">
              <div className="p-2 space-y-0.5">
                {products.map((p: any) => (
                  <label
                    key={p.id}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${
                      selectedProducts.has(p.id) ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={selectedProducts.has(p.id)}
                      onCheckedChange={() => toggleProduct(p.id)}
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="w-6 h-6 rounded object-cover border border-border/50" />
                      ) : (
                        <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-sm text-foreground truncate">{p.name}</span>
                      <span className="text-[11px] text-muted-foreground">{p.duration}</span>
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Step 2: Define tiers */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Define Tiers</Label>
            <div className="space-y-1.5">
              {tiers.map((tier, i) => (
                <div key={i} className="flex items-end gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
                  <div className="space-y-1 flex-1">
                    <Label className="text-[10px] text-muted-foreground">Min Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={tier.min_qty}
                      onChange={(e) => updateTier(i, "min_qty", e.target.value)}
                      className="h-8 text-xs bg-muted/50 border-border font-mono"
                    />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-[10px] text-muted-foreground">Max Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={tier.max_qty}
                      onChange={(e) => updateTier(i, "max_qty", e.target.value)}
                      placeholder="∞"
                      className="h-8 text-xs bg-muted/50 border-border font-mono"
                    />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-[10px] text-muted-foreground">Price (MMK)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={tier.unit_price}
                      onChange={(e) => updateTier(i, "unit_price", e.target.value)}
                      className="h-8 text-xs bg-muted/50 border-border font-mono"
                    />
                  </div>
                  <button
                    onClick={() => removeTier(i)}
                    disabled={tiers.length <= 1}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 disabled:pointer-events-none mb-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs"
              onClick={() => setTiers((prev) => [...prev, emptyTier()])}
            >
              <Plus className="w-3.5 h-3.5" /> Add Tier Row
            </Button>
          </div>

          {/* Options */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <Checkbox
              checked={replaceExisting}
              onCheckedChange={(checked) => setReplaceExisting(checked === true)}
            />
            <span className="text-xs text-muted-foreground">Replace existing tiers on selected products</span>
          </label>

          {replaceExisting && selectedProducts.size > 0 && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20">
              <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
              <p className="text-[11px] text-warning leading-relaxed">
                This will delete all existing tiers for the {selectedProducts.size} selected product{selectedProducts.size > 1 ? "s" : ""} before applying the new ones.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
          <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
          <Button
            className="btn-glow gap-1.5"
            onClick={handleApply}
            disabled={saving || selectedProducts.size === 0 || tiers.every((t) => !t.min_qty || !t.unit_price)}
          >
            {saving ? "Applying…" : `Apply to ${selectedProducts.size} Product${selectedProducts.size !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
