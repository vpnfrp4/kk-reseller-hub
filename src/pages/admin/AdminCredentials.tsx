import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, ChevronLeft, ChevronRight, Search, Download, Upload, AlertTriangle, Pencil, X, Check, ArrowRightLeft, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const EXPIRY_WARNING_DAYS = 7;

function isNearExpiry(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return diff > 0 && diff <= EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000;
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

export default function AdminCredentials() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("admin-credentials-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_credentials" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-credentials"] });
          queryClient.invalidateQueries({ queryKey: ["admin-credential-counts"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterProduct, setFilterProduct] = useState(searchParams.get("product") || "");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [bulkCredentials, setBulkCredentials] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "sold" | "expiring">("all");
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [searchQuery, setSearchQuery] = useState("");

  const [editingExpiryId, setEditingExpiryId] = useState<string | null>(null);
  const [editingExpiryValue, setEditingExpiryValue] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkExpiryOpen, setBulkExpiryOpen] = useState(false);
  const [bulkExpiryDate, setBulkExpiryDate] = useState("");
  const [bulkExpiryUpdating, setBulkExpiryUpdating] = useState(false);
  const [bulkDeleteSelectedOpen, setBulkDeleteSelectedOpen] = useState(false);
  const [bulkDeletingSelected, setBulkDeletingSelected] = useState(false);
  const [bulkReassignOpen, setBulkReassignOpen] = useState(false);
  const [bulkReassignProduct, setBulkReassignProduct] = useState("");
  const [bulkReassigning, setBulkReassigning] = useState(false);

  const handleBulkReassign = async () => {
    if (!bulkReassignProduct || selectedIds.size === 0) return;
    setBulkReassigning(true);
    const { error } = await supabase
      .from("product_credentials")
      .update({ product_id: bulkReassignProduct } as any)
      .in("id", Array.from(selectedIds));
    setBulkReassigning(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${selectedIds.size} credential(s) reassigned`);
    queryClient.invalidateQueries({ queryKey: ["admin-credentials"] });
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    setSelectedIds(new Set());
    setBulkReassignOpen(false);
    setBulkReassignProduct("");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (filtered: any[]) => {
    const unsoldIds = filtered.filter((c: any) => !c.is_sold).map((c: any) => c.id);
    const allSelected = unsoldIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unsoldIds));
    }
  };

  const handleBulkExpiryUpdate = async () => {
    if (selectedIds.size === 0) return;
    setBulkExpiryUpdating(true);
    const newValue = bulkExpiryDate ? new Date(bulkExpiryDate).toISOString() : null;
    const { error } = await supabase
      .from("product_credentials")
      .update({ expires_at: newValue } as any)
      .in("id", Array.from(selectedIds));
    setBulkExpiryUpdating(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Expiry updated for ${selectedIds.size} credential(s)`);
    queryClient.invalidateQueries({ queryKey: ["admin-credentials"] });
    setSelectedIds(new Set());
    setBulkExpiryOpen(false);
    setBulkExpiryDate("");
  };

  const handleUpdateExpiry = async (id: string) => {
    const newValue = editingExpiryValue ? new Date(editingExpiryValue).toISOString() : null;
    const { error } = await supabase
      .from("product_credentials")
      .update({ expires_at: newValue } as any)
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(newValue ? "Expiry date updated" : "Expiry date removed");
    queryClient.invalidateQueries({ queryKey: ["admin-credentials"] });
    setEditingExpiryId(null);
  };

  useEffect(() => {
    const p = searchParams.get("product");
    if (p) setFilterProduct(p);
  }, [searchParams]);

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
      ...(expiryDate ? { expires_at: new Date(expiryDate).toISOString() } : {}),
    }));

    const { error } = await supabase.from("product_credentials").insert(inserts as any);
    if (error) { toast.error(error.message); return; }

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
    setExpiryDate("");
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      toast.error("Please upload a .csv or .txt file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text?.trim()) { toast.error("File is empty"); return; }
      const lines = text.trim().split("\n").filter(Boolean);
      const firstLine = lines[0].toLowerCase().trim();
      const startIdx = (firstLine.includes("credential") || firstLine.includes("email") || firstLine.includes("account")) ? 1 : 0;
      const creds = lines.slice(startIdx).map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return "";
        const parts = trimmed.split(",").map(p => p.trim().replace(/^"|"$/g, ""));
        return parts[0] || trimmed;
      }).filter(Boolean);

      if (creds.length === 0) { toast.error("No credentials found in file"); return; }
      setBulkCredentials(creds.join("\n"));
      toast.success(`${creds.length} credential(s) loaded from file`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this credential?")) return;
    const { error } = await supabase.from("product_credentials").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Credential deleted");
    queryClient.invalidateQueries({ queryKey: ["admin-credentials"] });
  };

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const soldCount = (credentials || []).filter((c: any) => c.is_sold).length;
  const expiringCount = (credentials || []).filter((c: any) => !c.is_sold && (isNearExpiry(c.expires_at) || isExpired(c.expires_at))).length;

  const handleBulkDeleteSold = async () => {
    setBulkDeleting(true);
    const soldIds = (credentials || []).filter((c: any) => c.is_sold).map((c: any) => c.id);
    const { error } = await supabase.from("product_credentials").delete().in("id", soldIds);
    setBulkDeleting(false);
    setBulkDeleteOpen(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${soldIds.length} sold credential(s) deleted`);
    queryClient.invalidateQueries({ queryKey: ["admin-credentials"] });
  };

  const filterCredentials = (list: any[]) => {
    const q = searchQuery.toLowerCase();
    return list.filter((c: any) =>
      (!filterProduct || c.product_id === filterProduct) &&
      (statusFilter === "all"
        || (statusFilter === "available" ? !c.is_sold : false)
        || (statusFilter === "sold" ? c.is_sold : false)
        || (statusFilter === "expiring" ? (!c.is_sold && (isNearExpiry(c.expires_at) || isExpired(c.expires_at))) : false)
      ) &&
      (!q || c.credentials.toLowerCase().includes(q))
    );
  };

  const getRowHighlight = (c: any) => {
    if (c.is_sold) return "";
    if (isExpired(c.expires_at)) return "bg-destructive/10 border-l-2 border-l-destructive";
    if (isNearExpiry(c.expires_at)) return "bg-destructive/5 border-l-2 border-l-destructive/60";
    return "";
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return <span className="text-muted-foreground/50">—</span>;
    const date = new Date(expiresAt);
    const expired = isExpired(expiresAt);
    const nearExpiry = isNearExpiry(expiresAt);
    return (
      <span className={`flex items-center gap-1 ${expired ? "text-destructive font-semibold" : nearExpiry ? "text-destructive" : "text-muted-foreground"}`}>
        {(expired || nearExpiry) && <AlertTriangle className="w-3 h-3" />}
        {format(date, "MMM d, yyyy")}
        {expired && <span className="text-[10px] ml-1">(expired)</span>}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Credentials</h1>
          <p className="text-muted-foreground text-sm">Manage pre-loaded account credentials</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              const filtered = filterCredentials(credentials || []);
              if (filtered.length === 0) { toast.error("No credentials to export"); return; }
              const csv = "Product,Credentials,Status,Expiry,Added\n" + filtered.map((c: any) =>
                `"${(c.products as any)?.name || "Unknown"} - ${(c.products as any)?.duration || ""}","${c.credentials}","${c.is_sold ? "Sold" : "Available"}","${c.expires_at ? format(new Date(c.expires_at), "yyyy-MM-dd") : ""}","${new Date(c.created_at).toLocaleDateString()}"`
              ).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `credentials-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="w-4 h-4" />Export CSV
          </Button>
          
          <Button
            variant="outline"
            className="gap-2 text-destructive hover:text-destructive"
            disabled={soldCount === 0}
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4" />Delete Sold ({soldCount})
          </Button>
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
                <Label className="text-muted-foreground text-xs">Expiry Date (optional)</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="bg-muted/50 border-border text-sm"
                  min={new Date().toISOString().slice(0, 10)}
                />
                <p className="text-[10px] text-muted-foreground">
                  Credentials expiring within {EXPIRY_WARNING_DAYS} days will be highlighted
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground text-xs">Credentials (one per line)</Label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    Upload CSV
                    <input type="file" accept=".csv,.txt" onChange={handleCSVUpload} className="hidden" />
                  </label>
                </div>
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
                  {" · "}Paste manually or upload a CSV/TXT file
                </p>
              </div>
              <Button type="submit" className="w-full btn-glow">Add Credentials</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="flex gap-2 animate-fade-in">
        <button
          onClick={() => { setFilterProduct(""); setSearchParams({}); setPage(1); }}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !filterProduct ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >All</button>
        {(products || []).map((p: any) => (
          <button
            key={p.id}
            onClick={() => { setFilterProduct(p.id); setSearchParams({ product: p.id }); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filterProduct === p.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >{p.icon} {p.name}</button>
        ))}
      </div>

      <div className="flex gap-2 animate-fade-in">
        {(["all", "available", "sold", "expiring"] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? "All Status" : s === "available" ? "Available" : s === "sold" ? "Sold" : `Expiring (${expiringCount})`}
          </button>
        ))}
      </div>

      <div className="relative animate-fade-in">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          placeholder="Search credentials..."
          className="pl-9 bg-muted/50 border-border font-mono text-sm"
        />
      </div>

      <div className="glass-card overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="w-10 p-4">
                  <input
                    type="checkbox"
                    className="rounded border-border accent-primary"
                    onChange={() => {
                      const filtered = filterCredentials(credentials || []);
                      toggleSelectAll(filtered);
                    }}
                    checked={(() => {
                      const filtered = filterCredentials(credentials || []);
                      const unsoldIds = filtered.filter((c: any) => !c.is_sold).map((c: any) => c.id);
                      return unsoldIds.length > 0 && unsoldIds.every(id => selectedIds.has(id));
                    })()}
                  />
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Product</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Credentials</th>
                <th className="text-center text-xs font-medium text-muted-foreground p-4">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Expiry</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Added</th>
                <th className="text-center text-xs font-medium text-muted-foreground p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filtered = filterCredentials(credentials || []);
                const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
                const currentPage = Math.min(page, totalPages);
                const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
                return paginated.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">No credentials found</td></tr>
              ) : paginated.map((c: any) => (
                <tr key={c.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${getRowHighlight(c)}`}>
                  <td className="w-10 p-4">
                    {!c.is_sold && (
                      <input
                        type="checkbox"
                        className="rounded border-border accent-primary"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                      />
                    )}
                  </td>
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
                  <td className="p-4 text-sm">
                    {editingExpiryId === c.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="date"
                          value={editingExpiryValue}
                          onChange={(e) => setEditingExpiryValue(e.target.value)}
                          className="h-7 w-36 text-xs bg-muted/50 border-border"
                        />
                        <button onClick={() => handleUpdateExpiry(c.id)} className="p-1 rounded hover:bg-primary/10 text-primary transition-colors">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingExpiryId(null)} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingExpiryId(c.id);
                          setEditingExpiryValue(c.expires_at ? new Date(c.expires_at).toISOString().slice(0, 10) : "");
                        }}
                        className="flex items-center gap-1 group cursor-pointer"
                        title="Click to edit expiry date"
                      >
                        {formatExpiry(c.expires_at)}
                        <Pencil className="w-3 h-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
                      </button>
                    )}
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
              ));
              })()}
            </tbody>
          </table>
        </div>
        {(() => {
          const filtered = filterCredentials(credentials || []);
          const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
          if (totalPages <= 1) return null;
          const currentPage = Math.min(page, totalPages);
          return (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Showing {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium text-foreground px-2">{currentPage} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete Sold Credentials</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This will permanently delete <span className="font-semibold text-foreground">{soldCount}</span> sold credential(s). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDeleteSold} disabled={bulkDeleting}>
              {bulkDeleting ? "Deleting..." : `Delete ${soldCount} Credentials`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkExpiryOpen} onOpenChange={setBulkExpiryOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Set Expiry Date</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Set expiry date for <span className="font-semibold text-foreground">{selectedIds.size}</span> selected credential(s). Leave empty to remove expiry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="date"
              value={bulkExpiryDate}
              onChange={(e) => setBulkExpiryDate(e.target.value)}
              className="bg-muted/50 border-border text-sm"
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkExpiryOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkExpiryUpdate} disabled={bulkExpiryUpdating} className="btn-glow">
              {bulkExpiryUpdating ? "Updating..." : `Update ${selectedIds.size} Credentials`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete selected confirmation dialog */}
      <Dialog open={bulkDeleteSelectedOpen} onOpenChange={setBulkDeleteSelectedOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete Selected Credentials</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-destructive">{selectedIds.size}</span> selected unsold credential(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkDeleteSelectedOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={bulkDeletingSelected}
              onClick={async () => {
                setBulkDeletingSelected(true);
                const { error } = await supabase
                  .from("product_credentials")
                  .delete()
                  .in("id", Array.from(selectedIds));
                setBulkDeletingSelected(false);
                setBulkDeleteSelectedOpen(false);
                if (error) { toast.error(error.message); return; }
                toast.success(`${selectedIds.size} credential(s) deleted`);
                queryClient.invalidateQueries({ queryKey: ["admin-credentials"] });
                queryClient.invalidateQueries({ queryKey: ["admin-products"] });
                setSelectedIds(new Set());
              }}
            >
              {bulkDeletingSelected ? "Deleting..." : `Delete ${selectedIds.size} Credentials`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating selection bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-xl shadow-lg px-5 py-3 flex items-center gap-4 animate-fade-in">
          {(() => {
            const filtered = filterCredentials(credentials || []);
            const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
            const currentPage = Math.min(page, totalPages);
            const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
            const pageIds = new Set(paginated.map((c: any) => c.id));
            const selectedOnPage = Array.from(selectedIds).filter(id => pageIds.has(id)).length;
            const selectedOtherPages = selectedIds.size - selectedOnPage;
            const unsoldOnPage = paginated.filter((c: any) => !c.is_sold);
            const allOnPageSelected = unsoldOnPage.length > 0 && unsoldOnPage.every((c: any) => selectedIds.has(c.id));
            const allUnsoldFiltered = filtered.filter((c: any) => !c.is_sold);
            const allFilteredSelected = allUnsoldFiltered.length > 0 && allUnsoldFiltered.every((c: any) => selectedIds.has(c.id));
            return (
              <>
                <span className="text-sm font-medium text-foreground">
                  {selectedIds.size} selected
                  {selectedOtherPages > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({selectedOnPage} on this page, {selectedOtherPages} on other pages)
                    </span>
                  )}
                </span>
                <div className="w-px h-5 bg-border" />
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-muted-foreground"
                  onClick={() => {
                    if (allOnPageSelected) {
                      setSelectedIds(prev => {
                        const next = new Set(prev);
                        unsoldOnPage.forEach((c: any) => next.delete(c.id));
                        return next;
                      });
                    } else {
                      setSelectedIds(prev => {
                        const next = new Set(prev);
                        unsoldOnPage.forEach((c: any) => next.add(c.id));
                        return next;
                      });
                    }
                  }}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {allOnPageSelected ? "Deselect Page" : "Select Page"}
                </Button>
                {allUnsoldFiltered.length > perPage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-muted-foreground"
                    onClick={() => {
                      if (allFilteredSelected) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(allUnsoldFiltered.map((c: any) => c.id)));
                      }
                    }}
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    {allFilteredSelected ? `Deselect All (${allUnsoldFiltered.length})` : `Select All (${allUnsoldFiltered.length})`}
                  </Button>
                )}
              </>
            );
          })()}
          <Button
            size="sm"
            className="gap-1.5 btn-glow"
            onClick={() => setBulkExpiryOpen(true)}
          >
            <Pencil className="w-3.5 h-3.5" />Set Expiry
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setBulkReassignOpen(true)}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />Reassign
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="gap-1.5"
            onClick={() => setBulkDeleteSelectedOpen(true)}
          >
            <Trash2 className="w-3.5 h-3.5" />Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="w-3.5 h-3.5" />Clear
          </Button>
        </div>
      )}
      {/* Bulk reassign dialog */}
      <Dialog open={bulkReassignOpen} onOpenChange={setBulkReassignOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reassign Credentials</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Move <span className="font-semibold text-foreground">{selectedIds.size}</span> selected credential(s) to a different product.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-muted-foreground text-xs">Target Product</Label>
            <select
              value={bulkReassignProduct}
              onChange={(e) => setBulkReassignProduct(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground"
            >
              <option value="">Select product...</option>
              {(products || []).map((p: any) => (
                <option key={p.id} value={p.id}>{p.icon} {p.name} - {p.duration}</option>
              ))}
            </select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkReassignOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkReassign} disabled={bulkReassigning || !bulkReassignProduct} className="btn-glow">
              {bulkReassigning ? "Reassigning..." : `Reassign ${selectedIds.size} Credentials`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
