import { useState, useRef, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { sanitizeName } from "@/lib/sanitize-name";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv } from "@/lib/csv-export";
import ProductNameGenerator from "@/components/admin/ProductNameGenerator";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import ConfirmModal from "@/components/shared/ConfirmModal";
import { Plus, Pencil, Trash2, KeyRound, Upload, X, GripVertical, RotateCcw, Smartphone, Monitor, Wrench, Cpu, CheckCircle2, FileText, Sparkles, Zap, Loader2, Search, RefreshCw, Eye, EyeOff, Copy, ClipboardPaste, TrendingUp, Percent, AlertTriangle, MoreHorizontal, Layers, Package, Download, Files } from "lucide-react";
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
import StructuredDescription from "@/components/products/StructuredDescription";

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
  placeholder: string;
  validation_rule: string;
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

const STATIC_CATEGORIES = ["VPN", "Editing Tools", "AI Accounts", "IMEI Unlock"];

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
  const [visibilityFilter, setVisibilityFilter] = useState<string>("All");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkToggling, setBulkToggling] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);
  const [bulkPricePercent, setBulkPricePercent] = useState("10");
  const [bulkPriceDirection, setBulkPriceDirection] = useState<"increase" | "decrease">("increase");
  const [bulkPriceCategory, setBulkPriceCategory] = useState("All");
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
  const [aiGenerating, setAiGenerating] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const initialFormRef = useRef<string>("");
  const [bulkRefreshing, setBulkRefreshing] = useState(false);
  const [bulkRefreshProgress, setBulkRefreshProgress] = useState({ current: 0, total: 0 });
  const [showDescPreview, setShowDescPreview] = useState(false);

  const FORM_STORAGE_KEY = "admin-product-form-draft";

  const defaultForm = {
    name: "", icon: "box", category: "General", description: "",
    retail_price: "", wholesale_price: "", duration: "", stock: "",
    image_url: "",
    product_type: "digital" as ProductType,
    brand_id: "", country_id: "", carrier_id: "",
    provider_id: "", provider_price: "0", margin_percent: "30",
    processing_time: "1-3 Days",
    fulfillment_mode: "manual",
    base_currency: "MMK" as "MMK" | "USD",
    base_price: "",
    api_service_id: "",
    api_min_quantity: "1",
    api_max_quantity: "",
  };

  // Restore draft from localStorage on mount
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(FORM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultForm, ...parsed };
      }
    } catch {}
    return defaultForm;
  });

  // Persist form draft to localStorage
  useEffect(() => {
    if (dialogOpen) {
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(form));
    }
  }, [form, dialogOpen]);

  const isFormDirty = useCallback(() => {
    return JSON.stringify(form) !== initialFormRef.current;
  }, [form]);

  const handleDialogClose = useCallback(() => {
    if (isFormDirty()) {
      setConfirmCloseOpen(true);
    } else {
      setDialogOpen(false);
      resetForm();
    }
  }, [isFormDirty]);

  const confirmClose = useCallback(() => {
    setConfirmCloseOpen(false);
    setDialogOpen(false);
    resetForm();
    localStorage.removeItem(FORM_STORAGE_KEY);
  }, []);

  // API service fetching state
  const [apiServices, setApiServices] = useState<any[]>([]);
  const [apiServicesLoading, setApiServicesLoading] = useState(false);
  const [apiServiceSearch, setApiServiceSearch] = useState("");
  const [apiServicesError, setApiServicesError] = useState<string | null>(null);

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
    const fresh = { ...defaultForm };
    setForm(fresh);
    setEditing(null);
    setImagePreview(null);
    setCustomFields([]);
    descManuallyEdited.current = false;
    titleManuallyEdited.current = false;
    setOptimizedMeta(null);
    setAutoFilledFields(new Set());
    manualOverrides.current = new Set();
    setApiServices([]);
    setApiServiceSearch("");
    setApiServicesError(null);
    localStorage.removeItem(FORM_STORAGE_KEY);
    initialFormRef.current = JSON.stringify(fresh);
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

  const handleAutoBuild = async () => {
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

    // AI-powered description generation
    if (!overrides.has("description")) {
      setAiGenerating(true);
      const merged = { ...form, ...updates };
      try {
        const { data, error } = await supabase.functions.invoke("ai-product-build", {
          body: {
            service_name: merged.name || raw,
            mode: descMode,
            category: merged.category,
            product_type: merged.product_type,
            duration: merged.duration,
            processing_time: merged.processing_time,
          },
        });
        if (!error && data?.description) {
          setForm((prev) => ({ ...prev, ...updates, description: data.description }));
          filled.add("description");
          descManuallyEdited.current = false;
        } else {
          // Fallback to template-based generation
          const desc = generateProductDescription({
            name: merged.name || "Product",
            category: merged.category,
            productType: merged.product_type,
            duration: merged.duration,
            processingTime: merged.processing_time,
          }, descMode);
          setForm((prev) => ({ ...prev, ...updates, description: desc }));
          filled.add("description");
          descManuallyEdited.current = false;
        }
      } catch {
        // Fallback to template
        const merged2 = { ...form, ...updates };
        const desc = generateProductDescription({
          name: merged2.name || "Product",
          category: merged2.category,
          productType: merged2.product_type,
          duration: merged2.duration,
          processingTime: merged2.processing_time,
        }, descMode);
        setForm((prev) => ({ ...prev, ...updates, description: desc }));
        filled.add("description");
        descManuallyEdited.current = false;
      } finally {
        setAiGenerating(false);
      }
    }

    setAutoFilledFields(new Set(filled));
    // Clear highlight after 3 seconds
    setTimeout(() => setAutoFilledFields(new Set()), 3000);

    toast.success(`Auto-filled ${filled.size} fields`, {
      description: result.meta.warranty ? `Warranty detected: ${result.meta.warranty}` : undefined,
    });
  };

  const handleGenerateDescription = async (force = false) => {
    if (!force && descManuallyEdited.current && form.description.trim()) return;
    const serviceName = form.name.trim();
    if (!serviceName) { toast.error("Enter a service name first"); return; }

    // Always try AI first
    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-product-build", {
        body: {
          service_name: serviceName,
          mode: descMode,
          category: form.category,
          product_type: form.product_type,
          duration: form.duration,
          processing_time: form.processing_time,
        },
      });
      if (!error && data?.description) {
        setForm((prev) => ({ ...prev, description: data.description }));
        descManuallyEdited.current = false;
        toast.success("AI description generated");
        return;
      }
    } catch {}
    finally { setAiGenerating(false); }

    // Fallback to template
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
      placeholder: f.placeholder || "",
      validation_rule: f.validation_rule || "",
    })));
  };

  const fetchApiServices = async (providerId: string) => {
    if (!providerId) return;
    setApiServicesLoading(true);
    setApiServicesError(null);
    setApiServices([]);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-provider-services", {
        body: { provider_id: providerId },
      });
      if (error) throw error;
      if (data?.error) {
        setApiServicesError(data.error);
        return;
      }
      setApiServices(data?.services || []);
    } catch (err: any) {
      setApiServicesError(err.message || "Failed to fetch services");
    } finally {
      setApiServicesLoading(false);
    }
  };

  /** Detect which custom fields an API service needs based on name/type/category */
  const detectRequiredFields = (service: any): CustomField[] => {
    const name = (service.name || "").toLowerCase();
    const cat = (service.category || "").toLowerCase();
    const type = (service.type || "").toLowerCase();
    const text = `${name} ${cat} ${type}`;
    const fields: CustomField[] = [];
    let order = 0;

    // Link/URL detection — most SMM services need a link
    const needsLink = /follow|like|view|share|react|retweet|repost|subscriber|watch|visit|traffic|comment|save|impression|reach|engagement|stream|play|pin|vote|poll|click/i.test(text)
      || /default|custom comments/i.test(type);
    if (needsLink) {
      fields.push({
        field_name: "Link", field_type: "text", required: true,
        min_length: 5, max_length: 500, linked_mode: "api", sort_order: order++,
        options: [], placeholder: "https://example.com/post/123", validation_rule: "url",
      });
    }

    // Username detection
    const needsUsername = /username|mention|dm|direct message|power|member|add.*group/i.test(text)
      && !needsLink;
    if (needsUsername) {
      fields.push({
        field_name: "Username", field_type: "text", required: true,
        min_length: 1, max_length: 200, linked_mode: "api", sort_order: order++,
        options: [], placeholder: "@username", validation_rule: "",
      });
    }

    // Comments/text detection
    const needsComments = /comment|review|testimonial|custom comment/i.test(text);
    if (needsComments) {
      fields.push({
        field_name: "Comments", field_type: "textarea", required: true,
        min_length: 1, max_length: 5000, linked_mode: "api", sort_order: order++,
        options: [], placeholder: "Enter comments (one per line for multiple)", validation_rule: "",
      });
    }

    // Quantity — always added for API services
    const minQty = parseInt(service.min) || 1;
    const maxQty = parseInt(service.max) || 10000;
    fields.push({
      field_name: "Quantity", field_type: "number", required: true,
      min_length: minQty, max_length: maxQty,
      linked_mode: "api", sort_order: order++, options: [],
      placeholder: `Min ${minQty} — Max ${maxQty}`, validation_rule: "",
    });

    return fields;
  };

  const handleSelectService = (service: any) => {
    const usdToMmk = usdRate || 2100;
    const providerCostMmk = Math.round((service.rate || 0) * usdToMmk);
    
    setForm((prev) => ({
      ...prev,
      api_service_id: service.service_id,
      name: prev.name || service.name,
      provider_price: providerCostMmk.toString(),
      processing_time: service.type === "Default" ? "Instant" : "1-30 Minutes",
      duration: "",
      api_min_quantity: String(parseInt(service.min) || 1),
      api_max_quantity: String(parseInt(service.max) || 10000),
    }));

    // Auto-detect required fields from service name/type
    const detectedFields = detectRequiredFields(service);

    // Replace existing api-linked fields, keep others
    setCustomFields((prev) => {
      const nonApi = prev.filter((f) => f.linked_mode !== "api");
      return [...nonApi, ...detectedFields];
    });

    const fieldNames = detectedFields.map((f) => f.field_name).join(", ");
    setAutoFilledFields(new Set(["api_service_id", "provider_price", "processing_time", "custom_fields"]));
    setTimeout(() => setAutoFilledFields(new Set()), 3000);
    toast.success(`Service #${service.service_id} selected`, {
      description: `Auto-added fields: ${fieldNames}`,
    });
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
      api_service_id: p.api_service_id || "",
      api_min_quantity: (p.api_min_quantity || 1).toString(),
      api_max_quantity: (p.api_max_quantity || "").toString(),
    });
    const editForm = {
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
      api_service_id: p.api_service_id || "",
      api_min_quantity: (p.api_min_quantity || 1).toString(),
      api_max_quantity: (p.api_max_quantity || "").toString(),
    };
    initialFormRef.current = JSON.stringify(editForm);
    setImagePreview(p.image_url || null);
    descManuallyEdited.current = !!(p.description && p.description.trim());
    loadCustomFields(p.id);
    setApiServices([]);
    setApiServiceSearch("");
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
        placeholder: f.placeholder || "",
        validation_rule: f.validation_rule || "",
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
      payload.api_service_id = form.api_service_id || null;
      payload.api_min_quantity = parseInt(form.api_min_quantity) || 1;
      payload.api_max_quantity = parseInt(form.api_max_quantity) || null;
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
      // Allow display_id override
      if (editing.display_id && typeof editing.display_id === 'number') {
        payload.display_id = editing.display_id;
      }
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
    localStorage.removeItem(FORM_STORAGE_KEY);
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

  // Dynamic categories from actual product data
  const dynamicCategories = useMemo(() => {
    const cats = new Set<string>();
    (products || []).forEach((p: any) => { if (p.category) cats.add(p.category); });
    STATIC_CATEGORIES.forEach((c) => cats.add(c));
    return ["All", ...Array.from(cats).sort()];
  }, [products]);

  const filteredProducts = (products || []).filter((p: any) => {
    if (activeCategory !== "All" && p.category !== activeCategory) return false;
    if (typeFilter !== "All" && p.product_type !== typeFilter) return false;
    if (visibilityFilter === "Active" && p.type === "disabled") return false;
    if (visibilityFilter === "Disabled" && p.type !== "disabled") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchId = String(p.display_id).includes(q);
      const matchCategory = p.category?.toLowerCase().includes(q);
      const matchCode = p.product_code?.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchCategory && !matchCode) return false;
    }
    return true;
  });

  
  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  
  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, activeCategory, typeFilter, visibilityFilter]);

  const selectedCount = selectedIds.size;
  const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every((p: any) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map((p: any) => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkToggleType = async (newType: "auto" | "disabled") => {
    if (selectedCount === 0) return;
    setBulkToggling(true);
    try {
      const ids = Array.from(selectedIds);
      // Batch in chunks of 50 to avoid PostgREST URL length limits (400 Bad Request)
      const CHUNK = 50;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const { error } = await supabase
          .from("products")
          .update({ type: newType })
          .in("id", chunk);
        if (error) throw new Error(error.message || error.details || "Database update failed");
      }
      toast.success(`${ids.length} products ${newType === "auto" ? "enabled (visible)" : "disabled (hidden)"}`);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setSelectedIds(new Set());
    } catch (err: any) {
      console.error("Bulk toggle error:", err);
      toast.error(`Failed to update products: ${err.message || "Unknown error. Please try fewer products at once."}`);
    } finally {
      setBulkToggling(false);
    }
  };

  const handleSingleToggleType = async (productId: string, currentType: string) => {
    const newType = currentType === "disabled" ? "auto" : "disabled";
    try {
      const { error } = await supabase
        .from("products")
        .update({ type: newType })
        .eq("id", productId);
      if (error) throw new Error(error.message || error.details || "Database update failed");
      toast.success(`Product ${newType === "auto" ? "enabled (visible)" : "disabled (hidden)"}`);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      console.error("Toggle error:", err);
      toast.error(`Failed to toggle product: ${err.message || "Unknown error"}`);
    }
  };

  /** Strip all emojis from a string */
  const stripEmojis = (text: string): string => {
    return text
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F000}-\u{1FFFF}\u{200D}\u{20E3}\u{FE0F}\u{E0020}-\u{E007F}]/gu, "")
      .replace(/[✅⚠️🚀⭐🔥💡📦🔒🛡️⚡🌐📱💻🎬🔑📋✨⏱️📝💼🔍]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  /** Bulk clean emojis from all product descriptions */
  const handleBulkRefreshDescriptions = async () => {
    if (!products || products.length === 0) return;
    const dirty = products.filter((p: any) => {
      const desc = p.description || "";
      return desc !== stripEmojis(desc);
    });
    if (dirty.length === 0) {
      toast.success("All descriptions are already clean — no emojis found");
      return;
    }
    if (!confirm(`This will clean emojis from ${dirty.length} product description(s). Continue?`)) return;

    setBulkRefreshing(true);
    setBulkRefreshProgress({ current: 0, total: dirty.length });
    let cleaned = 0;
    let failed = 0;

    const CHUNK = 10;
    for (let i = 0; i < dirty.length; i += CHUNK) {
      const chunk = dirty.slice(i, i + CHUNK);
      const promises = chunk.map(async (p: any) => {
        const cleanDesc = stripEmojis(p.description || "");
        const cleanName = stripEmojis(p.name || "");
        const { error } = await supabase
          .from("products")
          .update({ description: cleanDesc, name: cleanName })
          .eq("id", p.id);
        if (error) { failed++; } else { cleaned++; }
      });
      await Promise.all(promises);
      setBulkRefreshProgress({ current: Math.min(i + CHUNK, dirty.length), total: dirty.length });
    }

    setBulkRefreshing(false);
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast.success(`Cleaned ${cleaned} descriptions${failed > 0 ? `, ${failed} failed` : ""}`);
  };

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
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
            <Package className="w-5 h-5 text-primary" />
            Products
          </h1>
          <p className="text-caption text-muted-foreground mt-1">
            {(products || []).length} total · {filteredProducts.length} showing
            {totalPages > 1 && ` · Page ${currentPage}/${totalPages}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9">
                <Wrench className="w-3.5 h-3.5" /> Tools
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleBulkRefreshDescriptions} disabled={bulkRefreshing}>
                {bulkRefreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
                {bulkRefreshing ? `Cleaning ${bulkRefreshProgress.current}/${bulkRefreshProgress.total}…` : "Clean All Emojis"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBulkPriceOpen(true)}>
                <Percent className="w-3.5 h-3.5 mr-2" /> Adjust Prices
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
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
                <RotateCcw className="w-3.5 h-3.5 mr-2" /> Reset Order
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <BulkTierDialog />
          <BulkImageUpload products={(products || []).map((p: any) => ({ id: p.id, name: p.name, icon: p.icon, image_url: p.image_url }))} />
          <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) { handleDialogClose(); return; } setDialogOpen(v); initialFormRef.current = JSON.stringify(form); }}>
            <DialogTrigger asChild>
              <Button size="default" className="gap-2 h-10 px-5 text-sm font-semibold" onClick={() => { resetForm(); initialFormRef.current = JSON.stringify(defaultForm); }}>
                <Plus className="w-4 h-4" />Add Product
              </Button>
            </DialogTrigger>
            <DialogContent
              className="bg-card border-border max-w-lg max-h-[90vh] flex flex-col p-0"
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => { e.preventDefault(); handleDialogClose(); }}
            >
              <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                <DialogTitle className="text-foreground">{editing ? "Edit" : "New"} Product</DialogTitle>
                {/* Display ID preview */}
                {editing?.display_id && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ID: <span className="font-mono font-bold text-primary">#{editing.display_id}</span>
                  </p>
                )}
                {!editing && (
                  <p className="text-[10px] text-muted-foreground/60 mt-1">A unique numeric ID will be auto-assigned</p>
                )}
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">

                {/* ── Display ID Override (edit mode) ── */}
                {editing && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Display ID (override)</Label>
                    <Input
                      type="number"
                      value={editing.display_id || ""}
                      onChange={(e) => setEditing({ ...editing, display_id: parseInt(e.target.value) || "" })}
                      placeholder="Auto-generated"
                      className="bg-muted/50 border-border font-mono w-32"
                    />
                    <p className="text-[9px] text-muted-foreground/50">Leave as-is or enter a supplier ID</p>
                  </div>
                )}

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
                  {/* ── Image URL (paste link) ── */}
                  <div className="mt-2">
                    <Label className="text-muted-foreground text-xs">Product Image URL</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="url"
                        placeholder="https://example.com/icon.png"
                        value={form.image_url}
                        onChange={(e) => {
                          const url = e.target.value;
                          setForm((prev) => ({ ...prev, image_url: url }));
                          setImagePreview(url || null);
                        }}
                        className="bg-muted/50 border-border text-xs flex-1"
                      />
                      {/* Live preview box */}
                      <div className="shrink-0 w-10 h-10 rounded-xl border border-white/10 bg-[#1A1F2E] flex items-center justify-center overflow-hidden">
                        {form.image_url ? (
                          <img
                            src={form.image_url}
                            alt="Preview"
                            className="w-10 h-10 object-contain p-1.5 rounded-lg"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <span className="text-[9px] text-muted-foreground/40">Preview</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Service Name + Auto-Build ── */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-muted-foreground text-xs">Service Name</Label>
                      {autoFilledFields.has("name") && <span className="text-[8px] font-bold text-primary bg-primary/10 rounded px-1 py-px animate-fade-in">AUTO</span>}
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-5 text-[9px] gap-1 px-1.5 text-muted-foreground"
                      onClick={() => handleOptimizeTitle(true)}>
                      <Sparkles className="w-2.5 h-2.5" /> Optimize Title
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); titleManuallyEdited.current = true; setOptimizedMeta(null); manualOverrides.current.add("name"); }} required
                      placeholder="e.g. YouTube Premium 1 Month"
                      className={`flex-1 bg-muted/50 border-border transition-all duration-500 ${autoFilledFields.has("name") ? "ring-1 ring-primary/40" : ""}`} />
                    <Button type="button" onClick={handleAutoBuild} disabled={aiGenerating || !form.name.trim()} className="h-9 gap-1.5 px-3 text-sm font-semibold shrink-0">
                      {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {aiGenerating ? "AI Thinking…" : "AI Magic"}
                    </Button>
                  </div>
                  {autoFilledFields.size > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded-md px-2.5 py-0.5 animate-fade-in w-fit">
                      <CheckCircle2 className="w-3 h-3" /> {autoFilledFields.size} fields auto-filled
                    </span>
                  )}
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-muted-foreground text-xs">Icon (emoji)</Label>
                      {autoFilledFields.has("icon") && <span className="text-[8px] font-bold text-primary bg-primary/10 rounded px-1 py-px animate-fade-in">AUTO</span>}
                    </div>
                    <Input value={form.icon} onChange={(e) => { setForm({ ...form, icon: e.target.value }); manualOverrides.current.add("icon"); }}
                      className={`bg-muted/50 border-border transition-all duration-500 ${autoFilledFields.has("icon") ? "ring-1 ring-primary/40" : ""}`} />
                  </div>
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

                  {/* Markdown Toolbar */}
                  <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-1 flex-wrap">
                    {[
                      { label: "B", md: "**", title: "Bold", className: "font-bold" },
                      { label: "I", md: "*", title: "Italic", className: "italic" },
                      { label: "~S~", md: "~~", title: "Strikethrough", className: "line-through text-[9px]" },
                      { label: "</>", md: "`", title: "Inline code", className: "font-mono text-[9px]" },
                    ].map((btn) => (
                      <button
                        key={btn.title}
                        type="button"
                        title={btn.title}
                        className={`px-2 py-1 rounded text-[11px] hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ${btn.className}`}
                        onClick={() => {
                          const ta = document.getElementById("desc-editor") as HTMLTextAreaElement;
                          if (!ta) return;
                          const start = ta.selectionStart;
                          const end = ta.selectionEnd;
                          const val = form.description;
                          const selected = val.substring(start, end);
                          const wrapped = `${btn.md}${selected || "text"}${btn.md}`;
                          const next = val.substring(0, start) + wrapped + val.substring(end);
                          setForm((prev) => ({ ...prev, description: next }));
                          descManuallyEdited.current = true;
                          manualOverrides.current.add("description");
                          setTimeout(() => { ta.focus(); ta.setSelectionRange(start + btn.md.length, start + btn.md.length + (selected || "text").length); }, 0);
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                    <div className="w-px h-4 bg-border mx-0.5" />
                    <button
                      type="button" title="Heading"
                      className="px-2 py-1 rounded text-[11px] font-bold hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => {
                        const ta = document.getElementById("desc-editor") as HTMLTextAreaElement;
                        if (!ta) return;
                        const start = ta.selectionStart;
                        const val = form.description;
                        const lineStart = val.lastIndexOf("\n", start - 1) + 1;
                        const next = val.substring(0, lineStart) + "## " + val.substring(lineStart);
                        setForm((prev) => ({ ...prev, description: next }));
                        descManuallyEdited.current = true;
                      }}
                    >H2</button>
                    <button
                      type="button" title="Bullet list"
                      className="px-2 py-1 rounded text-[11px] hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => {
                        const ta = document.getElementById("desc-editor") as HTMLTextAreaElement;
                        if (!ta) return;
                        const start = ta.selectionStart;
                        const val = form.description;
                        const lineStart = val.lastIndexOf("\n", start - 1) + 1;
                        const next = val.substring(0, lineStart) + "- " + val.substring(lineStart);
                        setForm((prev) => ({ ...prev, description: next }));
                        descManuallyEdited.current = true;
                      }}
                    >• List</button>
                    <button
                      type="button" title="Insert link"
                      className="px-2 py-1 rounded text-[11px] hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => {
                        const ta = document.getElementById("desc-editor") as HTMLTextAreaElement;
                        if (!ta) return;
                        const start = ta.selectionStart;
                        const end = ta.selectionEnd;
                        const val = form.description;
                        const selected = val.substring(start, end);
                        const linkMd = `[${selected || "link text"}](https://example.com)`;
                        const next = val.substring(0, start) + linkMd + val.substring(end);
                        setForm((prev) => ({ ...prev, description: next }));
                        descManuallyEdited.current = true;
                      }}
                    >🔗</button>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowDescPreview((v) => !v)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${showDescPreview ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                      >
                        {showDescPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showDescPreview ? "Hide" : "Preview"}
                      </button>
                    </div>
                  </div>

                  {/* Editor + Preview split */}
                  <div className={`grid gap-3 ${showDescPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
                    {/* Editor pane */}
                    <div className="relative">
                      <Textarea id="desc-editor" value={form.description} onChange={(e) => { setForm({ ...form, description: e.target.value }); descManuallyEdited.current = true; manualOverrides.current.add("description"); }} placeholder="Write markdown — **bold**, *italic*, [links](url), - bullet lists" className={`bg-muted/50 border-border resize-none text-xs font-mono transition-all duration-500 pr-16 ${autoFilledFields.has("description") ? "ring-1 ring-primary/40" : ""} ${aiGenerating ? "opacity-50" : ""}`} rows={showDescPreview ? 14 : (descMode === "ultra-short" ? 6 : 10)} maxLength={3000} disabled={aiGenerating} />
                      {/* Floating action buttons */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => handleGenerateDescription(true)}
                          disabled={aiGenerating || !form.name.trim()}
                          className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          title={form.description.trim() ? "Regenerate with AI" : "Generate with AI"}
                        >
                          {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        </button>
                        {form.description.trim() && (
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(form.description); toast.success("Description copied"); }}
                            className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-all"
                            title="Copy to clipboard"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => { try { const text = await navigator.clipboard.readText(); if (text) { setForm((prev) => ({ ...prev, description: prev.description ? prev.description + "\n" + text : text })); descManuallyEdited.current = true; toast.success("Pasted from clipboard"); } else { toast.error("Clipboard is empty"); } } catch { toast.error("Clipboard access denied"); } }}
                          className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-all"
                          title="Paste from clipboard"
                        >
                          <ClipboardPaste className="w-4 h-4" />
                        </button>
                      </div>
                      {aiGenerating && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-md">
                          <div className="flex items-center gap-2 text-xs font-medium text-primary">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            AI generating description…
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Preview pane */}
                    {showDescPreview && (
                      <div className="rounded-lg border border-border bg-background/50 overflow-hidden flex flex-col">
                        <div className="px-3 py-1.5 border-b border-border bg-muted/30 flex items-center gap-1.5">
                          <Eye className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Live Preview</span>
                        </div>
                        <div className="p-2 overflow-y-auto max-h-[340px] flex-1">
                          {form.description.trim() ? (
                            <StructuredDescription description={form.description} />
                          ) : (
                            <div className="flex items-center justify-center h-full min-h-[100px]">
                              <p className="text-[11px] text-muted-foreground/50">Start typing to see a live preview</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-muted-foreground">{form.description.length}/3000 — Supports **bold**, *italic*, [links](url), `code`, ~~strikethrough~~ · {aiGenerating ? "AI powered" : "Template + AI"}</p>
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
                        <div className="flex gap-2">
                          <Select value={form.provider_id} onValueChange={(v) => { setForm({ ...form, provider_id: v }); setApiServices([]); setApiServicesError(null); }}>
                            <SelectTrigger className="bg-muted/50 border-border flex-1"><SelectValue placeholder="Select provider" /></SelectTrigger>
                            <SelectContent>{providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                          </Select>
                          {form.provider_id && (
                            <Button type="button" variant="outline" size="sm" className="h-10 gap-1.5 text-xs shrink-0"
                              onClick={() => fetchApiServices(form.provider_id)} disabled={apiServicesLoading}>
                              {apiServicesLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                              {apiServicesLoading ? "Fetching..." : "Fetch Services"}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* API Services List */}
                      {apiServicesError && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                          <p className="text-xs text-destructive">{apiServicesError}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Ensure the provider has API URL and API Key configured in Provider settings.</p>
                        </div>
                      )}

                      {apiServices.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-muted-foreground text-[10px]">Select Service ({apiServices.length} available)</Label>
                            {form.api_service_id && (
                              <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                                ID: {form.api_service_id}
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                              value={apiServiceSearch}
                              onChange={(e) => setApiServiceSearch(e.target.value)}
                              placeholder="Search services..."
                              className="bg-muted/50 border-border h-8 text-xs pl-8"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/10 divide-y divide-border/40">
                            {apiServices
                              .filter((s) => {
                                if (!apiServiceSearch) return true;
                                const q = apiServiceSearch.toLowerCase();
                                return s.name.toLowerCase().includes(q) || s.service_id.includes(q) || (s.category || "").toLowerCase().includes(q);
                              })
                              .slice(0, 100)
                              .map((s: any) => {
                                const isSelected = form.api_service_id === s.service_id;
                                return (
                                  <button
                                    key={s.service_id}
                                    type="button"
                                    onClick={() => handleSelectService(s)}
                                    className={`w-full text-left px-3 py-2 transition-colors ${
                                      isSelected ? "bg-primary/10" : "hover:bg-muted/40"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <p className={`text-[11px] font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                                          {s.name}
                                        </p>
                                        <p className="text-[9px] text-muted-foreground truncate">
                                          {s.category} · ID: {s.service_id}
                                        </p>
                                      </div>
                                      <div className="text-right shrink-0 space-y-0.5">
                                        <p className="text-[10px] font-mono font-bold text-foreground">${s.rate}</p>
                                        <p className="text-[9px] text-muted-foreground">{s.min}-{s.max}</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                      {s.refill && <span className="text-[8px] font-semibold text-primary bg-primary/10 px-1.5 py-px rounded">Refill</span>}
                                      {s.cancel && <span className="text-[8px] font-semibold text-muted-foreground bg-secondary px-1.5 py-px rounded">Cancel</span>}
                                    </div>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Selected service summary */}
                      {form.api_service_id && apiServices.length > 0 && (() => {
                        const sel = apiServices.find((s) => s.service_id === form.api_service_id);
                        if (!sel) return null;
                        return (
                          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-xs font-semibold text-primary">Service Linked</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-muted-foreground pl-6">
                              <span>Rate: <span className="font-mono text-foreground">${sel.rate}</span></span>
                              <span>Min: <span className="font-mono text-foreground">{sel.min}</span></span>
                              <span>Max: <span className="font-mono text-foreground">{sel.max}</span></span>
                              <span>Refill: <span className="font-mono text-foreground">{sel.refill ? "Yes" : "No"}</span></span>
                            </div>
                          </div>
                        );
                      })()}
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

                {/* ── Custom Fields (Manual & API type) ── */}
                {(isManual || isApi) && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground text-xs font-medium">Custom Fields</Label>
                        <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1"
                          onClick={() => setCustomFields([...customFields, { field_name: "", field_type: "text", required: true, min_length: null, max_length: null, linked_mode: isApi ? "api" : "manual", sort_order: customFields.length, options: [], placeholder: "", validation_rule: "" }])}>
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
                                  <SelectItem value="url">URL</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="quantity">Quantity</SelectItem>
                                  <SelectItem value="select">Select</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={field.required} onCheckedChange={(checked) => { const u = [...customFields]; u[idx] = { ...u[idx], required: checked }; setCustomFields(u); }} className="scale-75" />
                            <Label className="text-muted-foreground text-[10px]">Required</Label>
                          </div>
                          {/* Placeholder */}
                          <div className="space-y-1">
                            <Label className="text-muted-foreground text-[10px]">Placeholder</Label>
                            <Input value={field.placeholder} onChange={(e) => { const u = [...customFields]; u[idx] = { ...u[idx], placeholder: e.target.value }; setCustomFields(u); }}
                              placeholder="e.g. https://facebook.com/..." className="bg-muted/50 border-border h-7 text-xs" />
                          </div>
                          {/* Min/Max for number & quantity */}
                          {(field.field_type === "number" || field.field_type === "quantity") && (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-muted-foreground text-[10px]">Min Value</Label>
                                <Input type="number" value={field.min_length ?? ""} onChange={(e) => { const u = [...customFields]; u[idx] = { ...u[idx], min_length: e.target.value ? parseInt(e.target.value) : null }; setCustomFields(u); }}
                                  placeholder="1" className="bg-muted/50 border-border h-7 text-xs font-mono" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-muted-foreground text-[10px]">Max Value</Label>
                                <Input type="number" value={field.max_length ?? ""} onChange={(e) => { const u = [...customFields]; u[idx] = { ...u[idx], max_length: e.target.value ? parseInt(e.target.value) : null }; setCustomFields(u); }}
                                  placeholder="10000" className="bg-muted/50 border-border h-7 text-xs font-mono" />
                              </div>
                            </div>
                          )}
                          {/* Validation rule */}
                          {(field.field_type === "url" || field.field_type === "text") && (
                            <div className="space-y-1">
                              <Label className="text-muted-foreground text-[10px]">Validation Rule (regex, optional)</Label>
                              <Input value={field.validation_rule} onChange={(e) => { const u = [...customFields]; u[idx] = { ...u[idx], validation_rule: e.target.value }; setCustomFields(u); }}
                                placeholder="e.g. ^https://(www\.)?facebook\.com/" className="bg-muted/50 border-border h-7 text-xs font-mono" />
                            </div>
                          )}
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

                </div>
                <div className="shrink-0 px-6 py-4 border-t border-border bg-card">
                  <Button type="submit" className="w-full">{editing ? "Update" : "Create"} Product</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Unsaved changes confirmation */}
          <ConfirmModal
            open={confirmCloseOpen}
            onOpenChange={setConfirmCloseOpen}
            title="Unsaved changes"
            description="You have unsaved changes. Are you sure you want to leave? Your draft will be lost."
            confirmLabel="Discard"
            cancelLabel="Keep editing"
            onConfirm={confirmClose}
            destructive
          />
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div className="animate-fade-in">
        <DataCard className="!p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ID, category, or code..."
                className="pl-10 bg-muted/20 border-border/30 h-10"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={activeCategory} onValueChange={setActiveCategory}>
                <SelectTrigger className="w-[150px] bg-muted/20 border-border/30 h-10 text-xs">
                  <Layers className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/50" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {dynamicCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[130px] bg-muted/20 border-border/30 h-10 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Types</SelectItem>
                  {PRODUCT_TYPES.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                <SelectTrigger className="w-[130px] bg-muted/20 border-border/30 h-10 text-xs">
                  <SelectValue placeholder="Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Active">
                    <span className="flex items-center gap-1.5"><Eye className="w-3 h-3" /> Active</span>
                  </SelectItem>
                  <SelectItem value="Disabled">
                    <span className="flex items-center gap-1.5"><EyeOff className="w-3 h-3" /> Disabled</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DataCard>
      </div>

      {/* ── Bulk Price Adjustment Dialog ── */}
      <Dialog open={bulkPriceOpen} onOpenChange={setBulkPriceOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Bulk Price Adjustment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Category</Label>
              <Select value={bulkPriceCategory} onValueChange={setBulkPriceCategory}>
                <SelectTrigger className="bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {dynamicCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Direction</Label>
                <Select value={bulkPriceDirection} onValueChange={(v: any) => setBulkPriceDirection(v)}>
                  <SelectTrigger className="bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">📈 Increase</SelectItem>
                    <SelectItem value="decrease">📉 Decrease</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Percentage %</Label>
                <Input type="number" value={bulkPricePercent} onChange={(e) => setBulkPricePercent(e.target.value)}
                  className="bg-muted/50 border-border font-mono" min="1" max="100" />
              </div>
            </div>
            {(() => {
              const targetProducts = (products || []).filter((p: any) =>
                bulkPriceCategory === "All" || p.category === bulkPriceCategory
              );
              return (
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">
                    This will <span className="font-semibold text-foreground">{bulkPriceDirection}</span> prices by <span className="font-mono font-bold text-primary">{bulkPricePercent}%</span> for <span className="font-bold text-foreground">{targetProducts.length}</span> products
                  </p>
                </div>
              );
            })()}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setBulkPriceOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={async () => {
                const pct = parseFloat(bulkPricePercent);
                if (isNaN(pct) || pct <= 0 || pct > 100) { toast.error("Enter a valid percentage (1-100)"); return; }
                const targetProducts = (products || []).filter((p: any) =>
                  bulkPriceCategory === "All" || p.category === bulkPriceCategory
                );
                if (targetProducts.length === 0) { toast.error("No products found for this category"); return; }
                const multiplier = bulkPriceDirection === "increase" ? (1 + pct / 100) : (1 - pct / 100);
                let updated = 0;
                for (const p of targetProducts) {
                  const newWholesale = Math.round((p.wholesale_price || 0) * multiplier);
                  const newRetail = Math.round((p.retail_price || 0) * multiplier);
                  const { error } = await supabase.from("products")
                    .update({ wholesale_price: newWholesale, retail_price: newRetail } as any)
                    .eq("id", p.id);
                  if (!error) updated++;
                }
                toast.success(`Updated ${updated} products`);
                queryClient.invalidateQueries({ queryKey: ["admin-products"] });
                queryClient.invalidateQueries({ queryKey: ["products"] });
                setBulkPriceOpen(false);
              }}>
                Apply {bulkPriceDirection === "increase" ? "📈" : "📉"} {bulkPricePercent}%
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Action Bar ── */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 animate-fade-in">
          <span className="text-sm font-medium text-foreground">{selectedCount} selected</span>
          <div className="h-4 w-px bg-border" />
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
            disabled={bulkToggling}
            onClick={() => handleBulkToggleType("auto")}>
            <Eye className="w-3.5 h-3.5" />
            Enable
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
            disabled={bulkToggling}
            onClick={() => handleBulkToggleType("disabled")}>
            <EyeOff className="w-3.5 h-3.5" />
            Disable
          </Button>
          <Button size="sm" variant="destructive" className="h-7 gap-1.5 text-xs"
            onClick={async () => {
              if (!confirm(`Delete ${selectedCount} products? This cannot be undone.`)) return;
              const ids = Array.from(selectedIds);
              const CHUNK = 50;
              for (let i = 0; i < ids.length; i += CHUNK) {
                const chunk = ids.slice(i, i + CHUNK);
                // Unlink orders first
                await supabase.from("orders").update({ product_id: null } as any).in("product_id", chunk);
                await supabase.from("product_custom_fields").delete().in("product_id", chunk);
                await supabase.from("pricing_tiers").delete().in("product_id", chunk);
                await supabase.from("products").delete().in("id", chunk);
              }
              toast.success(`${ids.length} products deleted`);
              queryClient.invalidateQueries({ queryKey: ["admin-products"] });
              queryClient.invalidateQueries({ queryKey: ["products"] });
              setSelectedIds(new Set());
            }}>
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto"
            onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* ── Product Table ── */}
      <DataCard noPadding className="animate-fade-in">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto relative">
          <DragDropContext onDragEnd={handleDragEnd}>
            <table className="premium-table">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-10 px-4 py-4">
                    <input type="checkbox" checked={allFilteredSelected && filteredProducts.length > 0}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded border-border accent-primary cursor-pointer" />
                  </th>
                  <th className="w-8 px-2 py-4"></th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-4">ID</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-4">Product</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-4">Category</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-4">Type</th>
                  <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-4">Status</th>
                  <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-4">Cost</th>
                  <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-4">Sell</th>
                  <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-4">Profit</th>
                  <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-4">Stock</th>
                  <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-4 w-14"></th>
                </tr>
              </thead>
              <Droppable droppableId="products">
                {(provided) => (
                  <tbody ref={provided.innerRef} {...provided.droppableProps}>
                    {paginatedProducts.map((p: any, index: number) => {
                      const cc = credentialCounts?.[p.id];
                      const pt = p.product_type || "digital";
                      const costPrice = p.provider_price || p.base_price || 0;
                      const sellPrice = p.wholesale_price || 0;
                      const profit = sellPrice - costPrice;
                      const isOutOfStock = pt === "digital" && p.stock <= 0;
                      const isActive = p.type !== "disabled";

                      const statusBadge = isOutOfStock
                        ? <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-muted text-muted-foreground inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> No Stock
                          </span>
                        : isActive
                        ? <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-success/10 text-success inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-success" /> Active
                          </span>
                        : <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-muted text-muted-foreground inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" /> Disabled
                          </span>;

                      return (
                        <Draggable key={p.id} draggableId={p.id} index={index}>
                          {(provided, snapshot) => (
                            <tr ref={provided.innerRef} {...provided.draggableProps}
                              className={`border-b border-border/20 transition-all duration-150 ${snapshot.isDragging ? "bg-muted/60 shadow-lg" : "hover:bg-muted/10"} ${selectedIds.has(p.id) ? "row-selected" : ""}`}>
                              <td className="px-4 py-3.5">
                                <input type="checkbox" checked={selectedIds.has(p.id)}
                                  onChange={() => toggleSelect(p.id)}
                                  className="w-3.5 h-3.5 rounded border-border accent-primary cursor-pointer" />
                              </td>
                              <td className="px-2 py-3.5" {...provided.dragHandleProps}>
                                <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 cursor-grab hover:text-muted-foreground transition-colors" />
                              </td>
                              <td className="px-4 py-3.5">
                                <button onClick={() => { navigator.clipboard.writeText(String(p.display_id || p.id)); toast.success("ID copied"); }}
                                  className="text-[11px] font-mono font-bold text-primary hover:underline cursor-pointer" title="Click to copy">
                                  #{p.display_id || '—'}
                                </button>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="shrink-0 w-9 h-9 rounded-xl border border-white/10 bg-[#1A1F2E] flex items-center justify-center overflow-hidden">
                                    {p.image_url ? (
                                      <img src={p.image_url} alt={p.name} className="w-9 h-9 object-contain p-1 rounded-lg" onError={(e) => { (e.target as HTMLImageElement).replaceWith(Object.assign(document.createElement('span'), { className: 'text-xs font-bold uppercase text-primary/60', textContent: (p.name || '?')[0] })); }} />
                                    ) : (
                                      <span className="text-lg">{p.icon}</span>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-[13px] font-medium text-foreground block truncate max-w-[220px]">{sanitizeName(p.name)}</span>
                                    {p.duration && <p className="text-[10px] text-muted-foreground/50 mt-0.5">{p.duration}</p>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-secondary/60 text-secondary-foreground">
                                  {p.category}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-1.5">
                                  {typeBadge(pt)}
                                  {p.base_currency === "USD" && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-success/10 text-success">$</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <button
                                  onClick={() => handleSingleToggleType(p.id, p.type)}
                                  className="cursor-pointer mx-auto block"
                                  title={isActive ? "Click to disable" : "Click to enable"}
                                >
                                  {statusBadge}
                                </button>
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <span className="text-[11px] font-mono text-muted-foreground">
                                  {costPrice > 0 ? <Money amount={costPrice} /> : '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <span className="text-[11px] font-mono font-bold" style={{ color: "hsl(var(--gold))" }}>
                                  <Money amount={sellPrice} />
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                {costPrice > 0 ? (
                                  <span className={`text-[12px] font-mono font-bold ${profit > 0 ? "text-success" : profit < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                    {profit > 0 ? "+" : ""}<Money amount={profit} />
                                  </span>
                                ) : <span className="text-[11px] text-muted-foreground">—</span>}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                {pt === "digital" ? (
                                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                                    p.stock > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                                  }`}>
                                    {cc ? `${cc.available}/${cc.total}` : p.stock}
                                  </span>
                                ) : <span className="text-[11px] text-muted-foreground">—</span>}
                              </td>
                              <td className="px-4 py-3.5">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mx-auto block">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuItem onClick={() => openEdit(p)}>
                                      <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(p.id); toast.success("Product ID copied"); }}>
                                      <Copy className="w-3.5 h-3.5 mr-2" /> Copy ID
                                    </DropdownMenuItem>
                                    {pt === "digital" && (
                                      <DropdownMenuItem asChild>
                                        <Link to={`/admin/credentials?product=${p.id}`}>
                                          <KeyRound className="w-3.5 h-3.5 mr-2" /> Credentials
                                        </Link>
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleSingleToggleType(p.id, p.type)}>
                                      {isActive ? <EyeOff className="w-3.5 h-3.5 mr-2" /> : <Eye className="w-3.5 h-3.5 mr-2" />}
                                      {isActive ? "Disable" : "Enable"}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleDelete(p.id)} className="text-destructive focus:text-destructive">
                                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
            <span className="text-xs text-muted-foreground">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 text-xs px-2.5"
                disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>First</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs px-2.5"
                disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>Prev</Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) { page = i + 1; }
                else if (currentPage <= 3) { page = i + 1; }
                else if (currentPage >= totalPages - 2) { page = totalPages - 4 + i; }
                else { page = currentPage - 2 + i; }
                return (
                  <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm"
                    className="h-7 w-7 text-xs p-0"
                    onClick={() => setCurrentPage(page)}>{page}</Button>
                );
              })}
              <Button variant="outline" size="sm" className="h-7 text-xs px-2.5"
                disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs px-2.5"
                disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>Last</Button>
            </div>
          </div>
        )}
      </DataCard>
    </div>
  );
}
