import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["All", "VPN", "Editing Tools", "AI Accounts"] as const;

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [form, setForm] = useState({
    name: "", icon: "📦", category: "General",
    retail_price: "", wholesale_price: "", duration: "", stock: "",
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const resetForm = () => {
    setForm({ name: "", icon: "📦", category: "General", retail_price: "", wholesale_price: "", duration: "", stock: "" });
    setEditing(null);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      name: p.name, icon: p.icon, category: p.category,
      retail_price: p.retail_price.toString(), wholesale_price: p.wholesale_price.toString(),
      duration: p.duration, stock: p.stock.toString(),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name, icon: form.icon, category: form.category,
      retail_price: parseInt(form.retail_price), wholesale_price: parseInt(form.wholesale_price),
      duration: form.duration, stock: parseInt(form.stock),
    };

    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Product updated");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Product created");
    }

    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product deleted");
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground text-sm">Manage digital service products</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-glow gap-2"><Plus className="w-4 h-4" />Add Product</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground">{editing ? "Edit" : "New"} Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-muted/50 border-border" />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Icon (emoji)</Label>
                  <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="bg-muted/50 border-border" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Category</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required className="bg-muted/50 border-border" />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Duration</Label>
                  <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} required placeholder="1 Month" className="bg-muted/50 border-border" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Retail Price</Label>
                  <Input type="number" value={form.retail_price} onChange={(e) => setForm({ ...form, retail_price: e.target.value })} required className="bg-muted/50 border-border font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Wholesale</Label>
                  <Input type="number" value={form.wholesale_price} onChange={(e) => setForm({ ...form, wholesale_price: e.target.value })} required className="bg-muted/50 border-border font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Stock</Label>
                  <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required className="bg-muted/50 border-border font-mono" />
                </div>
              </div>
              <Button type="submit" className="w-full btn-glow">{editing ? "Update" : "Create"} Product</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 animate-fade-in">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Product</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Category</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Duration</th>
                <th className="text-right text-xs font-medium text-muted-foreground p-4">Retail</th>
                <th className="text-right text-xs font-medium text-muted-foreground p-4">Wholesale</th>
                <th className="text-center text-xs font-medium text-muted-foreground p-4">Stock</th>
                <th className="text-center text-xs font-medium text-muted-foreground p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(products || [])
                .filter((p: any) => activeCategory === "All" || p.category === activeCategory)
                .map((p: any) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm font-medium text-foreground">{p.icon} {p.name}</td>
                  <td className="p-4 text-sm text-muted-foreground">{p.category}</td>
                  <td className="p-4 text-sm text-muted-foreground">{p.duration}</td>
                  <td className="p-4 text-sm font-mono text-right text-muted-foreground">{p.retail_price.toLocaleString()}</td>
                  <td className="p-4 text-sm font-mono text-right text-foreground">{p.wholesale_price.toLocaleString()}</td>
                  <td className="p-4 text-sm font-mono text-center text-foreground">{p.stock}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
