import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { DataCard, Money } from "@/components/shared";
import ProductIcon from "@/components/products/ProductIcon";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Star, Search, GripVertical, Save, Zap, Clock, ArrowRight, Settings2, Eye,
} from "lucide-react";

export default function AdminPopularServices() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [maxDisplay, setMaxDisplay] = useState(6);
  const [maxDirty, setMaxDirty] = useState(false);

  /* ─── Fetch all active products ─── */
  const { data: allProducts, isLoading } = useQuery({
    queryKey: ["admin-popular-all-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, category, wholesale_price, processing_time, image_url, fulfillment_modes, product_type, is_popular, popular_sort_order, type, stock")
        .neq("type", "disabled")
        .order("popular_sort_order")
        .order("sort_order");
      return (data || []) as any[];
    },
  });

  /* ─── Fetch config ─── */
  useQuery({
    queryKey: ["popular-services-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "popular_services_config")
        .single();
      const val = data?.value as any;
      if (val?.max_display) { setMaxDisplay(val.max_display); }
      return val;
    },
  });

  const popularProducts = (allProducts || [])
    .filter((p: any) => p.is_popular)
    .sort((a: any, b: any) => a.popular_sort_order - b.popular_sort_order);

  const availableProducts = (allProducts || [])
    .filter((p: any) => !p.is_popular)
    .filter((p: any) => {
      if (!search) return true;
      return p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
    });

  /* ─── Toggle popular ─── */
  const togglePopular = useCallback(async (productId: string, isPopular: boolean) => {
    const newOrder = isPopular ? 0 : (popularProducts.length + 1);
    const { error } = await supabase
      .from("products")
      .update({
        is_popular: !isPopular,
        popular_sort_order: isPopular ? 0 : newOrder,
      })
      .eq("id", productId);
    if (error) { toast.error("Failed to update"); return; }
    queryClient.invalidateQueries({ queryKey: ["admin-popular-all-products"] });
    toast.success(isPopular ? "Removed from popular" : "Added to popular");
  }, [popularProducts.length, queryClient]);

  /* ─── Drag reorder ─── */
  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;
    const items = [...popularProducts];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);

    // Optimistic update
    const updates = items.map((item: any, idx: number) => ({ id: item.id, popular_sort_order: idx + 1 }));
    queryClient.setQueryData(["admin-popular-all-products"], (old: any[] | undefined) => {
      if (!old) return old;
      return old.map((p) => {
        const u = updates.find((u) => u.id === p.id);
        return u ? { ...p, popular_sort_order: u.popular_sort_order } : p;
      });
    });

    // Persist
    for (const u of updates) {
      await supabase.from("products").update({ popular_sort_order: u.popular_sort_order }).eq("id", u.id);
    }
  }, [popularProducts, queryClient]);

  /* ─── Save max display ─── */
  const saveMaxDisplay = useCallback(async () => {
    setSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .upsert({ key: "popular_services_config", value: { max_display: maxDisplay } as any });
    setSaving(false);
    if (error) { toast.error("Failed to save"); return; }
    setMaxDirty(false);
    toast.success("Display limit saved");
  }, [maxDisplay]);

  const isInstant = (p: any) => {
    try {
      const modes = typeof p.fulfillment_modes === "string" ? JSON.parse(p.fulfillment_modes) : p.fulfillment_modes;
      return Array.isArray(modes) && modes.includes("instant");
    } catch { return false; }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Popular Services Manager
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Control which services appear in the reseller dashboard's Popular Services section
            </p>
          </div>
          {/* Max display config */}
          <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-2.5">
            <Settings2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">Max display:</span>
            <Input
              type="number"
              min={1}
              max={20}
              value={maxDisplay}
              onChange={(e) => { setMaxDisplay(Number(e.target.value) || 6); setMaxDirty(true); }}
              className="w-16 h-7 text-xs text-center bg-muted/50 border-border"
            />
            {maxDirty && (
              <Button size="sm" className="h-7 text-xs gap-1" onClick={saveMaxDisplay} disabled={saving}>
                <Save className="w-3 h-3" />
                Save
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ─── Left: Popular Services (Drag & Drop) ─── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                Selected Popular ({popularProducts.length})
              </h2>
              {popularProducts.length > maxDisplay && (
                <span className="text-[10px] bg-warning/10 text-warning px-2 py-0.5 rounded-full font-medium">
                  {popularProducts.length - maxDisplay} hidden (exceeds limit)
                </span>
              )}
            </div>

            <DataCard noPadding>
              {popularProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No popular services selected yet. Add services from the right panel.
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="popular-list">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-border/50">
                        {popularProducts.map((product: any, idx: number) => (
                          <Draggable key={product.id} draggableId={product.id} index={idx}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={cn(
                                  "flex items-center gap-3 px-4 py-3 transition-colors",
                                  snapshot.isDragging && "bg-primary/5 shadow-lg rounded-lg",
                                  idx >= maxDisplay && "opacity-40"
                                )}
                              >
                                <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground">
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <span className="w-5 text-center text-xs font-mono text-muted-foreground">
                                  {idx + 1}
                                </span>
                                <ProductIcon
                                  imageUrl={product.image_url}
                                  name={product.name}
                                  category={product.category}
                                  size="sm"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-foreground line-clamp-1">{product.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-muted-foreground">{product.category}</span>
                                    <span className="text-[10px] text-muted-foreground">·</span>
                                    <Money amount={product.wholesale_price} className="text-[10px] font-mono text-muted-foreground" />
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => togglePopular(product.id, true)}
                                >
                                  Remove
                                </Button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </DataCard>

            {/* ─── Live Preview ─── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Dashboard Preview</h2>
              </div>
              <div className="rounded-card border border-border bg-card/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-gradient-to-b from-primary to-accent" />
                  <span className="text-xs font-bold text-foreground">Popular Services</span>
                  <div className="flex-1" />
                  <span className="text-[10px] text-primary flex items-center gap-0.5">
                    View all <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {popularProducts.slice(0, Math.min(maxDisplay, 4)).map((p: any) => (
                    <div key={p.id} className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <ProductIcon imageUrl={p.image_url} name={p.name} category={p.category} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold text-foreground line-clamp-1">{p.name}</p>
                          {isInstant(p) ? (
                            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-success">
                              <Zap className="w-2 h-2" /> Instant
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[8px] text-muted-foreground">
                              <Clock className="w-2 h-2" /> {p.processing_time || "5-30 min"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Money amount={p.wholesale_price} className="text-[10px] font-bold font-mono" />
                        <span className="text-[8px] font-bold text-primary bg-primary/8 px-1.5 py-0.5 rounded-full">
                          Order →
                        </span>
                      </div>
                    </div>
                  ))}
                  {popularProducts.length === 0 && (
                    <div className="col-span-2 text-center py-6 text-[10px] text-muted-foreground">
                      Select services to see preview
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ─── Right: All Services (Add to Popular) ─── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">All Services</h2>
              <span className="text-xs text-muted-foreground">({availableProducts.length})</span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-muted/50 border-border text-sm h-9"
              />
            </div>

            <DataCard noPadding className="max-h-[60vh] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-xl" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-40 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : availableProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {search ? "No services match your search" : "All services are already marked as popular"}
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {availableProducts.map((product: any) => (
                    <div key={product.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                      <ProductIcon
                        imageUrl={product.image_url}
                        name={product.name}
                        category={product.category}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">{product.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{product.category}</span>
                          <span className="text-[10px] text-muted-foreground">·</span>
                          <Money amount={product.wholesale_price} className="text-[10px] font-mono text-muted-foreground" />
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 shrink-0"
                        onClick={() => togglePopular(product.id, false)}
                      >
                        <Star className="w-3 h-3" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </DataCard>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
