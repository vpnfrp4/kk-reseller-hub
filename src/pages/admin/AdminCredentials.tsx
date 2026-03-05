import { useState, useEffect, useMemo, useRef } from "react";

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
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, ChevronLeft, ChevronRight, Search, Download, Upload,
  AlertTriangle, Pencil, X, Check, ArrowRightLeft, SearchX,
  Package, LayoutGrid, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { DataCard } from "@/components/shared";
import { cn } from "@/lib/utils";

const EXPIRY_WARNING_DAYS = 7;
const PER_PAGE = 20;

/* ── helpers ──────────────────────────────────────────────────── */

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/30 text-primary rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function isNearExpiry(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return diff > 0 && diff <= EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000;
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

/** Derive a platform category from product name */
function deriveCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("facebook") || n.includes("fb")) return "Facebook";
  if (n.includes("whatsapp") || n.includes("wa")) return "WhatsApp";
  if (n.includes("tiktok") || n.includes("tik tok")) return "TikTok";
  if (n.includes("instagram") || n.includes("ig")) return "Instagram";
  if (n.includes("youtube") || n.includes("yt")) return "YouTube";
  if (n.includes("twitter") || n.includes("x ")) return "Twitter/X";
  if (n.includes("telegram")) return "Telegram";
  if (n.includes("spotify")) return "Spotify";
  if (n.includes("netflix")) return "Netflix";
  if (n.includes("vpn")) return "VPN";
  if (n.includes("capcut")) return "CapCut";
  if (n.includes("canva")) return "Canva";
  return "Others";
}

/* ── category icons ───────────────────────────────────────────── */
const CATEGORY_ICONS: Record<string, string> = {
  Facebook: "📘", WhatsApp: "💬", TikTok: "🎵", Instagram: "📸",
  YouTube: "🎬", "Twitter/X": "🐦", Telegram: "✈️", Spotify: "🎧",
  Netflix: "🎬", VPN: "🔐", CapCut: "✂️", Canva: "🎨", Others: "📦",
};

/* ── Searchable service dropdown ──────────────────────────────── */
function ServiceSearchDropdown({ products, value, onChange }: { products: any[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProduct = products.find((p) => p.id === value);
  const q = query.toLowerCase();
  const filtered = products.filter((p) => {
    if (!q) return true;
    const did = p.display_id ? String(p.display_id) : "";
    return p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q) || did.includes(q) || `#${did}`.includes(q);
  });

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    filtered.forEach((p) => {
      const cat = p.category || "General";
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={cn(
          "flex items-center gap-2 w-full bg-muted/50 border rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors",
          open ? "border-primary/50 ring-1 ring-primary/20" : "border-border hover:border-border/80"
        )}
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
      >
        {selectedProduct ? (
          <span className="flex-1 text-foreground truncate">
            <span className="font-mono text-primary/70 text-xs mr-1.5">#{selectedProduct.display_id}</span>
            {selectedProduct.icon} {selectedProduct.name} — {selectedProduct.duration}
          </span>
        ) : (
          <span className="flex-1 text-muted-foreground">Search & select a service...</span>
        )}
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>

      {open && (
        <div className="absolute z-[9999] left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden animate-fade-in">
          <div className="p-2 border-b border-border/50">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search by name, category, or #ID..."
              className="h-8 bg-muted/30 border-border/50 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {grouped.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">No services found</div>
            ) : grouped.map(([cat, items]) => (
              <div key={cat}>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 sticky top-0">
                  {CATEGORY_ICONS[deriveCategory(items[0]?.name || "")] || "📦"} {cat}
                </div>
                {items.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors",
                      value === p.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground"
                    )}
                    onClick={() => { onChange(p.id); setOpen(false); setQuery(""); }}
                  >
                    <span className="font-mono text-[11px] text-primary/60">#{p.display_id}</span>
                    <span className="truncate">{p.icon} {p.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">{p.duration}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── main component ───────────────────────────────────────────── */

export default function AdminCredentials() {
  const queryClient = useQueryClient();
  

  // realtime
  useEffect(() => {
    const channel = supabase
      .channel("admin-credentials-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "product_credentials" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-credentials"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  /* ── state ────────────────────────────────────────────────── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [bulkCredentials, setBulkCredentials] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const [activeCategory, setActiveCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "sold" | "expiring">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const [editingExpiryId, setEditingExpiryId] = useState<string | null>(null);
  const [editingExpiryValue, setEditingExpiryValue] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkExpiryOpen, setBulkExpiryOpen] = useState(false);
  const [bulkExpiryDate, setBulkExpiryDate] = useState("");
  const [bulkExpiryUpdating, setBulkExpiryUpdating] = useState(false);
  const [bulkDeleteSelectedOpen, setBulkDeleteSelectedOpen] = useState(false);
  const [bulkDeletingSelected, setBulkDeletingSelected] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkReassignOpen, setBulkReassignOpen] = useState(false);
  const [bulkReassignProduct, setBulkReassignProduct] = useState("");
  const [bulkReassigning, setBulkReassigning] = useState(false);

  // Escape to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedIds.size > 0) setSelectedIds(new Set());
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds.size]);

  /* ── queries ──────────────────────────────────────────────── */
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
        .select("*, products(name, duration, category)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  /* ── derived data ─────────────────────────────────────────── */
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: 0 };
    (credentials || []).forEach((c: any) => {
      const cat = deriveCategory((c.products as any)?.name || "");
      counts[cat] = (counts[cat] || 0) + 1;
      counts.All++;
    });
    return counts;
  }, [credentials]);

  const categories = useMemo(() => {
    const cats = Object.keys(categoryCounts).filter(c => c !== "All").sort();
    return ["All", ...cats];
  }, [categoryCounts]);

  const soldCount = (credentials || []).filter((c: any) => c.is_sold).length;
  const expiringCount = (credentials || []).filter((c: any) => !c.is_sold && (isNearExpiry(c.expires_at) || isExpired(c.expires_at))).length;

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return (credentials || []).filter((c: any) => {
      const productName = (c.products as any)?.name || "";
      // category filter
      if (activeCategory !== "All" && deriveCategory(productName) !== activeCategory) return false;
      // status filter
      if (statusFilter === "available" && c.is_sold) return false;
      if (statusFilter === "sold" && !c.is_sold) return false;
      if (statusFilter === "expiring" && !((!c.is_sold) && (isNearExpiry(c.expires_at) || isExpired(c.expires_at)))) return false;
      // search
      if (q && !c.credentials.toLowerCase().includes(q) && !productName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [credentials, activeCategory, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  /* ── handlers ─────────────────────────────────────────────── */
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const unsoldIds = filtered.filter((c: any) => !c.is_sold).map((c: any) => c.id);
    const allSelected = unsoldIds.length > 0 && unsoldIds.every(id => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(unsoldIds));
  };

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
    if (product) await supabase.from("products").update({ stock: product.stock + lines.length }).eq("id", selectedProduct);
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
      toast.error("Please upload a .csv or .txt file"); return;
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

  const handleUpdateExpiry = async (id: string) => {
    const newValue = editingExpiryValue ? new Date(editingExpiryValue).toISOString() : null;
    const { error } = await supabase.from("product_credentials").update({ expires_at: newValue } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(newValue ? "Expiry date updated" : "Expiry date removed");
    queryClient.invalidateQueries({ queryKey: ["admin-credentials"] });
    setEditingExpiryId(null);
  };

  const handleBulkExpiryUpdate = async () => {
    if (selectedIds.size === 0) return;
    setBulkExpiryUpdating(true);
    const newValue = bulkExpiryDate ? new Date(bulkExpiryDate).toISOString() : null;
    const { error } = await supabase.from("product_credentials").update({ expires_at: newValue } as any).in("id", Array.from(selectedIds));
    setBulkExpiryUpdating(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Expiry updated for ${selectedIds.size} credential(s)`);
    queryClient.invalidateQueries({ queryKey: ["admin-credentials"] });
    setSelectedIds(new Set());
    setBulkExpiryOpen(false);
    setBulkExpiryDate("");
  };

  const handleBulkReassign = async () => {
    if (!bulkReassignProduct || selectedIds.size === 0) return;
    setBulkReassigning(true);
    const { error } = await supabase.from("product_credentials").update({ product_id: bulkReassignProduct } as any).in("id", Array.from(selectedIds));
    setBulkReassigning(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${selectedIds.size} credential(s) reassigned`);
    queryClient.invalidateQueries({ queryKey: ["admin-credentials"] });
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    setSelectedIds(new Set());
    setBulkReassignOpen(false);
    setBulkReassignProduct("");
  };

  const handleExportCSV = () => {
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
      <span className={cn("flex items-center gap-1", expired ? "text-destructive font-semibold" : nearExpiry ? "text-destructive" : "text-muted-foreground")}>
        {(expired || nearExpiry) && <AlertTriangle className="w-3 h-3" />}
        {format(date, "MMM d, yyyy")}
        {expired && <span className="text-[10px] ml-1">(expired)</span>}
      </span>
    );
  };

  /* ── render ───────────────────────────────────────────────── */
  return (
    <div className="space-y-compact">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 gradient-text">Credentials</h1>
          <p className="text-caption text-muted-foreground">
            {(credentials || []).length} total · {soldCount} sold · {expiringCount} expiring
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-glow gap-2 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.3)]"><Plus className="w-4 h-4" />Add Credentials</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] flex flex-col p-0" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
              <DialogTitle className="text-foreground">Bulk Add Credentials</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">Select a service and paste credentials below</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleBulkAdd} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-3 space-y-4">
                {/* Searchable product selector */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Service</Label>
                  <ServiceSearchDropdown
                    products={products || []}
                    value={selectedProduct}
                    onChange={setSelectedProduct}
                  />
                  {/* Category preview */}
                  {selectedProduct && (() => {
                    const sel = (products || []).find((p: any) => p.id === selectedProduct);
                    if (!sel) return null;
                    const cat = deriveCategory(sel.name);
                    return (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/30">
                        <span className="text-base">{CATEGORY_ICONS[cat] || "📦"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{sel.icon} {sel.name} — {sel.duration}</p>
                          <p className="text-[10px] text-muted-foreground">Category: <span className="text-primary font-medium">{cat}</span> · #{sel.display_id}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Expiry Date (optional)</Label>
                  <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="bg-muted/50 border-border text-sm" min={new Date().toISOString().slice(0, 10)} />
                  <p className="text-[10px] text-muted-foreground">Credentials expiring within {EXPIRY_WARNING_DAYS} days will be highlighted</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Credentials (one per line)</Label>
                    <label className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />Upload CSV
                      <input type="file" accept=".csv,.txt" onChange={handleCSVUpload} className="hidden" />
                    </label>
                  </div>
                  <Textarea value={bulkCredentials} onChange={(e) => setBulkCredentials(e.target.value)} required rows={8} placeholder={"user1@vpn.com:Pass123\nuser2@vpn.com:Pass456\nLIC-XXXX-YYYY-ZZZZ"} className="bg-muted/50 border-border font-mono text-xs" />
                  <p className="text-[10px] text-muted-foreground">{bulkCredentials.trim() ? bulkCredentials.trim().split("\n").filter(Boolean).length : 0} credential(s) detected · Paste manually or upload a CSV/TXT file</p>
                </div>
              </div>
              <div className="shrink-0 px-6 py-4 border-t border-border/30 bg-card">
                <Button type="submit" className="w-full btn-glow shadow-[0_0_20px_-4px_hsl(var(--primary)/0.3)]" disabled={!selectedProduct || !bulkCredentials.trim()}>
                  Add {bulkCredentials.trim() ? bulkCredentials.trim().split("\n").filter(Boolean).length : 0} Credential(s)
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main layout: sidebar + content */}
      <div className="flex gap-compact">
        {/* Category sidebar */}
        <div className="hidden lg:flex flex-col w-52 shrink-0">
          <DataCard className="p-0 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5" />Categories
              </span>
            </div>
            <nav className="py-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setPage(1); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-all duration-200",
                    activeCategory === cat
                      ? "bg-primary/10 text-primary border-r-2 border-r-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <span className="text-base leading-none">{CATEGORY_ICONS[cat] || "📦"}</span>
                  <span className="flex-1 text-left truncate">{cat}</span>
                  <Badge variant="secondary" className="text-[10px] h-5 min-w-[28px] justify-center px-1.5 bg-muted/80">
                    {categoryCounts[cat] || 0}
                  </Badge>
                </button>
              ))}
            </nav>
          </DataCard>
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0 space-y-compact">
          {/* Mobile category selector */}
          <div className="lg:hidden">
            <select
              value={activeCategory}
              onChange={(e) => { setActiveCategory(e.target.value); setPage(1); }}
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_ICONS[cat] || "📦"} {cat} ({categoryCounts[cat] || 0})</option>
              ))}
            </select>
          </div>

          {/* Search + filters + batch actions toolbar */}
          <DataCard className="p-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  placeholder="Search by credential or product name..."
                  className="pl-9 bg-muted/30 border-border/50 font-mono text-sm h-9"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status filter */}
              <div className="flex gap-1.5 items-center">
                <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {(["all", "available", "sold", "expiring"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setPage(1); }}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200",
                      statusFilter === s
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    {s === "all" ? "All" : s === "available" ? "Available" : s === "sold" ? "Sold" : `Expiring (${expiringCount})`}
                  </button>
                ))}
              </div>

              {/* Batch buttons */}
              <div className="flex gap-1.5 shrink-0">
                <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" onClick={handleExportCSV}>
                  <Download className="w-3.5 h-3.5" />Export
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10" disabled={soldCount === 0} onClick={() => setBulkDeleteOpen(true)}>
                  <Trash2 className="w-3.5 h-3.5" />Sold ({soldCount})
                </Button>
              </div>
            </div>

            {/* Results count */}
            <div className="mt-2.5 flex items-center gap-2 text-xs text-muted-foreground">
              <Package className="w-3.5 h-3.5" />
              <span>{filtered.length} credential{filtered.length !== 1 ? "s" : ""} found</span>
              {activeCategory !== "All" && (
                <Badge variant="outline" className="text-[10px] h-5 gap-1">
                  {CATEGORY_ICONS[activeCategory]} {activeCategory}
                  <button onClick={() => setActiveCategory("All")} className="ml-0.5 hover:text-foreground"><X className="w-2.5 h-2.5" /></button>
                </Badge>
              )}
            </div>
          </DataCard>

          {/* Data table */}
          <DataCard noPadding>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="w-10 p-3">
                      <input
                        type="checkbox"
                        className="rounded border-border accent-primary"
                        onChange={toggleSelectAll}
                        checked={(() => {
                          const unsoldIds = filtered.filter((c: any) => !c.is_sold).map((c: any) => c.id);
                          return unsoldIds.length > 0 && unsoldIds.every(id => selectedIds.has(id));
                        })()}
                      />
                    </th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider p-3">Service Name</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider p-3 hidden sm:table-cell">Category</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider p-3">Credentials</th>
                    <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider p-3">Status</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider p-3 hidden lg:table-cell">Expiry</th>
                    <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider p-3 w-20">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                            <SearchX className="w-6 h-6 text-muted-foreground/50" strokeWidth={1.5} />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">No credentials found</p>
                          {searchQuery && <p className="text-xs text-muted-foreground/60">Try a different search term</p>}
                        </div>
                      </td>
                    </tr>
                  ) : paginated.map((c: any, idx: number) => {
                    const productName = (c.products as any)?.name || "Unknown";
                    const duration = (c.products as any)?.duration || "";
                    const category = deriveCategory(productName);
                    return (
                      <tr
                        key={c.id}
                        className={cn(
                          "border-b border-border/20 transition-all duration-200 hover:bg-muted/20",
                          getRowHighlight(c),
                          selectedIds.has(c.id) && "bg-primary/5"
                        )}
                        style={{ animationDelay: `${idx * 20}ms` }}
                      >
                        <td className="w-10 p-3">
                          {!c.is_sold && (
                            <input
                              type="checkbox"
                              className="rounded border-border accent-primary"
                              checked={selectedIds.has(c.id)}
                              onChange={() => toggleSelect(c.id)}
                            />
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">{CATEGORY_ICONS[category] || "📦"}</span>
                            <div>
                              <p className="text-sm font-medium text-foreground leading-tight">{productName}</p>
                              <p className="text-[11px] text-muted-foreground">{duration}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 hidden sm:table-cell">
                          <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                            {CATEGORY_ICONS[category] || "📦"} {category}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <code className="text-xs font-mono text-primary/80 bg-primary/5 px-2 py-0.5 rounded border border-primary/10 inline-block max-w-[240px] truncate">
                            {searchQuery ? highlightMatch(c.credentials, searchQuery) : c.credentials}
                          </code>
                        </td>
                        <td className="p-3 text-center">
                          <span className={cn(
                            "inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium",
                            c.is_sold
                              ? "bg-muted/80 text-muted-foreground"
                              : isExpired(c.expires_at)
                                ? "bg-destructive/15 text-destructive"
                                : "bg-primary/15 text-primary"
                          )}>
                            {c.is_sold ? "Sold" : isExpired(c.expires_at) ? "Expired" : "Available"}
                          </span>
                        </td>
                        <td className="p-3 text-sm hidden lg:table-cell">
                          {editingExpiryId === c.id ? (
                            <div className="flex items-center gap-1">
                              <Input type="date" value={editingExpiryValue} onChange={(e) => setEditingExpiryValue(e.target.value)} className="h-7 w-36 text-xs bg-muted/50 border-border" />
                              <button onClick={() => handleUpdateExpiry(c.id)} className="p-1 rounded hover:bg-primary/10 text-primary transition-colors"><Check className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditingExpiryId(null)} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingExpiryId(c.id); setEditingExpiryValue(c.expires_at ? new Date(c.expires_at).toISOString().slice(0, 10) : ""); }}
                              className="flex items-center gap-1 group cursor-pointer"
                              title="Click to edit expiry date"
                            >
                              {formatExpiry(c.expires_at)}
                              <Pencil className="w-3 h-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
                            </button>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            {!c.is_sold && (
                              <>
                                <button
                                  onClick={() => { setEditingExpiryId(c.id); setEditingExpiryValue(c.expires_at ? new Date(c.expires_at).toISOString().slice(0, 10) : ""); }}
                                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors lg:hidden"
                                  title="Edit expiry"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(c.id)}
                                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Showing {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, filtered.length)} of {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium text-foreground px-2">{currentPage} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </DataCard>
        </div>
      </div>

      {/* ── Dialogs ───────────────────────────────────────────── */}

      {/* Delete sold */}
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

      {/* Bulk expiry */}
      <Dialog open={bulkExpiryOpen} onOpenChange={setBulkExpiryOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Set Expiry Date</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Set expiry date for <span className="font-semibold text-foreground">{selectedIds.size}</span> selected credential(s).
            </DialogDescription>
          </DialogHeader>
          <Input type="date" value={bulkExpiryDate} onChange={(e) => setBulkExpiryDate(e.target.value)} className="bg-muted/50 border-border text-sm" min={new Date().toISOString().slice(0, 10)} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkExpiryOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkExpiryUpdate} disabled={bulkExpiryUpdating} className="btn-glow">
              {bulkExpiryUpdating ? "Updating..." : `Update ${selectedIds.size} Credentials`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete selected */}
      <Dialog open={bulkDeleteSelectedOpen} onOpenChange={setBulkDeleteSelectedOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete Selected Credentials</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Delete <span className="font-semibold text-destructive">{selectedIds.size}</span> selected unsold credential(s)? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkDeleteSelectedOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={bulkDeletingSelected} onClick={async () => {
              setBulkDeletingSelected(true);
              const { error } = await supabase.from("product_credentials").delete().in("id", Array.from(selectedIds));
              setBulkDeletingSelected(false);
              setBulkDeleteSelectedOpen(false);
              if (error) { toast.error(error.message); return; }
              toast.success(`${selectedIds.size} credential(s) deleted`);
              queryClient.invalidateQueries({ queryKey: ["admin-credentials"] });
              queryClient.invalidateQueries({ queryKey: ["admin-products"] });
              setSelectedIds(new Set());
            }}>
              {bulkDeletingSelected ? "Deleting..." : `Delete ${selectedIds.size} Credentials`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk reassign */}
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
            <select value={bulkReassignProduct} onChange={(e) => setBulkReassignProduct(e.target.value)} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground">
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

      {/* Floating selection bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-card border-primary/20 px-5 py-3 flex items-center gap-3 animate-fade-in" style={{ boxShadow: '0 0 30px hsl(43 76% 47% / 0.15), 0 20px 40px -10px hsl(0 0% 0% / 0.4)' }}>
          <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
          <div className="w-px h-5 bg-border" />
          <Button size="sm" className="gap-1.5 btn-glow h-8" onClick={() => setBulkExpiryOpen(true)}>
            <Pencil className="w-3.5 h-3.5" />Set Expiry
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => setBulkReassignOpen(true)}>
            <ArrowRightLeft className="w-3.5 h-3.5" />Reassign
          </Button>
          <Button size="sm" variant="destructive" className="gap-1.5 h-8" onClick={() => setBulkDeleteSelectedOpen(true)}>
            <Trash2 className="w-3.5 h-3.5" />Delete
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground h-8" onClick={() => setSelectedIds(new Set())}>
            <X className="w-3.5 h-3.5" />Clear
          </Button>
        </div>
      )}
    </div>
  );
}
