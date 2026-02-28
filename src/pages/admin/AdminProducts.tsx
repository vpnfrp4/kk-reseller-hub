import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, KeyRound, Upload, X, GripVertical, RotateCcw, Smartphone, Monitor, Wrench, Cpu, CheckCircle2, Info, FileText, Sparkles, Zap } from "lucide-react";
import { generateProductDescription, type DescriptionMode } from "@/lib/description-templates";
import { optimizeTitle, autoBuildProduct, type AutoBuildResult } from "@/lib/title-optimizer";
import PricingTiersDialog from "@/components/admin/PricingTiersDialog";
import BulkTierDialog from "@/components/admin/BulkTierDialog";
import { Progress } from "@/components/ui/progress";
import BulkImageUpload from "@/components/admin/BulkImageUpload";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { DataCard, Money } from "@/components/shared";

/* ─── types ─── */
interface CustomField {
  id?: string;
  field_name: string;
  field_type: string;
  required: boolean;
  min_length: number | null;
  max_length: number | null;
  linked_mode: string;
  sort_order: number;
  options: string[];
}

interface LookupItem { id: string; name: string; sort_order?: number }
interface Carrier extends LookupItem { country_id: string }
interface Provider extends LookupItem { api_url?: string; status: string }

const PRODUCT_TYPES = [
  { value: "digital", label: "Digital", icon: Monitor, description: "Auto-deliver credentials from stock" },
  { value: "imei", label: "IMEI", icon: Smartphone, description: "IMEI unlock services" },
  { value: "manual", label: "Manual", icon: Wrench, description: "Admin fulfills manually" },
  { value: "api", label: "API", icon: Cpu, description: "Auto-fulfill via external API" },
] as const;

type ProductType = typeof PRODUCT_TYPES[number]["value"];

const CATEGORIES = ["All", "VPN", "Editing Tools", "AI Accounts", "IMEI Unlock"] as const;

function calcFinalPrice(providerPrice: number, margin: number): number {
  if (providerPrice <= 0) return 0;
  return Math.round(providerPrice * (1 + margin / 100));
}

/* ─── Undo Toast ─── */
function UndoToast({ id, duration, message, onUndo }: { id: string | number; duration: number; message: string; onUndo: () => void }) {
  const [progress, setProgress] = useState(100);
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [duration]);

  return (
    <div className="w-[356px] rounded-lg border border-border bg-background text-foreground shadow-lg overflow-hidden">
      <div className="flex items-center justify-between gap-2 p-4 pb-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-primary">✓</span>
          <span>{message}</span>
        </div>
        <button onClick={onUndo} className="shrink-0 rounded-md border border-border bg-transparent px-3 py-1 text-xs font-medium hover:bg-muted transition-colors">
          Undo
        </button>
      </div>
      <div className="h-1 w-full bg-muted">
        <div className="h-full bg-primary transition-none" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<"idle" | "compressing" | "uploading">("idle");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descManuallyEdited = useRef(false);
  const titleManuallyEdited = useRef(false);
  const [descMode, setDescMode] = useState<DescriptionMode>("ultra-short");
  const [optimizedMeta, setOptimizedMeta] = useState<{ shortTitle: string; seoSlug: string } | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const manualOverrides = useRef<Set<string>>(new Set());

  // Unified form state
  const [form, setForm] = useState({
    name: "", icon: "box", category: "General", description: "",
    retail_price: "", wholesale_price: "", duration: "", stock: "",
    image_url: "",
    product_type: "digital" as ProductType,
    // IMEI fields
    brand_id: "", country_id: "", carrier_id: "",
    provider_id: "", provider_price: "0", margin_percent: "30",
    processing_time: "1-3 Days",
    fulfillment_mode: "manual", // for IMEI: manual or api
    // Currency
    base_currency: "MMK" as "MMK" | "USD",
    base_price: "",
  });

  // USD rate
  const { data: usdRateSetting } = useQuery({
    queryKey: ["usd-mmk-rate"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("system_settings").select("*").eq("key", "usd_mmk_rate").single();
      return data;
    },
  });
  const usdRate = usdRateSetting?.value ? (usdRateSetting.value as any).rate || 2100 : 2100;
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Lookup queries for IMEI
  const { data: brands = [] } = useQuery<LookupItem[]>({
    queryKey: ["imei-brands"],
    queryFn: async () => {
      const { data } = await supabase.from("imei_brands").select("*").order("sort_order");
      return data || [];
    },
  });
  const { data: countries = [] } = useQuery<LookupItem[]>({
    queryKey: ["imei-countries"],
    queryFn: async () => {
      const { data } = await supabase.from("imei_countries").select("*").order("sort_order");
      return data || [];
    },
  });
  const { data: allCarriers = [] } = useQuery<Carrier[]>({
    queryKey: ["imei-carriers"],
    queryFn: async () => {
      const { data } = await supabase.from("imei_carriers").select("*").order("sort_order");
      return (data || []) as Carrier[];
    },
  });
  const { data: providers = [] } = useQuery<Provider[]>({
    queryKey: ["imei-providers"],
    queryFn: async () => {
      const { data } = await supabase.from("imei_providers").select("*").order("sort_order");
      return (data || []) as Provider[];
    },
  });

  const filteredCarriers = useMemo(() => {
    if (!form.country_id) return [];
    return allCarriers.filter((c) => c.country_id === form.country_id);
  }, [allCarriers, form.country_id]);

  const computedFinalPrice = useMemo(
    () => calcFinalPrice(parseInt(form.provider_price) || 0, parseInt(form.margin_percent) || 0),
    [form.provider_price, form.margin_percent]
  );

  // Reset carrier when country changes
  useEffect(() => {
    if (form.country_id) {
      const valid = filteredCarriers.find((c) => c.id === form.carrier_id);
      if (!valid) setForm((prev) => ({ ...prev, carrier_id: "" }));
    }
  }, [form.country_id, filteredCarriers]);

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const { data: credentialCounts } = useQuery({
    queryKey: ["admin-credential-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("product_credentials").select("product_id, is_sold");
      const counts: Record<string, { available: number; total: number }> = {};
      (data || []).forEach((c: any) => {
        if (!counts[c.product_id]) counts[c.product_id] = { available: 0, total: 0 };
        counts[c.product_id].total++;
        if (!c.is_sold) counts[c.product_id].available++;
      });
      return counts;
    },
  });

  const resetForm = () => {
    setForm({
      name: "", icon: "box", category: "General", description: "",
      retail_price: "", wholesale_price: "", duration: "", stock: "",
      image_url: "", product_type: "digital",
      brand_id: "", country_id: "", carrier_id: "",
      provider_id: "", provider_price: "0", margin_percent: "30",
      processing_time: "1-3 Days", fulfillment_mode: "manual",
      base_currency: "MMK", base_price: "",
    });
    setEditing(null);
    setImagePreview(null);
    setCustomFields([]);
    descManuallyEdited.current = false;
    titleManuallyEdited.current = false;
    setOptimizedMeta(null);
    setAutoFilledFields(new Set());
    manualOverrides.current = new Set();
  };

  const handleOptimizeTitle = (force = false) => {
    if (!force && titleManuallyEdited.current && form.name.trim()) return;
    const raw = form.name.trim();
    if (!raw) { toast.error("Enter a service name first"); return; }
    const result = optimizeTitle(raw);
    setForm((prev) => ({ ...prev, name: result.displayTitle }));
    setOptimizedMeta({ shortTitle: result.shortTitle, seoSlug: result.seoSlug });
    titleManuallyEdited.current = false;
    toast.success("Title optimized");
  };

  const handleAutoBuild = () => {
    const raw = form.name.trim();
    if (!raw) { toast.error("Enter a service name first"); return; }

    const result = autoBuildProduct(raw);
    const filled = new Set<string>();
    const overrides = manualOverrides.current;

    const updates: Partial<typeof form> = {};

    // Title — always apply
    if (!overrides.has("name")) {
      updates.name = result.displayTitle;
      filled.add("name");
    }
    setOptimizedMeta({ shortTitle: result.shortTitle, seoSlug: result.seoSlug });

    // Category
    if (!overrides.has("category") && result.meta.category !== "General") {
      updates.category = result.meta.category;
      filled.add("category");
    }

    // Product type
    if (!overrides.has("product_type")) {
      updates.product_type = result.meta.productType;
      filled.add("product_type");
    }

    // Icon
    if (!overrides.has("icon")) {
      updates.icon = result.meta.icon;
      filled.add("icon");
    }

    // Duration
    if (!overrides.has("duration") && result.meta.duration) {
      updates.duration = result.meta.duration;
      filled.add("duration");
    }

    // Processing time
    if (!overrides.has("processing_time") && result.meta.processingTime) {
      updates.processing_time = result.meta.processingTime;
      filled.add("processing_time");
    }

    setForm((prev) => ({ ...prev, ...updates }));
    setAutoFilledFields(filled);
    titleManuallyEdited.current = false;

    // Auto-generate description after a tick so form state is updated
    setTimeout(() => {
      setForm((prev) => {
        const merged = { ...prev, ...updates };
        const desc = generateProductDescription({
          name: merged.name || "Product",
          category: merged.category,
          productType: merged.product_type,
          duration: merged.duration,
          processingTime: merged.processing_time,
        }, descMode);
        if (!overrides.has("description")) {
          filled.add("description");
          setAutoFilledFields(new Set(filled));
          descManuallyEdited.current = false;
          return { ...merged, description: desc };
        }
        return merged;
      });
    }, 0);

    // Clear highlight after 3 seconds
    setTimeout(() => setAutoFilledFields(new Set()), 3000);

    toast.success(`Auto-filled ${filled.size} fields`, {
      description: result.meta.warranty ? `Warranty detected: ${result.meta.warranty}` : undefined,
    });
  };

  const handleGenerateDescription = (force = false) => {
    if (!force && descManuallyEdited.current && form.description.trim()) return;
    const selectedBrand = brands.find((b) => b.id === form.brand_id);
    const selectedCarrier = allCarriers.find((c) => c.id === form.carrier_id);
    const selectedCountry = countries.find((c) => c.id === form.country_id);
    const desc = generateProductDescription({
      name: form.name || "Product",
      category: form.category,
      productType: form.product_type,
      duration: form.duration,
      processingTime: form.processing_time,
      brand: selectedBrand?.name,
      carrier: selectedCarrier?.name,
      country: selectedCountry?.name,
    }, descMode);
    setForm((prev) => ({ ...prev, description: desc }));
    descManuallyEdited.current = false;
  };

  const loadCustomFields = async (productId: string) => {
    const { data } = await supabase
      .from("product_custom_fields")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true });
    setCustomFields((data || []).map((f: any) => ({
      id: f.id, field_name: f.field_name, field_type: f.field_type,
      required: f.required, min_length: f.min_length, max_length: f.max_length,
      linked_mode: f.linked_mode, sort_order: f.sort_order,
      options: Array.isArray(f.options) ? f.options : [],
    })));
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      name: p.name, icon: p.icon, category: p.category, description: p.description || "",
      retail_price: p.retail_price.toString(), wholesale_price: p.wholesale_price.toString(),
      duration: p.duration, stock: p.stock.toString(), image_url: p.image_url || "",
      product_type: p.product_type || "digital",
      brand_id: p.brand_id || "", country_id: p.country_id || "", carrier_id: p.carrier_id || "",
      provider_id: p.provider_id || "", provider_price: (p.provider_price || 0).toString(),
      margin_percent: (p.margin_percent || 30).toString(),
      processing_time: p.processing_time || "1-3 Days",
      fulfillment_mode: p.fulfillment_mode || "manual",
      base_currency: p.base_currency || "MMK",
      base_price: (p.base_price || 0).toString(),
    });
    setImagePreview(p.image_url || null);
    descManuallyEdited.current = !!(p.description && p.description.trim());
    loadCustomFields(p.id);
    setDialogOpen(true);
  };

  /* ─── Image Upload ─── */
  const compressImage = useCallback((file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Compression failed")), "image/webp", quality);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploading(true); setUploadProgress(0); setUploadStage("compressing");
    const fileName = `${crypto.randomUUID()}.webp`;
    try {
      const progressInterval = setInterval(() => { setUploadProgress((prev) => Math.min(prev + 8, 40)); }, 80);
      const compressed = await compressImage(file);
      clearInterval(progressInterval); setUploadProgress(50); setUploadStage("uploading");
      const uploadInterval = setInterval(() => { setUploadProgress((prev) => Math.min(prev + 5, 90)); }, 100);
      const { error: uploadError } = await supabase.storage.from("product-images").upload(fileName, compressed, { contentType: "image/webp", upsert: true });
      clearInterval(uploadInterval);
      if (uploadError) throw uploadError;
      setUploadProgress(100);
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      setForm((prev) => ({ ...prev, image_url: urlData.publicUrl }));
      setImagePreview(urlData.publicUrl);
      toast.success("Image uploaded");
    } catch (err: any) { toast.error(err.message || "Upload failed"); }
    finally { setUploading(false); setUploadStage("idle"); setUploadProgress(0); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }, [compressImage]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) uploadFile(file); };
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) uploadFile(file); }, [uploadFile]);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const removeImage = () => { setForm((prev) => ({ ...prev, image_url: "" })); setImagePreview(null); };

  /* ─── Save ─── */
  const saveCustomFields = async (productId: string) => {
    await supabase.from("product_custom_fields").delete().eq("product_id", productId);
    if (customFields.length > 0) {
      const rows = customFields.map((f, i) => ({
        product_id: productId, field_name: f.field_name, field_type: f.field_type,
        required: f.required, min_length: f.min_length, max_length: f.max_length,
        linked_mode: f.linked_mode, sort_order: i,
        options: f.field_type === "select" && f.options.length > 0 ? f.options : null,
      }));
      const { error } = await supabase.from("product_custom_fields").insert(rows);
      if (error) toast.error("Failed to save custom fields: " + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pt = form.product_type;
    const isImei = pt === "imei";
    const isDigital = pt === "digital";
    const isApi = pt === "api";

    const selectedBrand = brands.find((b) => b.id === form.brand_id);
    const selectedCountry = countries.find((c) => c.id === form.country_id);
    const selectedCarrier = allCarriers.find((c) => c.id === form.carrier_id);

    const basePriceNum = parseInt(form.base_price) || 0;
    const isUsd = form.base_currency === "USD";

    const payload: any = {
      name: form.name.trim(),
      icon: form.icon,
      category: form.category.trim(),
      description: form.description.trim(),
      duration: form.duration.trim(),
      image_url: form.image_url || null,
      product_type: pt,
      type: isDigital ? "auto" : "manual",
      base_currency: form.base_currency,
      base_price: basePriceNum,
    };

    if (isImei) {
      const fp = computedFinalPrice || parseInt(form.wholesale_price) || 0;
      payload.brand = selectedBrand?.name || "";
      payload.brand_id = form.brand_id || null;
      payload.country = selectedCountry?.name || "All";
      payload.country_id = form.country_id || null;
      payload.carrier = selectedCarrier?.name || "All";
      payload.carrier_id = form.carrier_id || null;
      payload.provider_id = form.fulfillment_mode === "api" ? (form.provider_id || null) : null;
      payload.api_provider = form.fulfillment_mode === "api" ? providers.find((p) => p.id === form.provider_id)?.name || null : null;
      payload.provider_price = parseInt(form.provider_price) || 0;
      payload.margin_percent = parseInt(form.margin_percent) || 0;
      payload.final_price = fp;
      payload.processing_time = form.processing_time;
      // If USD, convert; otherwise use direct price
      if (isUsd && basePriceNum > 0) {
        payload.wholesale_price = Math.round(basePriceNum * usdRate);
        payload.retail_price = Math.round(basePriceNum * usdRate);
      } else {
        payload.wholesale_price = fp;
        payload.retail_price = fp;
      }
      payload.stock = 0;
      payload.fulfillment_modes = form.fulfillment_mode === "api" ? ["api"] : ["manual"];
    } else if (isApi) {
      payload.provider_id = form.provider_id || null;
      payload.api_provider = providers.find((p) => p.id === form.provider_id)?.name || null;
      payload.provider_price = parseInt(form.provider_price) || 0;
      payload.margin_percent = parseInt(form.margin_percent) || 0;
      payload.final_price = computedFinalPrice;
      payload.wholesale_price = computedFinalPrice || parseInt(form.wholesale_price) || 0;
      payload.retail_price = parseInt(form.retail_price) || payload.wholesale_price;
      payload.stock = 0;
      payload.fulfillment_modes = ["api"];
    } else if (pt === "manual") {
      if (isUsd && basePriceNum > 0) {
        payload.wholesale_price = Math.round(basePriceNum * usdRate);
        payload.retail_price = parseInt(form.retail_price) || Math.round(basePriceNum * usdRate);
      } else {
        payload.retail_price = parseInt(form.retail_price);
        payload.wholesale_price = parseInt(form.wholesale_price);
      }
      payload.stock = 0;
      payload.fulfillment_modes = ["manual"];
    } else {
      // digital
      if (isUsd && basePriceNum > 0) {
        payload.wholesale_price = Math.round(basePriceNum * usdRate);
        payload.retail_price = parseInt(form.retail_price) || Math.round(basePriceNum * usdRate);
      } else {
        payload.retail_price = parseInt(form.retail_price);
        payload.wholesale_price = parseInt(form.wholesale_price);
      }
      payload.stock = parseInt(form.stock) || 0;
      payload.fulfillment_modes = ["instant"];
    }

    // Never send product_code — it's auto-generated by the database
    delete payload.product_code;

    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      await saveCustomFields(editing.id);
      toast.success("Product updated");
    } else {
      const { data, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error) {
        if (error.code === "23505") {
          toast.error("A product with this code already exists. Please try again.");
        } else {
          toast.error(error.message);
        }
        return;
      }
      if (data) await saveCustomFields(data.id);
      toast.success("Product created");
    }
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
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

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !products) return;
    const filtered = activeCategory === "All" ? [...products] : products.filter((p: any) => p.category === activeCategory);
    const [moved] = filtered.splice(result.source.index, 1);
    filtered.splice(result.destination.index, 0, moved);
    const updatedProducts = products.map((p: any) => {
      const newIndex = filtered.findIndex((f: any) => f.id === p.id);
      if (newIndex !== -1) return { ...p, sort_order: newIndex };
      return p;
    });
    queryClient.setQueryData(["admin-products"], updatedProducts.sort((a: any, b: any) => a.sort_order - b.sort_order));
    const updates = filtered.map((p: any, i: number) => ({ id: p.id, sort_order: i }));
    for (const u of updates) {
      await supabase.from("products").update({ sort_order: u.sort_order } as any).eq("id", u.id);
    }
  };

  const isImei = form.product_type === "imei";
  const isApi = form.product_type === "api";
  const isManual = form.product_type === "manual";
  const isDigital = form.product_type === "digital";
  const showPricingEngine = isImei || isApi;
  const showStockField = isDigital;
  const showDirectPricing = isDigital || isManual;

  const filteredProducts = (products || []).filter((p: any) => {
    if (activeCategory !== "All" && p.category !== activeCategory) return false;
    if (typeFilter !== "All" && p.product_type !== typeFilter) return false;
    return true;
  });

  const typeBadge = (pt: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      digital: { bg: "bg-primary/10", text: "text-primary", label: "Digital" },
      imei: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", label: "IMEI" },
      manual: { bg: "bg-secondary", text: "text-muted-foreground", label: "Manual" },
      api: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", label: "API" },
    };
    const c = config[pt] || config.digital;
    return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  return (
    <div className="space-y-section">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-h1 text-foreground">Products</h1>
          <p className="text-caption text-muted-foreground">
            Manage all products · {(products || []).length} total
          </p>
        </div>
        <div className="flex gap-2">
          <BulkTierDialog />
          <BulkImageUpload products={(products || []).map((p: any) => ({ id: p.id, name: p.name, icon: p.icon, image_url: p.image_url }))} />
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="btn-glow gap-2"><Plus className="w-4 h-4" />Add Product</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground">{editing ? "Edit" : "New"} Product</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* ── Product Type Selector ── */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Product Type</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {PRODUCT_TYPES.map((pt) => {
                      const Icon = pt.icon;
                      const active = form.product_type === pt.value;
                      return (
                        <button
                          key={pt.value}
                          type="button"
                          onClick={() => {
                            const newType = pt.value as ProductType;
                            if (newType === "imei") {
                              // Auto-configure IMEI defaults
                              setForm((prev) => ({
                                ...prev,
                                product_type: newType,
                                category: prev.category === "General" ? "IMEI Unlock" : prev.category,
                                stock: "0",
                                duration: "",
                                fulfillment_mode: "manual",
                              }));
                              setCustomFields([]);
                            } else {
                              // Restore neutral defaults when switching away from IMEI
                              setForm((prev) => ({
                                ...prev,
                                product_type: newType,
                                // Clear IMEI-specific fields
                                brand_id: "",
                                country_id: "",
                                carrier_id: "",
                                processing_time: "1-3 Days",
                                // Restore defaults
                                stock: newType === "digital" ? prev.stock : "0",
                                category: prev.category === "IMEI Unlock" ? "General" : prev.category,
                              }));
                            }
                          }}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                            active
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border bg-muted/20 text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.5} />
                          <span className="text-xs font-semibold">{pt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {PRODUCT_TYPES.find((pt) => pt.value === form.product_type)?.description}
                  </p>
                </div>

                {/* ── Image Upload ── */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Product Image</Label>
                  {imagePreview ? (
                    <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
                      <img src={imagePreview} alt="Preview" className="w-full aspect-[16/9] object-cover" />
                      <button type="button" onClick={removeImage} className="absolute top-2 right-2 p-1.5 rounded-full bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-destructive border border-border/50 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} disabled={uploading}
                      className={`w-full flex flex-col items-center justify-center gap-2 py-4 rounded-lg border-2 border-dashed bg-muted/30 text-muted-foreground hover:text-foreground transition-all duration-200 ${isDragging ? "border-primary bg-primary/5 text-foreground" : "border-border hover:border-primary/50"}`}>
                      {uploading ? (
                        <div className="w-full px-6 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-foreground font-medium">{uploadStage === "compressing" ? "Compressing…" : "Uploading…"}</span>
                            <span className="text-muted-foreground font-mono">{uploadProgress}%</span>
                          </div>
                          <Progress value={uploadProgress} className="h-1.5" />
                        </div>
                      ) : <Upload className="w-5 h-5" />}
                      {!uploading && <span className="text-xs">{isDragging ? "Drop image here" : "Click or drag image"}</span>}
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>

                {/* ── Auto Build Button ── */}
                <div className="flex gap-2">
                  <Button type="button" onClick={handleAutoBuild} className="flex-1 h-9 gap-2 text-sm font-semibold">
                    <Zap className="w-4 h-4" /> Auto Build
                  </Button>
                  {autoFilledFields.size > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded-md px-2.5 animate-fade-in">
                      <CheckCircle2 className="w-3 h-3" /> {autoFilledFields.size} fields filled
                    </span>
                  )}
                </div>

                {/* ── Common Fields ── */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-muted-foreground text-xs">Name</Label>
                        {autoFilledFields.has("name") && <span className="text-[8px] font-bold text-primary bg-primary/10 rounded px-1 py-px animate-fade-in">AUTO</span>}
                      </div>
                      <Button type="button" variant="ghost" size="sm" className="h-5 text-[9px] gap-1 px-1.5 text-muted-foreground"
                        onClick={() => handleOptimizeTitle(true)}>
                        <Sparkles className="w-2.5 h-2.5" /> Optimize
                      </Button>
                    </div>
                    <Input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); titleManuallyEdited.current = true; setOptimizedMeta(null); manualOverrides.current.add("name"); }} required
                      className={`bg-muted/50 border-border transition-all duration-500 ${autoFilledFields.has("name") ? "ring-1 ring-primary/40" : ""}`} />
                    {optimizedMeta && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5">
                          Short: {optimizedMeta.shortTitle}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5">
                          /{optimizedMeta.seoSlug}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-muted-foreground text-xs">Icon (emoji)</Label>
                      {autoFilledFields.has("icon") && <span className="text-[8px] font-bold text-primary bg-primary/10 rounded px-1 py-px animate-fade-in">AUTO</span>}
                    </div>
                    <Input value={form.icon} onChange={(e) => { setForm({ ...form, icon: e.target.value }); manualOverrides.current.add("icon"); }}
                      className={`bg-muted/50 border-border transition-all duration-500 ${autoFilledFields.has("icon") ? "ring-1 ring-primary/40" : ""}`} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-muted-foreground text-xs">Category</Label>
                      {autoFilledFields.has("category") && <span className="text-[8px] font-bold text-primary bg-primary/10 rounded px-1 py-px animate-fade-in">AUTO</span>}
                    </div>
                    <Input value={form.category} onChange={(e) => { setForm({ ...form, category: e.target.value }); manualOverrides.current.add("category"); }} required
                      className={`bg-muted/50 border-border transition-all duration-500 ${autoFilledFields.has("category") ? "ring-1 ring-primary/40" : ""}`} />
                  </div>
                  {!isImei && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-muted-foreground text-xs">Duration</Label>
                        {autoFilledFields.has("duration") && <span className="text-[8px] font-bold text-primary bg-primary/10 rounded px-1 py-px animate-fade-in">AUTO</span>}
                      </div>
                      <Input value={form.duration} onChange={(e) => { setForm({ ...form, duration: e.target.value }); manualOverrides.current.add("duration"); }} placeholder="1 Month"
                        className={`bg-muted/50 border-border transition-all duration-500 ${autoFilledFields.has("duration") ? "ring-1 ring-primary/40" : ""}`} />
                    </div>
                  )}
                </div>
                {/* ── Delivery Time (always visible) ── */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-muted-foreground text-xs">Delivery Time</Label>
                      {autoFilledFields.has("processing_time") && <span className="text-[8px] font-bold text-primary bg-primary/10 rounded px-1 py-px animate-fade-in">AUTO</span>}
                    </div>
                    <Select value={form.processing_time} onValueChange={(v) => { setForm({ ...form, processing_time: v }); manualOverrides.current.add("processing_time"); }}>
                      <SelectTrigger className={`bg-muted/50 border-border transition-all duration-500 ${autoFilledFields.has("processing_time") ? "ring-1 ring-primary/40" : ""}`}><SelectValue placeholder="Auto-detect or select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Instant">⚡ Instant</SelectItem>
                        <SelectItem value="Instant - 24/7">⚡ Instant - 24/7</SelectItem>
                        <SelectItem value="1-30 Minutes">⏳ 1-30 Minutes</SelectItem>
                        <SelectItem value="1-6 Hours">⏳ 1-6 Hours</SelectItem>
                        <SelectItem value="1-24 Hours">⏳ 1-24 Hours</SelectItem>
                        <SelectItem value="1-3 Days">📅 1-3 Days</SelectItem>
                        <SelectItem value="2-5 Days">📅 2-5 Days</SelectItem>
                        <SelectItem value="3-7 Days">📅 3-7 Days</SelectItem>
                        <SelectItem value="5-15 Days">📅 5-15 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {isImei && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-muted-foreground text-xs">Duration</Label>
                        {autoFilledFields.has("duration") && <span className="text-[8px] font-bold text-primary bg-primary/10 rounded px-1 py-px animate-fade-in">AUTO</span>}
                      </div>
                      <Input value={form.duration} onChange={(e) => { setForm({ ...form, duration: e.target.value }); manualOverrides.current.add("duration"); }} placeholder="Auto-detect"
                        className={`bg-muted/50 border-border transition-all duration-500 ${autoFilledFields.has("duration") ? "ring-1 ring-primary/40" : ""}`} />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-muted-foreground text-xs">Description</Label>
                      {autoFilledFields.has("description") && <span className="text-[8px] font-bold text-primary bg-primary/10 rounded px-1 py-px animate-fade-in">AUTO</span>}
                    </div>
                    <div className="flex gap-1">
                      {!form.description.trim() && (
                        <Button type="button" variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2"
                          onClick={() => handleGenerateDescription(true)}>
                          <FileText className="w-3 h-3" /> Generate
                        </Button>
                      )}
                      {form.description.trim() && (
                        <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 text-muted-foreground"
                          onClick={() => handleGenerateDescription(true)}>
                          <RotateCcw className="w-3 h-3" /> Regenerate
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* Mode Selector */}
                  <div className="flex gap-1 rounded-lg bg-muted/50 p-0.5 border border-border">
                    {([
                      { value: "ultra-short" as DescriptionMode, label: "Ultra Short" },
                      { value: "standard" as DescriptionMode, label: "Standard" },
                      { value: "seo-full" as DescriptionMode, label: "SEO Full" },
                    ]).map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => { setDescMode(m.value); if (form.description.trim() && form.name.trim()) { const selectedBrand = brands.find((b) => b.id === form.brand_id); const selectedCarrier = allCarriers.find((c) => c.id === form.carrier_id); const selectedCountry = countries.find((c) => c.id === form.country_id); const desc = generateProductDescription({ name: form.name, category: form.category, productType: form.product_type, duration: form.duration, processingTime: form.processing_time || undefined, brand: selectedBrand?.name, carrier: selectedCarrier?.name, country: selectedCountry?.name }, m.value); setForm((prev) => ({ ...prev, description: desc })); descManuallyEdited.current = false; } }}
                        className={`flex-1 text-[10px] font-semibold py-1 rounded-md transition-all ${
                          descMode === m.value
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <Textarea value={form.description} onChange={(e) => { setForm({ ...form, description: e.target.value }); descManuallyEdited.current = true; manualOverrides.current.add("description"); }} placeholder="Enter service name and click Auto Build" className={`bg-muted/50 border-border resize-none text-xs font-mono transition-all duration-500 ${autoFilledFields.has("description") ? "ring-1 ring-primary/40" : ""}`} rows={descMode === "ultra-short" ? 6 : 10} maxLength={3000} />
                  <p className="text-[10px] text-muted-foreground">{form.description.length}/3000 — {descMode === "ultra-short" ? "5-line compressed" : descMode === "standard" ? "7-section structured" : "SEO-optimized extended"}</p>
                </div>

                {/* ── IMEI Auto-Configured Banner ── */}
                {isImei && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs font-semibold text-primary">Order Settings Auto-Configured</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-muted-foreground pl-6">
                      <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" /> Require IMEI</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/40" /> Require Username</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/40" /> Require Comments</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/40" /> Require Quantity</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/40" /> Image Upload</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/40" /> Download Settings</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/40" /> Stock Management</span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" /> Active
                      </span>
                    </div>
                  </div>
                )}

                {/* ── IMEI-Specific Fields ── */}
                {isImei && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-amber-500" /> IMEI Configuration
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-[10px]">Brand</Label>
                          <Select value={form.brand_id} onValueChange={(v) => setForm({ ...form, brand_id: v })}>
                            <SelectTrigger className="bg-muted/50 border-border"><SelectValue placeholder="Select brand" /></SelectTrigger>
                            <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-[10px]">Country</Label>
                          <Select value={form.country_id} onValueChange={(v) => setForm({ ...form, country_id: v })}>
                            <SelectTrigger className="bg-muted/50 border-border"><SelectValue placeholder="Select country" /></SelectTrigger>
                            <SelectContent>{countries.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-[10px]">Carrier</Label>
                          <Select value={form.carrier_id} onValueChange={(v) => setForm({ ...form, carrier_id: v })} disabled={!form.country_id}>
                            <SelectTrigger className="bg-muted/50 border-border"><SelectValue placeholder={form.country_id ? "Select carrier" : "Select country first"} /></SelectTrigger>
                            <SelectContent>{filteredCarriers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-[10px]">Processing Time</Label>
                          <Select value={form.processing_time} onValueChange={(v) => setForm({ ...form, processing_time: v })}>
                            <SelectTrigger className="bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Instant">Instant</SelectItem>
                              <SelectItem value="1-30 Minutes">1-30 Minutes</SelectItem>
                              <SelectItem value="1-3 Hours">1-3 Hours</SelectItem>
                              <SelectItem value="1-3 Days">1-3 Days</SelectItem>
                              <SelectItem value="2-5 Days">2-5 Days</SelectItem>
                              <SelectItem value="3-7 Days">3-7 Days</SelectItem>
                              <SelectItem value="5-15 Days">5-15 Days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-[10px]">Fulfillment Mode</Label>
                        <Select value={form.fulfillment_mode} onValueChange={(v) => setForm({ ...form, fulfillment_mode: v })}>
                          <SelectTrigger className="bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="api">API</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {form.fulfillment_mode === "api" && (
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-[10px]">API Provider</Label>
                          <Select value={form.provider_id} onValueChange={(v) => setForm({ ...form, provider_id: v })}>
                            <SelectTrigger className="bg-muted/50 border-border"><SelectValue placeholder="Select provider" /></SelectTrigger>
                            <SelectContent>{providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ── API Provider (for API type) ── */}
                {isApi && !isImei && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-emerald-500" /> API Configuration
                      </Label>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-[10px]">API Provider</Label>
                        <Select value={form.provider_id} onValueChange={(v) => setForm({ ...form, provider_id: v })}>
                          <SelectTrigger className="bg-muted/50 border-border"><SelectValue placeholder="Select provider" /></SelectTrigger>
                          <SelectContent>{providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {/* ── Pricing Engine (IMEI & API) ── */}
                {showPricingEngine && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-foreground">Pricing Engine</Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-[10px]">Provider Cost</Label>
                          <Input type="number" value={form.provider_price} onChange={(e) => setForm({ ...form, provider_price: e.target.value })} className="bg-muted/50 border-border font-mono" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-[10px]">Margin %</Label>
                          <Input type="number" value={form.margin_percent} onChange={(e) => setForm({ ...form, margin_percent: e.target.value })} className="bg-muted/50 border-border font-mono" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-[10px]">Final Price</Label>
                          <div className="h-10 rounded-md border border-border bg-muted/30 flex items-center px-3">
                            <Money amount={computedFinalPrice} className="text-sm" />
                          </div>
                        </div>
                      </div>
                      {computedFinalPrice <= 0 && (
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-[10px]">Manual Price (if no provider cost)</Label>
                          <Input type="number" value={form.wholesale_price} onChange={(e) => setForm({ ...form, wholesale_price: e.target.value })} className="bg-muted/50 border-border font-mono" placeholder="Set price manually" />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ── Base Currency Selector ── */}
                {showDirectPricing && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Base Currency</Label>
                    <div className="flex gap-2">
                      {(["MMK", "USD"] as const).map((cur) => (
                        <button
                          key={cur}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, base_currency: cur }))}
                          className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                            form.base_currency === cur
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border bg-muted/20 text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          {cur === "USD" ? "💵 USD" : "🇲🇲 MMK"}
                        </button>
                      ))}
                    </div>
                    {form.base_currency === "USD" && (
                      <p className="text-[10px] text-muted-foreground">
                        Prices auto-convert at <span className="font-mono font-semibold text-foreground">{usdRate.toLocaleString()}</span> MMK/USD
                      </p>
                    )}
                  </div>
                )}

                {/* ── Direct Pricing (Digital & Manual) ── */}
                {showDirectPricing && form.base_currency === "MMK" && (
                  <div className={`grid ${showStockField ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Retail Price</Label>
                      <Input type="number" value={form.retail_price} onChange={(e) => setForm({ ...form, retail_price: e.target.value })} required className="bg-muted/50 border-border font-mono" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Wholesale</Label>
                      <Input type="number" value={form.wholesale_price} onChange={(e) => setForm({ ...form, wholesale_price: e.target.value })} required className="bg-muted/50 border-border font-mono" />
                    </div>
                    {showStockField && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Stock</Label>
                        <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required className="bg-muted/50 border-border font-mono" />
                      </div>
                    )}
                  </div>
                )}

                {/* ── USD Base Price ── */}
                {showDirectPricing && form.base_currency === "USD" && (
                  <div className="space-y-3">
                    <div className={`grid ${showStockField ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Base Price (USD)</Label>
                        <Input type="number" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} required className="bg-muted/50 border-border font-mono" placeholder="e.g. 5" step="0.01" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Retail Price (MMK)</Label>
                        <Input type="number" value={form.retail_price} onChange={(e) => setForm({ ...form, retail_price: e.target.value })} className="bg-muted/50 border-border font-mono" placeholder="Optional override" />
                      </div>
                      {showStockField && (
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Stock</Label>
                          <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required className="bg-muted/50 border-border font-mono" />
                        </div>
                      )}
                    </div>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Calculated wholesale:</span>
                      <span className="font-mono font-bold text-foreground">
                        {((parseInt(form.base_price) || 0) * usdRate).toLocaleString()} MMK
                      </span>
                    </div>
                  </div>
                )}

                {/* ── Custom Fields (Manual type) ── */}
                {isManual && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground text-xs font-medium">Custom Fields</Label>
                        <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1"
                          onClick={() => setCustomFields([...customFields, { field_name: "", field_type: "text", required: true, min_length: null, max_length: null, linked_mode: "manual", sort_order: customFields.length, options: [] }])}>
                          <Plus className="w-3 h-3" /> Add Field
                        </Button>
                      </div>
                      {customFields.length === 0 && (
                        <p className="text-xs text-muted-foreground/60 text-center py-3 border border-dashed border-border rounded-lg">No custom fields configured</p>
                      )}
                      {customFields.map((field, idx) => (
                        <div key={idx} className="space-y-2 p-3 rounded-lg border border-border bg-muted/20">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Field {idx + 1}</span>
                            <button type="button" onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-muted-foreground text-[10px]">Field Name</Label>
                              <Input value={field.field_name} onChange={(e) => { const u = [...customFields]; u[idx] = { ...u[idx], field_name: e.target.value }; setCustomFields(u); }} placeholder="e.g. Username" className="bg-muted/50 border-border h-8 text-xs" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-muted-foreground text-[10px]">Field Type</Label>
                              <Select value={field.field_type} onValueChange={(val) => { const u = [...customFields]; u[idx] = { ...u[idx], field_type: val }; setCustomFields(u); }}>
                                <SelectTrigger className="bg-muted/50 border-border h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="select">Select</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={field.required} onCheckedChange={(checked) => { const u = [...customFields]; u[idx] = { ...u[idx], required: checked }; setCustomFields(u); }} className="scale-75" />
                            <Label className="text-muted-foreground text-[10px]">Required</Label>
                          </div>
                          {field.field_type === "select" && (
                            <div className="space-y-1.5 pt-1 border-t border-border/50">
                              <div className="flex items-center justify-between">
                                <Label className="text-muted-foreground text-[10px]">Dropdown Options</Label>
                                <Button type="button" variant="ghost" size="sm" className="h-5 text-[10px] px-1.5 gap-0.5"
                                  onClick={() => { const u = [...customFields]; u[idx] = { ...u[idx], options: [...u[idx].options, ""] }; setCustomFields(u); }}>
                                  <Plus className="w-2.5 h-2.5" /> Add
                                </Button>
                              </div>
                              {field.options.map((opt, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-1.5">
                                  <Input value={opt} onChange={(e) => { const u = [...customFields]; const opts = [...u[idx].options]; opts[optIdx] = e.target.value; u[idx] = { ...u[idx], options: opts }; setCustomFields(u); }}
                                    placeholder={`Option ${optIdx + 1}`} className="bg-muted/50 border-border h-7 text-xs flex-1" />
                                  <button type="button" onClick={() => { const u = [...customFields]; u[idx] = { ...u[idx], options: u[idx].options.filter((_, i) => i !== optIdx) }; setCustomFields(u); }}
                                    className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"><X className="w-3 h-3" /></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <Button type="submit" className="w-full btn-glow">{editing ? "Update" : "Create"} Product</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex gap-2 animate-fade-in items-center flex-wrap">
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`filter-pill ${activeCategory === cat ? "filter-pill-active" : "filter-pill-inactive"}`}>{cat}</button>
        ))}
        <div className="h-4 w-px bg-border mx-1" />
        {["All", ...PRODUCT_TYPES.map((pt) => pt.value)].map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`filter-pill ${typeFilter === t ? "filter-pill-active" : "filter-pill-inactive"}`}>
            {t === "All" ? "All Types" : PRODUCT_TYPES.find((pt) => pt.value === t)?.label || t}
          </button>
        ))}
        <Button variant="outline" size="sm" className="ml-auto gap-1.5 text-xs"
          onClick={async () => {
            if (!products || !confirm("Reset product order to alphabetical?")) return;
            const previousOrder = products.map((p: any) => ({ id: p.id, sort_order: p.sort_order }));
            const sorted = [...products].sort((a: any, b: any) => a.name.localeCompare(b.name));
            const updated = sorted.map((p: any, i: number) => ({ ...p, sort_order: i }));
            queryClient.setQueryData(["admin-products"], updated);
            for (const p of updated) { await supabase.from("products").update({ sort_order: p.sort_order } as any).eq("id", p.id); }
            queryClient.invalidateQueries({ queryKey: ["products"] });
            const DURATION = 10000;
            toast.custom((id) => (
              <UndoToast id={id} duration={DURATION} message={`Order reset — ${updated.length} products reordered`}
                onUndo={async () => {
                  toast.dismiss(id);
                  for (const p of previousOrder) { await supabase.from("products").update({ sort_order: p.sort_order } as any).eq("id", p.id); }
                  queryClient.invalidateQueries({ queryKey: ["admin-products"] });
                  queryClient.invalidateQueries({ queryKey: ["products"] });
                  toast.success("Order restored");
                }} />
            ), { duration: DURATION });
          }}>
          <RotateCcw className="w-3.5 h-3.5" /> Reset Order
        </Button>
      </div>

      {/* ── Product Table ── */}
      <DataCard noPadding className="animate-fade-in">
        <div className="overflow-x-auto">
          <DragDropContext onDragEnd={handleDragEnd}>
            <table className="premium-table">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-10 p-4"></th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Code</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Product</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Type</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Category</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-4">Price</th>
                  <th className="text-center text-xs font-medium text-muted-foreground p-4">Stock</th>
                  <th className="text-center text-xs font-medium text-muted-foreground p-4">Credentials</th>
                  <th className="text-center text-xs font-medium text-muted-foreground p-4">Actions</th>
                </tr>
              </thead>
              <Droppable droppableId="products">
                {(provided) => (
                  <tbody ref={provided.innerRef} {...provided.droppableProps}>
                    {filteredProducts.map((p: any, index: number) => {
                      const cc = credentialCounts?.[p.id];
                      const pt = p.product_type || "digital";
                      return (
                        <Draggable key={p.id} draggableId={p.id} index={index}>
                          {(provided, snapshot) => (
                            <tr ref={provided.innerRef} {...provided.draggableProps}
                              className={`border-b border-border/50 transition-colors ${snapshot.isDragging ? "bg-muted/60 shadow-lg" : "hover:bg-muted/30"}`}>
                              <td className="p-4" {...provided.dragHandleProps}>
                                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                              </td>
                              <td className="p-4">
                                <span className="text-[10px] font-mono text-muted-foreground">{p.product_code || '—'}</span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  {p.image_url ? (
                                    <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover border border-border/50" />
                                  ) : (
                                    <span className="text-lg">{p.icon}</span>
                                  )}
                                  <div>
                                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                                    {pt === "imei" && p.brand && (
                                      <p className="text-[10px] text-muted-foreground">{p.brand} · {p.country || "All"}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-1.5">
                                  {typeBadge(pt)}
                                  {p.base_currency === "USD" && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">USD</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-sm text-muted-foreground">{p.category}</td>
                              <td className="p-4 text-sm text-right">
                                <div>
                                  <Money amount={p.wholesale_price} />
                                  {p.base_currency === "USD" && p.base_price > 0 && (
                                    <div className="text-[10px] text-muted-foreground">${p.base_price}</div>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-sm font-mono text-center text-foreground">
                                {pt === "digital" ? p.stock : <span className="text-xs text-muted-foreground italic">—</span>}
                              </td>
                              <td className="p-4 text-center">
                                {pt === "digital" ? (
                                  <span className={`text-xs font-mono px-2 py-1 rounded-full ${cc && cc.available > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                                    {cc ? `${cc.available}/${cc.total}` : "0/0"}
                                  </span>
                                ) : <span className="text-xs text-muted-foreground italic">—</span>}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-center gap-2">
                                  {pt === "digital" && (
                                    <Link to={`/admin/credentials?product=${p.id}`} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="View credentials">
                                      <KeyRound className="w-4 h-4" />
                                    </Link>
                                  )}
                                  <PricingTiersDialog productId={p.id} productName={`${p.name} ${p.duration || ""}`} />
                                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </tbody>
                )}
              </Droppable>
            </table>
          </DragDropContext>
        </div>
      </DataCard>
    </div>
  );
}
