import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Pencil,
  Trash2,
  Loader2,
  Tag,
  Globe,
  Radio,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";

/* ============================================================
   Generic CRUD hook for simple lookup tables
   ============================================================ */
function useLookupCrud<T extends { id: string }>(
  table: string,
  queryKey: string,
  orderCol = "sort_order"
) {
  const queryClient = useQueryClient();

  const query = useQuery<T[]>({
    queryKey: [queryKey],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(table)
        .select("*")
        .order(orderCol);
      if (error) throw error;
      return data as T[];
    },
  });

  const upsert = useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: Record<string, unknown> }) => {
      if (id) {
        const { error } = await (supabase as any).from(table).update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from(table).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success("Saved");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success("Deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { ...query, upsert, remove };
}

/* ============================================================
   Brands Tab
   ============================================================ */
function BrandsTab() {
  const { data: items = [], isLoading, upsert, remove } = useLookupCrud<{ id: string; name: string; sort_order: number }>(
    "imei_brands", "imei-brands"
  );
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  const reset = () => { setOpen(false); setEditId(null); setName(""); setSortOrder(0); };
  const handleEdit = (item: typeof items[0]) => { setEditId(item.id); setName(item.name); setSortOrder(item.sort_order); setOpen(true); };
  const handleSave = () => {
    upsert.mutate({ id: editId || undefined, payload: { name, sort_order: sortOrder } }, { onSuccess: reset });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} brands</p>
        <Button size="sm" onClick={() => { reset(); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Brand
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card">
              <div>
                <span className="text-sm font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground ml-2">#{item.sort_order}</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Delete brand?")) remove.mutate(item.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={() => reset()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editId ? "Edit Brand" : "Add Brand"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Brand Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Apple" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sort Order</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>Cancel</Button>
              <Button className="flex-1" disabled={!name.trim() || upsert.isPending} onClick={handleSave}>
                {upsert.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================
   Countries Tab
   ============================================================ */
function CountriesTab() {
  const { data: items = [], isLoading, upsert, remove } = useLookupCrud<{ id: string; name: string; code: string | null; sort_order: number }>(
    "imei_countries", "imei-countries"
  );
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  const reset = () => { setOpen(false); setEditId(null); setName(""); setCode(""); setSortOrder(0); };
  const handleEdit = (item: typeof items[0]) => { setEditId(item.id); setName(item.name); setCode(item.code || ""); setSortOrder(item.sort_order); setOpen(true); };
  const handleSave = () => {
    upsert.mutate({ id: editId || undefined, payload: { name, code: code || null, sort_order: sortOrder } }, { onSuccess: reset });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} countries</p>
        <Button size="sm" onClick={() => { reset(); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Country
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card">
              <div>
                <span className="text-sm font-medium">{item.name}</span>
                {item.code && <span className="text-xs text-muted-foreground ml-2">({item.code})</span>}
                <span className="text-xs text-muted-foreground ml-2">#{item.sort_order}</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Delete country? This will also remove linked carriers.")) remove.mutate(item.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={() => reset()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editId ? "Edit Country" : "Add Country"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Country Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="United States" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Country Code (optional)</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="US" maxLength={5} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sort Order</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>Cancel</Button>
              <Button className="flex-1" disabled={!name.trim() || upsert.isPending} onClick={handleSave}>
                {upsert.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================
   Carriers Tab
   ============================================================ */
function CarriersTab() {
  const { data: items = [], isLoading, upsert, remove } = useLookupCrud<{ id: string; name: string; country_id: string; sort_order: number }>(
    "imei_carriers", "imei-carriers"
  );
  const { data: countries = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["imei-countries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("imei_countries").select("id, name").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [countryId, setCountryId] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [filterCountry, setFilterCountry] = useState("all");

  const countryName = (id: string) => countries.find((c) => c.id === id)?.name || "—";
  const filtered = filterCountry === "all" ? items : items.filter((i) => i.country_id === filterCountry);

  const reset = () => { setOpen(false); setEditId(null); setName(""); setCountryId(""); setSortOrder(0); };
  const handleEdit = (item: typeof items[0]) => { setEditId(item.id); setName(item.name); setCountryId(item.country_id); setSortOrder(item.sort_order); setOpen(true); };
  const handleSave = () => {
    if (!countryId) { toast.error("Select a country"); return; }
    upsert.mutate({ id: editId || undefined, payload: { name, country_id: countryId, sort_order: sortOrder } }, { onSuccess: reset });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{filtered.length} carriers</p>
          <Select value={filterCountry} onValueChange={setFilterCountry}>
            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Filter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => { reset(); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Carrier
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card">
              <div>
                <span className="text-sm font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground ml-2">· {countryName(item.country_id)}</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Delete carrier?")) remove.mutate(item.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={() => reset()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editId ? "Edit Carrier" : "Add Carrier"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Carrier Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="AT&T" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Country</Label>
              <Select value={countryId} onValueChange={setCountryId}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {countries.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sort Order</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>Cancel</Button>
              <Button className="flex-1" disabled={!name.trim() || !countryId || upsert.isPending} onClick={handleSave}>
                {upsert.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================
   Providers Tab
   ============================================================ */
function ProvidersTab() {
  const { data: items = [], isLoading, upsert, remove } = useLookupCrud<{ id: string; name: string; api_url: string | null; status: string; sort_order: number }>(
    "imei_providers", "imei-providers"
  );
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [status, setStatus] = useState("active");
  const [sortOrder, setSortOrder] = useState(0);

  const reset = () => { setOpen(false); setEditId(null); setName(""); setApiUrl(""); setStatus("active"); setSortOrder(0); };
  const handleEdit = (item: typeof items[0]) => { setEditId(item.id); setName(item.name); setApiUrl(item.api_url || ""); setStatus(item.status); setSortOrder(item.sort_order); setOpen(true); };
  const handleSave = () => {
    upsert.mutate({ id: editId || undefined, payload: { name, api_url: apiUrl || null, status, sort_order: sortOrder } }, { onSuccess: reset });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} providers</p>
        <Button size="sm" onClick={() => { reset(); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Provider
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card">
              <div>
                <span className="text-sm font-medium">{item.name}</span>
                {item.api_url && <span className="text-xs text-muted-foreground ml-2 truncate max-w-[200px] inline-block align-bottom">{item.api_url}</span>}
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${
                  item.status === "active" ? "badge-available" : "badge-cancelled"
                }`}>{item.status}</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Delete provider?")) remove.mutate(item.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={() => reset()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editId ? "Edit Provider" : "Add Provider"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Provider Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="DHRU" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">API URL (optional)</Label>
              <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://api.provider.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sort Order</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>Cancel</Button>
              <Button className="flex-1" disabled={!name.trim() || upsert.isPending} onClick={handleSave}>
                {upsert.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================
   Main Page
   ============================================================ */
export default function AdminImeiLookups() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">IMEI Lookup Tables</h1>
        <p className="text-sm text-muted-foreground">
          Manage brands, countries, carriers, and API providers used by IMEI services
        </p>
      </div>

      <Tabs defaultValue="brands" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="brands" className="gap-1.5 text-xs sm:text-sm">
            <Tag className="w-3.5 h-3.5 hidden sm:inline" /> Brands
          </TabsTrigger>
          <TabsTrigger value="countries" className="gap-1.5 text-xs sm:text-sm">
            <Globe className="w-3.5 h-3.5 hidden sm:inline" /> Countries
          </TabsTrigger>
          <TabsTrigger value="carriers" className="gap-1.5 text-xs sm:text-sm">
            <Radio className="w-3.5 h-3.5 hidden sm:inline" /> Carriers
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-1.5 text-xs sm:text-sm">
            <Cpu className="w-3.5 h-3.5 hidden sm:inline" /> Providers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brands" className="mt-4"><BrandsTab /></TabsContent>
        <TabsContent value="countries" className="mt-4"><CountriesTab /></TabsContent>
        <TabsContent value="carriers" className="mt-4"><CarriersTab /></TabsContent>
        <TabsContent value="providers" className="mt-4"><ProvidersTab /></TabsContent>
      </Tabs>
    </div>
  );
}
