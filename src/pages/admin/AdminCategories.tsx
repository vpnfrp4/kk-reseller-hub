import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FolderOpen, Plus, Pencil, Trash2, GripVertical, Search, X,
  ChevronRight, ArrowRight, ArrowLeft, Eye, EyeOff, Save, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import IconPicker from "@/components/admin/IconPicker";
import ProductIcon from "@/components/products/ProductIcon";
import { sanitizeName } from "@/lib/sanitize-name";
import { Money } from "@/components/shared";

/* ════════════════════════════════════════════════════════════════
   Types
   ════════════════════════════════════════════════════════════════ */
interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

/* ════════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════════ */
export default function AdminCategories() {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editCat, setEditCat] = useState<Partial<Category> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Assignment panel
  const [assignCat, setAssignCat] = useState<Category | null>(null);
  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");
  const [selectedLeft, setSelectedLeft] = useState<Set<string>>(new Set());
  const [selectedRight, setSelectedRight] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);

  /* ── Queries ── */
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as Category[];
    },
  });

  // Product counts per category
  const { data: productCounts = {} } = useQuery({
    queryKey: ["admin-category-product-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("category")
        .neq("type", "disabled");
      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        const c = p.category || "Other";
        counts[c] = (counts[c] || 0) + 1;
      });
      return counts;
    },
  });

  // All products for the assignment panel
  const { data: allProducts = [] } = useQuery({
    queryKey: ["admin-all-products-for-assign"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, category, image_url, wholesale_price, product_type, stock, display_id")
        .neq("type", "disabled")
        .order("sort_order", { ascending: true });
      return data || [];
    },
    enabled: !!assignCat,
  });

  /* ── Drag & drop reorder ── */
  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;
    const items = [...categories];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);

    // Optimistic update
    queryClient.setQueryData(["admin-categories"], items);

    // Batch update sort_order
    const updates = items.map((cat, i) => ({ id: cat.id, sort_order: i }));
    for (const u of updates) {
      await supabase.from("categories").update({ sort_order: u.sort_order }).eq("id", u.id);
    }
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    toast.success("Category order saved");
  }, [categories, queryClient]);

  /* ── CRUD ── */
  const openCreate = () => {
    setEditCat({ name: "", description: "", icon: "📦", image_url: null, is_active: true, sort_order: categories.length });
    setEditOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditCat({ ...cat });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editCat?.name?.trim()) { toast.error("Category name is required"); return; }
    setSaving(true);
    try {
      if (editCat.id) {
        // If name changed, update products too
        const original = categories.find(c => c.id === editCat.id);
        const { error } = await supabase.from("categories").update({
          name: editCat.name.trim(),
          description: editCat.description || "",
          icon: editCat.icon || "📦",
          image_url: editCat.image_url || null,
          is_active: editCat.is_active ?? true,
        }).eq("id", editCat.id);
        if (error) throw error;

        // Rename products if category name changed
        if (original && original.name !== editCat.name.trim()) {
          await supabase.from("products").update({ category: editCat.name.trim() }).eq("category", original.name);
          queryClient.invalidateQueries({ queryKey: ["admin-all-products-for-assign"] });
        }
        toast.success("Category updated");
      } else {
        const { error } = await supabase.from("categories").insert({
          name: editCat.name.trim(),
          description: editCat.description || "",
          icon: editCat.icon || "📦",
          image_url: editCat.image_url || null,
          is_active: editCat.is_active ?? true,
          sort_order: editCat.sort_order ?? categories.length,
        });
        if (error) throw error;
        toast.success("Category created");
      }
      setEditOpen(false);
      setEditCat(null);
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-category-product-counts"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const cat = categories.find(c => c.id === deleteId);
      const { error } = await supabase.from("categories").delete().eq("id", deleteId);
      if (error) throw error;
      // Move products to "Uncategorized"
      if (cat) {
        await supabase.from("products").update({ category: "Uncategorized" }).eq("category", cat.name);
      }
      toast.success("Category deleted. Products moved to Uncategorized.");
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-category-product-counts"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Assignment Panel Logic ── */
  const assignedProducts = useMemo(() => {
    if (!assignCat) return [];
    return allProducts.filter((p: any) => p.category === assignCat.name);
  }, [allProducts, assignCat]);

  const availableProducts = useMemo(() => {
    if (!assignCat) return [];
    return allProducts.filter((p: any) => p.category !== assignCat.name);
  }, [allProducts, assignCat]);

  const filteredAvailable = useMemo(() => {
    const q = leftSearch.toLowerCase().trim();
    if (!q) return availableProducts;
    return availableProducts.filter((p: any) =>
      p.name.toLowerCase().includes(q) || String(p.display_id).includes(q) || (p.category || "").toLowerCase().includes(q)
    );
  }, [availableProducts, leftSearch]);

  const filteredAssigned = useMemo(() => {
    const q = rightSearch.toLowerCase().trim();
    if (!q) return assignedProducts;
    return assignedProducts.filter((p: any) =>
      p.name.toLowerCase().includes(q) || String(p.display_id).includes(q)
    );
  }, [assignedProducts, rightSearch]);

  const moveToCategory = async () => {
    if (selectedLeft.size === 0 || !assignCat) return;
    setAssigning(true);
    try {
      const ids = Array.from(selectedLeft);
      // Batch in chunks of 50
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50);
        await supabase.from("products").update({ category: assignCat.name }).in("id", chunk);
      }
      toast.success(`${ids.length} service(s) added to ${assignCat.name}`);
      setSelectedLeft(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin-all-products-for-assign"] });
      queryClient.invalidateQueries({ queryKey: ["admin-category-product-counts"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to move");
    } finally {
      setAssigning(false);
    }
  };

  const removeFromCategory = async () => {
    if (selectedRight.size === 0 || !assignCat) return;
    setAssigning(true);
    try {
      const ids = Array.from(selectedRight);
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50);
        await supabase.from("products").update({ category: "Uncategorized" }).in("id", chunk);
      }
      toast.success(`${ids.length} service(s) removed from ${assignCat.name}`);
      setSelectedRight(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin-all-products-for-assign"] });
      queryClient.invalidateQueries({ queryKey: ["admin-category-product-counts"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to remove");
    } finally {
      setAssigning(false);
    }
  };

  const toggleSelection = (set: Set<string>, setFn: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setFn(next);
  };

  /* ── Assignment Panel ── */
  if (assignCat) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="page-header-card">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setAssignCat(null); setSelectedLeft(new Set()); setSelectedRight(new Set()); }}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="gradient-text text-lg">Assign Services → {assignCat.name}</h1>
              <p className="text-xs text-muted-foreground">Move services between categories</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-start">
          {/* LEFT: Available */}
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="p-3 border-b border-border/30 bg-muted/30">
              <p className="text-xs font-bold text-muted-foreground mb-2">AVAILABLE SERVICES ({availableProducts.length})</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                <Input value={leftSearch} onChange={e => setLeftSearch(e.target.value)} placeholder="Search..." className="pl-9 h-9 text-xs" />
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto divide-y divide-border/10">
              {filteredAvailable.length === 0 ? (
                <p className="text-xs text-muted-foreground/40 text-center py-8">No available services</p>
              ) : filteredAvailable.map((p: any) => (
                <label key={p.id} className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-secondary/10 transition-colors",
                  selectedLeft.has(p.id) && "bg-primary/5"
                )}>
                  <input type="checkbox" checked={selectedLeft.has(p.id)} onChange={() => toggleSelection(selectedLeft, setSelectedLeft, p.id)}
                    className="rounded border-border" />
                  <ProductIcon imageUrl={p.image_url} name={p.name} category={p.category} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">{sanitizeName(p.name)}</p>
                    <p className="text-[10px] text-muted-foreground/50">{p.category} · #{p.display_id}</p>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground shrink-0"><Money amount={p.wholesale_price} compact /></span>
                </label>
              ))}
            </div>
          </div>

          {/* CENTER: Action buttons */}
          <div className="flex lg:flex-col items-center justify-center gap-2 py-4">
            <Button size="sm" disabled={selectedLeft.size === 0 || assigning} onClick={moveToCategory}
              className="gap-1.5 text-xs">
              Add <ArrowRight className="w-3.5 h-3.5" />
              {selectedLeft.size > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{selectedLeft.size}</Badge>}
            </Button>
            <Button size="sm" variant="outline" disabled={selectedRight.size === 0 || assigning} onClick={removeFromCategory}
              className="gap-1.5 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Remove
              {selectedRight.size > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{selectedRight.size}</Badge>}
            </Button>
          </div>

          {/* RIGHT: Assigned */}
          <div className="rounded-xl border border-primary/20 bg-card overflow-hidden">
            <div className="p-3 border-b border-primary/10 bg-primary/5">
              <p className="text-xs font-bold text-primary mb-2">IN "{assignCat.name.toUpperCase()}" ({assignedProducts.length})</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                <Input value={rightSearch} onChange={e => setRightSearch(e.target.value)} placeholder="Search..." className="pl-9 h-9 text-xs" />
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto divide-y divide-border/10">
              {filteredAssigned.length === 0 ? (
                <p className="text-xs text-muted-foreground/40 text-center py-8">No services in this category</p>
              ) : filteredAssigned.map((p: any) => (
                <label key={p.id} className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-secondary/10 transition-colors",
                  selectedRight.has(p.id) && "bg-destructive/5"
                )}>
                  <input type="checkbox" checked={selectedRight.has(p.id)} onChange={() => toggleSelection(selectedRight, setSelectedRight, p.id)}
                    className="rounded border-border" />
                  <ProductIcon imageUrl={p.image_url} name={p.name} category={p.category} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">{sanitizeName(p.name)}</p>
                    <p className="text-[10px] text-muted-foreground/50">#{p.display_id}</p>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground shrink-0"><Money amount={p.wholesale_price} compact /></span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main Category List ── */
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="page-header-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="page-header-icon"><FolderOpen className="w-5 h-5 text-primary" /></div>
            <div>
              <h1 className="gradient-text text-lg">Category Manager</h1>
              <p className="text-xs text-muted-foreground">{categories.length} categories · Drag to reorder</p>
            </div>
          </div>
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Category
          </Button>
        </div>
      </div>

      {/* Category list with drag-and-drop */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No categories yet</p>
          <p className="text-xs mt-1">Click "Add Category" to create your first one</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="categories">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                {categories.map((cat, index) => {
                  const count = productCounts[cat.name] || 0;
                  return (
                    <Draggable key={cat.id} draggableId={cat.id} index={index}>
                      {(prov, snapshot) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl border bg-card transition-all",
                            snapshot.isDragging ? "border-primary/40 shadow-lg" : "border-border/40",
                            !cat.is_active && "opacity-50"
                          )}
                        >
                          {/* Drag handle */}
                          <div {...prov.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors">
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Icon */}
                          {cat.image_url ? (
                            <img src={cat.image_url} alt="" className="w-9 h-9 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement?.querySelector('.cat-icon-fallback')?.classList.remove('hidden'); }} />
                          ) : null}
                          <span className={cn("text-xl w-9 h-9 flex items-center justify-center cat-icon-fallback", cat.image_url ? "hidden" : "")}>{cat.icon}</span>

                          {/* Name & meta */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground truncate">{cat.name}</p>
                              {!cat.is_active && (
                                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                                  <EyeOff className="w-2.5 h-2.5 mr-0.5" /> Hidden
                                </Badge>
                              )}
                            </div>
                            {cat.description && (
                              <p className="text-[11px] text-muted-foreground/50 truncate">{cat.description}</p>
                            )}
                          </div>

                          {/* Count */}
                          <Badge variant="outline" className="text-[11px] font-mono tabular-nums shrink-0">
                            <Package className="w-3 h-3 mr-1" /> {count}
                          </Badge>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAssignCat(cat)}
                              title="Assign services">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive"
                              onClick={() => setDeleteId(cat.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* ── Edit/Create Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editCat?.id ? "Edit Category" : "New Category"}</DialogTitle>
            <DialogDescription>Set up the category details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Name *</label>
              <Input value={editCat?.name || ""} onChange={e => setEditCat(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. IMEI Unlock" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
              <Input value={editCat?.description || ""} onChange={e => setEditCat(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Icon</label>
              <div className="flex items-center gap-2">
                <Input value={editCat?.icon || ""} onChange={e => setEditCat(prev => ({ ...prev, icon: e.target.value }))}
                  placeholder="📦" className="w-20 text-center text-lg" />
                <span className="text-xs text-muted-foreground">or</span>
                <IconPicker value={editCat?.image_url || ""} onChange={(url) => setEditCat(prev => ({ ...prev, image_url: url }))} />
              </div>
              {editCat?.image_url && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={editCat.image_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditCat(prev => ({ ...prev, image_url: null }))}>
                    <X className="w-3 h-3 mr-1" /> Clear image
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Active (visible on Place Order)</label>
              <Switch checked={editCat?.is_active ?? true}
                onCheckedChange={v => setEditCat(prev => ({ ...prev, is_active: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1.5" /> {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Category?</DialogTitle>
            <DialogDescription>Products in this category will be moved to "Uncategorized".</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
