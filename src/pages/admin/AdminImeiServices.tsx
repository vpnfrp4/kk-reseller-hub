import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import Money from "@/components/shared/Money";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Upload,
  Percent,
  Pencil,
  Trash2,
  Smartphone,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface ImeiService {
  id: string;
  brand: string;
  service_name: string;
  carrier: string;
  country: string;
  processing_time: string;
  price: number;
  fulfillment_mode: string;
  api_provider: string | null;
  status: string;
  sort_order: number;
}

const EMPTY_FORM = {
  brand: "",
  service_name: "",
  carrier: "All",
  country: "All",
  processing_time: "1-3 Days",
  price: 0,
  fulfillment_mode: "manual",
  api_provider: "",
  status: "active",
};

export default function AdminImeiServices() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showPriceAdjust, setShowPriceAdjust] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [priceAdjust, setPriceAdjust] = useState({ percent: 10, direction: "increase", scope: "all", scopeValue: "" });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["admin-imei-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("imei_services")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as ImeiService[];
    },
  });

  const brands = [...new Set(services.map((s) => s.brand))].sort();

  const filtered = services.filter((s) => {
    if (brandFilter !== "all" && s.brand !== brandFilter) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.service_name.toLowerCase().includes(q) ||
        s.brand.toLowerCase().includes(q) ||
        s.carrier.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Save service
  const saveMutation = useMutation({
    mutationFn: async (data: typeof EMPTY_FORM & { id?: string }) => {
      const payload = {
        brand: data.brand,
        service_name: data.service_name,
        carrier: data.carrier,
        country: data.country,
        processing_time: data.processing_time,
        price: data.price,
        fulfillment_mode: data.fulfillment_mode,
        api_provider: data.api_provider || null,
        status: data.status,
      };

      if (data.id) {
        const { error } = await supabase.from("imei_services").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("imei_services").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-imei-services"] });
      toast.success(editingId ? "Service updated" : "Service created");
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("imei_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-imei-services"] });
      toast.success("Service deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Bulk import
  const bulkImportMutation = useMutation({
    mutationFn: async (csv: string) => {
      const lines = csv.trim().split("\n").slice(1); // skip header
      const rows = lines.map((line) => {
        const [brand, service_name, carrier, country, processing_time, price, fulfillment_mode] =
          line.split(",").map((s) => s.trim());
        return {
          brand,
          service_name,
          carrier: carrier || "All",
          country: country || "All",
          processing_time: processing_time || "1-3 Days",
          price: parseInt(price) || 0,
          fulfillment_mode: fulfillment_mode || "manual",
          status: "active" as const,
        };
      });
      const { error } = await supabase.from("imei_services").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["admin-imei-services"] });
      toast.success(`${count} services imported`);
      setShowBulkImport(false);
      setCsvText("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Price adjustment
  const priceAdjustMutation = useMutation({
    mutationFn: async (config: typeof priceAdjust) => {
      let query = supabase.from("imei_services").select("id, price");
      if (config.scope === "brand" && config.scopeValue) {
        query = query.eq("brand", config.scopeValue);
      } else if (config.scope === "carrier" && config.scopeValue) {
        query = query.eq("carrier", config.scopeValue);
      }
      const { data: items, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      const multiplier = config.direction === "increase"
        ? 1 + config.percent / 100
        : 1 - config.percent / 100;

      for (const item of items || []) {
        const newPrice = Math.round((item as any).price * multiplier);
        await supabase.from("imei_services").update({ price: Math.max(0, newPrice) }).eq("id", (item as any).id);
      }
      return (items || []).length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["admin-imei-services"] });
      toast.success(`${count} prices adjusted`);
      setShowPriceAdjust(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleEdit = (svc: ImeiService) => {
    setForm({
      brand: svc.brand,
      service_name: svc.service_name,
      carrier: svc.carrier,
      country: svc.country,
      processing_time: svc.processing_time,
      price: svc.price,
      fulfillment_mode: svc.fulfillment_mode,
      api_provider: svc.api_provider || "",
      status: svc.status,
    });
    setEditingId(svc.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">IMEI Services Management</h1>
          <p className="text-sm text-muted-foreground">
            {services.length} total services · {services.filter((s) => s.status === "active").length} active
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowBulkImport(true)}>
            <Upload className="w-4 h-4 mr-1" /> Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPriceAdjust(true)}>
            <Percent className="w-4 h-4 mr-1" /> Adjust Prices
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add Service
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Brand" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Brand</th>
                  <th>Service</th>
                  <th>Carrier</th>
                  <th>Country</th>
                  <th>Time</th>
                  <th className="text-right">Price</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((svc) => (
                  <tr key={svc.id}>
                    <td className="p-default text-sm font-semibold">{svc.brand}</td>
                    <td className="p-default text-sm text-foreground">{svc.service_name}</td>
                    <td className="p-default text-sm text-muted-foreground">{svc.carrier}</td>
                    <td className="p-default text-sm text-muted-foreground">{svc.country}</td>
                    <td className="p-default text-sm text-muted-foreground">{svc.processing_time}</td>
                    <td className="p-default text-right">
                      <Money amount={svc.price} className="font-semibold" />
                    </td>
                    <td className="p-default">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        svc.fulfillment_mode === "api"
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}>
                        {svc.fulfillment_mode === "api" ? "API" : "Manual"}
                      </span>
                    </td>
                    <td className="p-default">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        svc.status === "active" ? "badge-available" : "badge-cancelled"
                      }`}>
                        {svc.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-default text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(svc)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Delete this service?")) deleteMutation.mutate(svc.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {filtered.map((svc) => (
              <div key={svc.id} className="glass-card p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{svc.service_name}</p>
                    <p className="text-xs text-muted-foreground">{svc.brand} · {svc.carrier} · {svc.country}</p>
                  </div>
                  <Money amount={svc.price} className="font-semibold" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${svc.status === "active" ? "badge-available" : "badge-cancelled"}`}>
                      {svc.status}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-semibold">
                      {svc.fulfillment_mode}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(svc)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(svc.id); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Service Modal */}
      <Dialog open={showForm} onOpenChange={() => resetForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Service" : "Add IMEI Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Brand</Label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Apple" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Service Name</Label>
                <Input value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} placeholder="iPhone All Models Unlock" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Carrier</Label>
                <Input value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} placeholder="AT&T" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Country</Label>
                <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="USA" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Price (MMK)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Processing Time</Label>
                <Input value={form.processing_time} onChange={(e) => setForm({ ...form, processing_time: e.target.value })} placeholder="1-3 Days" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Fulfillment Mode</Label>
                <Select value={form.fulfillment_mode} onValueChange={(v) => setForm({ ...form, fulfillment_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.fulfillment_mode === "api" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">API Provider</Label>
                  <Input value={form.api_provider} onChange={(e) => setForm({ ...form, api_provider: e.target.value })} placeholder="Provider name" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.status === "active"} onCheckedChange={(c) => setForm({ ...form, status: c ? "active" : "inactive" })} />
              <Label className="text-sm">Active</Label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={resetForm}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={saveMutation.isPending || !form.brand || !form.service_name}
                onClick={() => saveMutation.mutate(editingId ? { ...form, id: editingId } : form)}
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {editingId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
      <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Import CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste CSV with headers: brand, service_name, carrier, country, processing_time, price, fulfillment_mode
            </p>
            <textarea
              className="w-full h-40 rounded-lg border border-border bg-secondary p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={`brand,service_name,carrier,country,processing_time,price,fulfillment_mode\nApple,iPhone Unlock,AT&T,USA,1-3 Days,25000,manual`}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowBulkImport(false)}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={bulkImportMutation.isPending || !csvText.trim()}
                onClick={() => bulkImportMutation.mutate(csvText)}
              >
                {bulkImportMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                Import
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Price Adjustment Modal */}
      <Dialog open={showPriceAdjust} onOpenChange={setShowPriceAdjust}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Bulk Price Adjustment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Percentage</Label>
                <Input
                  type="number"
                  value={priceAdjust.percent}
                  onChange={(e) => setPriceAdjust({ ...priceAdjust, percent: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Direction</Label>
                <Select value={priceAdjust.direction} onValueChange={(v) => setPriceAdjust({ ...priceAdjust, direction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Increase</SelectItem>
                    <SelectItem value="decrease">Decrease</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Apply To</Label>
              <Select value={priceAdjust.scope} onValueChange={(v) => setPriceAdjust({ ...priceAdjust, scope: v, scopeValue: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="brand">Specific Brand</SelectItem>
                  <SelectItem value="carrier">Specific Carrier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {priceAdjust.scope !== "all" && (
              <div className="space-y-1.5">
                <Label className="text-xs">{priceAdjust.scope === "brand" ? "Brand" : "Carrier"}</Label>
                <Input
                  value={priceAdjust.scopeValue}
                  onChange={(e) => setPriceAdjust({ ...priceAdjust, scopeValue: e.target.value })}
                  placeholder={priceAdjust.scope === "brand" ? "Apple" : "AT&T"}
                />
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowPriceAdjust(false)}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={priceAdjustMutation.isPending}
                onClick={() => priceAdjustMutation.mutate(priceAdjust)}
              >
                {priceAdjustMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Percent className="w-4 h-4 mr-1" />}
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
