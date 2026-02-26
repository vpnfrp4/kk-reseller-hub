import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
  Loader2,
  DollarSign,
  Settings2,
  Globe,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";

/* ---------- types ---------- */
interface LookupItem { id: string; name: string; sort_order?: number }
interface Carrier extends LookupItem { country_id: string }
interface Provider extends LookupItem { api_url?: string; status: string }

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
  brand_id: string | null;
  country_id: string | null;
  carrier_id: string | null;
  provider_id: string | null;
  provider_price: number;
  margin_percent: number;
  final_price: number;
}

const EMPTY_FORM = {
  brand_id: "",
  service_name: "",
  carrier_id: "",
  country_id: "",
  processing_time: "1-3 Days",
  fulfillment_mode: "manual",
  provider_id: "",
  provider_price: 0,
  margin_percent: 30,
  status: "active",
};

type FormState = typeof EMPTY_FORM;

function calcFinalPrice(providerPrice: number, margin: number): number {
  if (providerPrice <= 0) return 0;
  return Math.round(providerPrice * (1 + margin / 100));
}

export default function AdminImeiServices() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showPriceAdjust, setShowPriceAdjust] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [priceAdjust, setPriceAdjust] = useState({ percent: 10, direction: "increase", scope: "all", scopeValue: "" });

  /* ---------- lookup queries ---------- */
  const { data: brands = [] } = useQuery<LookupItem[]>({
    queryKey: ["imei-brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("imei_brands").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: countries = [] } = useQuery<LookupItem[]>({
    queryKey: ["imei-countries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("imei_countries").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: allCarriers = [] } = useQuery<Carrier[]>({
    queryKey: ["imei-carriers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("imei_carriers").select("*").order("sort_order");
      if (error) throw error;
      return data as Carrier[];
    },
  });

  const { data: providers = [] } = useQuery<Provider[]>({
    queryKey: ["imei-providers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("imei_providers").select("*").order("sort_order");
      if (error) throw error;
      return data as Provider[];
    },
  });

  // Filter carriers by selected country
  const filteredCarriers = useMemo(() => {
    if (!form.country_id) return [];
    return allCarriers.filter((c) => c.country_id === form.country_id);
  }, [allCarriers, form.country_id]);

  // Auto-calculate final price
  const computedFinalPrice = useMemo(
    () => calcFinalPrice(form.provider_price, form.margin_percent),
    [form.provider_price, form.margin_percent]
  );

  // Reset carrier when country changes
  useEffect(() => {
    if (form.country_id) {
      const validCarrier = filteredCarriers.find((c) => c.id === form.carrier_id);
      if (!validCarrier && filteredCarriers.length > 0) {
        setForm((prev) => ({ ...prev, carrier_id: "" }));
      }
    }
  }, [form.country_id, filteredCarriers]);

  /* ---------- services query ---------- */
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

  const filteredServices = services.filter((s) => {
    if (brandFilter !== "all" && s.brand_id !== brandFilter && s.brand !== brandFilter) return false;
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

  /* ---------- save mutation ---------- */
  const saveMutation = useMutation({
    mutationFn: async (data: FormState & { id?: string }) => {
      const selectedBrand = brands.find((b) => b.id === data.brand_id);
      const selectedCountry = countries.find((c) => c.id === data.country_id);
      const selectedCarrier = allCarriers.find((c) => c.id === data.carrier_id);
      const finalPrice = calcFinalPrice(data.provider_price, data.margin_percent);

      const payload = {
        brand: selectedBrand?.name || "",
        brand_id: data.brand_id || null,
        service_name: data.service_name,
        carrier: selectedCarrier?.name || "All",
        carrier_id: data.carrier_id || null,
        country: selectedCountry?.name || "All",
        country_id: data.country_id || null,
        processing_time: data.processing_time,
        fulfillment_mode: data.fulfillment_mode,
        provider_id: data.fulfillment_mode === "api" ? (data.provider_id || null) : null,
        api_provider: data.fulfillment_mode === "api"
          ? providers.find((p) => p.id === data.provider_id)?.name || null
          : null,
        provider_price: data.provider_price,
        margin_percent: data.margin_percent,
        final_price: finalPrice,
        price: finalPrice || data.provider_price,
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

  /* ---------- bulk ops ---------- */
  const bulkImportMutation = useMutation({
    mutationFn: async (csv: string) => {
      const lines = csv.trim().split("\n").slice(1);
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
      const multiplier = config.direction === "increase" ? 1 + config.percent / 100 : 1 - config.percent / 100;
      for (const item of items || []) {
        const newPrice = Math.round((item as any).price * multiplier);
        await supabase.from("imei_services").update({ price: Math.max(0, newPrice), final_price: Math.max(0, newPrice) }).eq("id", (item as any).id);
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

  /* ---------- helpers ---------- */
  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleEdit = (svc: ImeiService) => {
    setForm({
      brand_id: svc.brand_id || "",
      service_name: svc.service_name,
      carrier_id: svc.carrier_id || "",
      country_id: svc.country_id || "",
      processing_time: svc.processing_time,
      fulfillment_mode: svc.fulfillment_mode,
      provider_id: svc.provider_id || "",
      provider_price: svc.provider_price || 0,
      margin_percent: svc.margin_percent || 30,
      status: svc.status,
    });
    setEditingId(svc.id);
    setShowForm(true);
  };

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isFormValid = !!form.brand_id && !!form.service_name && !!form.country_id;

  const brandOptions = brands.map((b) => b);
  const brandFilterOptions = [...new Set(services.map((s) => s.brand))].sort();

  const getBrandName = (id: string | null) => brands.find((b) => b.id === id)?.name || "";
  const getCountryName = (id: string | null) => countries.find((c) => c.id === id)?.name || "";
  const getCarrierName = (id: string | null) => allCarriers.find((c) => c.id === id)?.name || "";
  const getProviderName = (id: string | null) => providers.find((p) => p.id === id)?.name || "";

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
          <Input placeholder="Search services..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Brand" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brandFilterOptions.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
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
                  <th>Country</th>
                  <th>Carrier</th>
                  <th>Time</th>
                  <th className="text-right">Cost</th>
                  <th className="text-right">Margin</th>
                  <th className="text-right">Final Price</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((svc) => (
                  <tr key={svc.id}>
                    <td className="p-default text-sm font-semibold">{svc.brand}</td>
                    <td className="p-default text-sm text-foreground">{svc.service_name}</td>
                    <td className="p-default text-sm text-muted-foreground">{svc.country}</td>
                    <td className="p-default text-sm text-muted-foreground">{svc.carrier}</td>
                    <td className="p-default text-sm text-muted-foreground">{svc.processing_time}</td>
                    <td className="p-default text-right">
                      {svc.provider_price > 0 ? (
                        <Money amount={svc.provider_price} className="text-muted-foreground text-xs" compact />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-default text-right text-sm text-muted-foreground">
                      {svc.margin_percent > 0 ? `${svc.margin_percent}%` : "—"}
                    </td>
                    <td className="p-default text-right">
                      <Money amount={svc.final_price || svc.price} className="font-semibold" />
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
            {filteredServices.map((svc) => (
              <div key={svc.id} className="glass-card p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{svc.service_name}</p>
                    <p className="text-xs text-muted-foreground">{svc.brand} · {svc.carrier} · {svc.country}</p>
                  </div>
                  <Money amount={svc.final_price || svc.price} className="font-semibold" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${svc.status === "active" ? "badge-available" : "badge-cancelled"}`}>
                      {svc.status}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      svc.fulfillment_mode === "api" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                    }`}>
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

      {/* ========== Enterprise Add/Edit Service Modal ========== */}
      <Dialog open={showForm} onOpenChange={() => resetForm()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              {editingId ? "Edit Service" : "Add IMEI Service"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Section: Service Info */}
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service Information</p>
              <Separator />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Service Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.service_name}
                onChange={(e) => updateField("service_name", e.target.value)}
                placeholder="iPhone All Models Clean Unlock"
              />
              {!form.service_name && showForm && (
                <p className="text-xs text-destructive">Service name is required</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Brand <span className="text-destructive">*</span></Label>
                <Select value={form.brand_id} onValueChange={(v) => updateField("brand_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                  <SelectContent>
                    {brandOptions.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Country <span className="text-destructive">*</span></Label>
                <Select value={form.country_id} onValueChange={(v) => updateField("country_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Carrier</Label>
                <Select
                  value={form.carrier_id}
                  onValueChange={(v) => updateField("carrier_id", v)}
                  disabled={!form.country_id}
                >
                  <SelectTrigger><SelectValue placeholder={form.country_id ? "Select carrier" : "Select country first"} /></SelectTrigger>
                  <SelectContent>
                    {filteredCarriers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Delivery Time</Label>
                <Select value={form.processing_time} onValueChange={(v) => updateField("processing_time", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-5 Minutes">1-5 Minutes</SelectItem>
                    <SelectItem value="5-30 Minutes">5-30 Minutes</SelectItem>
                    <SelectItem value="1-12 Hours">1-12 Hours</SelectItem>
                    <SelectItem value="1-24 Hours">1-24 Hours</SelectItem>
                    <SelectItem value="1-3 Days">1-3 Days</SelectItem>
                    <SelectItem value="3-7 Days">3-7 Days</SelectItem>
                    <SelectItem value="7-14 Days">7-14 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Section: Fulfillment */}
            <div className="space-y-1 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> Fulfillment
              </p>
              <Separator />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Fulfillment Mode</Label>
              <Select value={form.fulfillment_mode} onValueChange={(v) => updateField("fulfillment_mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Processing</SelectItem>
                  <SelectItem value="api">API Auto-Fulfillment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.fulfillment_mode === "api" && (
              <div className="space-y-1.5">
                <Label className="text-xs">API Provider <span className="text-destructive">*</span></Label>
                <Select value={form.provider_id} onValueChange={(v) => updateField("provider_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                  <SelectContent>
                    {providers.filter((p) => p.status === "active").map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.fulfillment_mode === "api" && !form.provider_id && (
                  <p className="text-xs text-destructive">Provider is required for API mode</p>
                )}
              </div>
            )}

            {/* Section: Pricing */}
            <div className="space-y-1 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Pricing
              </p>
              <Separator />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Provider Cost (MMK)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.provider_price || ""}
                  onChange={(e) => updateField("provider_price", parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Margin %</Label>
                <Input
                  type="number"
                  min={0}
                  max={500}
                  value={form.margin_percent}
                  onChange={(e) => updateField("margin_percent", parseFloat(e.target.value) || 0)}
                  placeholder="30"
                />
              </div>
            </div>

            {/* Auto-calculated final price */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Final Price (auto-calculated)</span>
                <Money amount={computedFinalPrice} className="text-lg font-bold text-primary" />
              </div>
              {form.provider_price > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Cost {form.provider_price.toLocaleString()} + {form.margin_percent}% margin = {computedFinalPrice.toLocaleString()} MMK
                </p>
              )}
            </div>

            {/* Section: Status */}
            <div className="space-y-1 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
              <Separator />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.status === "active"}
                onCheckedChange={(c) => updateField("status", c ? "active" : "inactive")}
              />
              <Label className="text-sm">
                {form.status === "active" ? "Active — visible to resellers" : "Inactive — hidden from marketplace"}
              </Label>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={resetForm}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={saveMutation.isPending || !isFormValid || (form.fulfillment_mode === "api" && !form.provider_id)}
                onClick={() => saveMutation.mutate(editingId ? { ...form, id: editingId } : form)}
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {editingId ? "Update Service" : "Create Service"}
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
