import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminCredentials() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [bulkCredentials, setBulkCredentials] = useState("");

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("name");
      return data || [];
    },
  });

  const { data: credentials } = useQuery({
    queryKey: ["admin-credentials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_credentials")
        .select("*, products(name, duration)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !bulkCredentials.trim()) return;

    const lines = bulkCredentials.trim().split("\n").filter(Boolean);
    const inserts = lines.map((cred) => ({
      product_id: selectedProduct,
      credentials: cred.trim(),
    }));

    const { error } = await supabase.from("product_credentials").insert(inserts);
    if (error) { toast.error(error.message); return; }

    // Update product stock
    const { data: product } = await supabase.from("products").select("stock").eq("id", selectedProduct).single();
    if (product) {
      await supabase.from("products").update({ stock: product.stock + lines.length }).eq("id", selectedProduct);
    }

    toast.success(`${lines.length} credential(s) added`);
    queryClient.invalidateQueries({ queryKey: ["admin-credentials"] });
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    setDialogOpen(false);
    setBulkCredentials("");
    setSelectedProduct("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this credential?")) return;
    const { error } = await supabase.from("product_credentials").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Credential deleted");
    queryClient.invalidateQueries({ queryKey: ["admin-credentials"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Credentials</h1>
          <p className="text-muted-foreground text-sm">Manage pre-loaded account credentials</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-glow gap-2"><Plus className="w-4 h-4" />Add Credentials</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-foreground">Bulk Add Credentials</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleBulkAdd} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Product</Label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  required
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Select product...</option>
                  {(products || []).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.icon} {p.name} - {p.duration}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Credentials (one per line)</Label>
                <Textarea
                  value={bulkCredentials}
                  onChange={(e) => setBulkCredentials(e.target.value)}
                  required
                  rows={8}
                  placeholder={"user1@vpn.com / Pass123\nuser2@vpn.com / Pass456\nLIC-XXXX-YYYY-ZZZZ"}
                  className="bg-muted/50 border-border font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  {bulkCredentials.trim() ? bulkCredentials.trim().split("\n").filter(Boolean).length : 0} credential(s) detected
                </p>
              </div>
              <Button type="submit" className="w-full btn-glow">Add Credentials</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Product</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Credentials</th>
                <th className="text-center text-xs font-medium text-muted-foreground p-4">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Added</th>
                <th className="text-center text-xs font-medium text-muted-foreground p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(!credentials || credentials.length === 0) ? (
                <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No credentials yet</td></tr>
              ) : credentials.map((c: any) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm text-foreground">
                    {(c.products as any)?.name || "Unknown"} - {(c.products as any)?.duration || ""}
                  </td>
                  <td className="p-4">
                    <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">{c.credentials}</code>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${c.is_sold ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                      {c.is_sold ? "Sold" : "Available"}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-center">
                    {!c.is_sold && (
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
