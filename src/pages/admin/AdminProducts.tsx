import { useState, useRef, useCallback, useEffect } from "react";
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
import { Plus, Pencil, Trash2, KeyRound, Upload, X, ImageIcon, GripVertical, RotateCcw } from "lucide-react";
import PricingTiersDialog from "@/components/admin/PricingTiersDialog";
import BulkTierDialog from "@/components/admin/BulkTierDialog";
import { Progress } from "@/components/ui/progress";
import BulkImageUpload from "@/components/admin/BulkImageUpload";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import FulfillmentConfig, { DEFAULT_DELIVERY_TIMES } from "@/components/admin/FulfillmentConfig";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { DataCard, Money } from "@/components/shared";

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

const CATEGORIES = ["All", "VPN", "Editing Tools", "AI Accounts"] as const;

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
        <button
          onClick={onUndo}
          className="shrink-0 rounded-md border border-border bg-transparent px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
        >
          Undo
        </button>
      </div>
      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-primary transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<"idle" | "compressing" | "uploading">("idle");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "", icon: "📦", category: "General", description: "",
    retail_price: "", wholesale_price: "", duration: "", stock: "",
    image_url: "", type: "auto" as "auto" | "manual",
  });
  const [fulfillmentModes, setFulfillmentModes] = useState<string[]>(["instant"]);
  const [deliveryTimeConfig, setDeliveryTimeConfig] = useState<Record<string, string>>(DEFAULT_DELIVERY_TIMES);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

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
      const { data } = await supabase
        .from("product_credentials")
        .select("product_id, is_sold");
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
    setForm({ name: "", icon: "📦", category: "General", description: "", retail_price: "", wholesale_price: "", duration: "", stock: "", image_url: "", type: "auto" });
    setEditing(null);
    setImagePreview(null);
    setFulfillmentModes(["instant"]);
    setDeliveryTimeConfig(DEFAULT_DELIVERY_TIMES);
    setCustomFields([]);
  };

  const loadCustomFields = async (productId: string) => {
    const { data } = await supabase
      .from("product_custom_fields")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true });
    setCustomFields((data || []).map((f: any) => ({
      id: f.id,
      field_name: f.field_name,
      field_type: f.field_type,
      required: f.required,
      min_length: f.min_length,
      max_length: f.max_length,
      linked_mode: f.linked_mode,
      sort_order: f.sort_order,
      options: Array.isArray(f.options) ? f.options : [],
    })));
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      name: p.name, icon: p.icon, category: p.category, description: p.description || "",
      retail_price: p.retail_price.toString(), wholesale_price: p.wholesale_price.toString(),
      duration: p.duration, stock: p.stock.toString(), image_url: p.image_url || "",
      type: p.type || "auto",
    });
    setImagePreview(p.image_url || null);
    setFulfillmentModes(Array.isArray(p.fulfillment_modes) ? p.fulfillment_modes : ["instant"]);
    setDeliveryTimeConfig(p.delivery_time_config && typeof p.delivery_time_config === "object" ? p.delivery_time_config : DEFAULT_DELIVERY_TIMES);
    loadCustomFields(p.id);
    setDialogOpen(true);
  };

  const compressImage = useCallback((file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error("Compression failed")),
          "image/webp",
          quality
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStage("compressing");
    const fileName = `${crypto.randomUUID()}.webp`;

    try {
      // Simulate compression progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 8, 40));
      }, 80);

      const compressed = await compressImage(file);
      clearInterval(progressInterval);
      setUploadProgress(50);
      setUploadStage("uploading");

      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 5, 90));
      }, 100);

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, compressed, { contentType: "image/webp", upsert: true });

      clearInterval(uploadInterval);

      if (uploadError) throw uploadError;

      setUploadProgress(100);
      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      setForm((prev) => ({ ...prev, image_url: urlData.publicUrl }));
      setImagePreview(urlData.publicUrl);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadStage("idle");
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeImage = () => {
    setForm((prev) => ({ ...prev, image_url: "" }));
    setImagePreview(null);
  };

  const saveCustomFields = async (productId: string) => {
    // Delete existing fields for this product
    await supabase.from("product_custom_fields").delete().eq("product_id", productId);
    // Insert new fields
    if (customFields.length > 0) {
      const rows = customFields.map((f, i) => ({
        product_id: productId,
        field_name: f.field_name,
        field_type: f.field_type,
        required: f.required,
        min_length: f.min_length,
        max_length: f.max_length,
        linked_mode: f.linked_mode,
        sort_order: i,
        options: f.field_type === "select" && f.options.length > 0 ? f.options : null,
      }));
      const { error } = await supabase.from("product_custom_fields").insert(rows);
      if (error) toast.error("Failed to save custom fields: " + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: form.name.trim(), icon: form.icon, category: form.category.trim(),
      description: form.description.trim(),
      retail_price: parseInt(form.retail_price), wholesale_price: parseInt(form.wholesale_price),
      duration: form.duration.trim(), stock: form.type === "manual" ? 0 : parseInt(form.stock),
      image_url: form.image_url || null,
      fulfillment_modes: form.type === "manual" ? ["manual"] : fulfillmentModes,
      delivery_time_config: deliveryTimeConfig,
      type: form.type,
    };

    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      await saveCustomFields(editing.id);
      toast.success("Product updated");
    } else {
      const { data, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error) { toast.error(error.message); return; }
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
    const filtered = activeCategory === "All"
      ? [...products]
      : products.filter((p: any) => p.category === activeCategory);
    const [moved] = filtered.splice(result.source.index, 1);
    filtered.splice(result.destination.index, 0, moved);

    // Optimistic update
    const updatedProducts = products.map((p: any) => {
      const newIndex = filtered.findIndex((f: any) => f.id === p.id);
      if (newIndex !== -1) return { ...p, sort_order: newIndex };
      return p;
    });
    queryClient.setQueryData(["admin-products"], updatedProducts.sort((a: any, b: any) => a.sort_order - b.sort_order));

    // Persist
    const updates = filtered.map((p: any, i: number) => ({ id: p.id, sort_order: i }));
    for (const u of updates) {
      await supabase.from("products").update({ sort_order: u.sort_order } as any).eq("id", u.id);
    }
  };

  return (
    <div className="space-y-section">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-h1 text-foreground">Products</h1>
          <p className="text-caption text-muted-foreground">Manage digital service products</p>
        </div>
        <div className="flex gap-2">
          <BulkTierDialog />
          <BulkImageUpload products={(products || []).map((p: any) => ({ id: p.id, name: p.name, icon: p.icon, image_url: p.image_url }))} />
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="btn-glow gap-2"><Plus className="w-4 h-4" />Add Product</Button>
            </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">{editing ? "Edit" : "New"} Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image Upload */}
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Product Image</Label>
                {imagePreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
                    <img src={imagePreview} alt="Preview" className="w-full aspect-[16/9] object-cover" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-destructive border border-border/50 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    disabled={uploading}
                    className={`w-full flex flex-col items-center justify-center gap-2 py-6 rounded-lg border-2 border-dashed bg-muted/30 text-muted-foreground hover:text-foreground transition-all duration-200 ${
                      isDragging
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    {uploading ? (
                      <div className="w-full px-6 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-foreground font-medium">
                            {uploadStage === "compressing" ? "Compressing…" : "Uploading…"}
                          </span>
                          <span className="text-muted-foreground font-mono">{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-1.5" />
                      </div>
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                    {!uploading && (
                      <span className="text-xs">{isDragging ? "Drop image here" : "Click or drag image here"}</span>
                    )}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              {/* Product Type */}
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Product Type</Label>
                <Select value={form.type} onValueChange={(val: "auto" | "manual") => setForm({ ...form, type: val })}>
                  <SelectTrigger className="bg-muted/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto Delivery (Stock Based)</SelectItem>
                    <SelectItem value="manual">Manual Processing (Custom Order)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  {form.type === "auto" ? "Stock is validated and deducted automatically." : "No stock checks. Admin fulfills manually."}
                </p>
              </div>

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
              <div className={`grid ${form.type === "auto" ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Retail Price</Label>
                  <Input type="number" value={form.retail_price} onChange={(e) => setForm({ ...form, retail_price: e.target.value })} required className="bg-muted/50 border-border font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Wholesale</Label>
                  <Input type="number" value={form.wholesale_price} onChange={(e) => setForm({ ...form, wholesale_price: e.target.value })} required className="bg-muted/50 border-border font-mono" />
                </div>
                {form.type === "auto" && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Stock</Label>
                    <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required className="bg-muted/50 border-border font-mono" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Product description shown on detail page..."
                  className="bg-muted/50 border-border resize-none"
                  rows={3}
                  maxLength={500}
                />
              </div>

              {form.type === "auto" && (
                <>
                  <Separator />
                  {/* Fulfillment Configuration */}
                  <FulfillmentConfig
                    productId={editing?.id || ""}
                    fulfillmentModes={fulfillmentModes}
                    deliveryTimeConfig={deliveryTimeConfig}
                    onModesChange={setFulfillmentModes}
                    onDeliveryTimeChange={setDeliveryTimeConfig}
                  />
                </>
              )}

              <Separator />

              {/* Custom Fields */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground text-xs font-medium">Custom Fields</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setCustomFields([...customFields, {
                      field_name: "",
                      field_type: "text",
                      required: true,
                      min_length: null,
                      max_length: null,
                      linked_mode: fulfillmentModes[0] || "instant",
                      sort_order: customFields.length,
                      options: [],
                    }])}
                  >
                    <Plus className="w-3 h-3" /> Add Field
                  </Button>
                </div>

                {customFields.length === 0 && (
                  <p className="text-xs text-muted-foreground/60 text-center py-3 border border-dashed border-border rounded-lg">
                    No custom fields configured
                  </p>
                )}

                {customFields.map((field, idx) => (
                  <div key={idx} className="space-y-2 p-3 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Field {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-[10px]">Field Name</Label>
                        <Input
                          value={field.field_name}
                          onChange={(e) => {
                            const updated = [...customFields];
                            updated[idx] = { ...updated[idx], field_name: e.target.value };
                            setCustomFields(updated);
                          }}
                          placeholder="e.g. Username"
                          className="bg-muted/50 border-border h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-[10px]">Field Type</Label>
                        <Select
                          value={field.field_type}
                          onValueChange={(val) => {
                            const updated = [...customFields];
                            updated[idx] = { ...updated[idx], field_type: val };
                            setCustomFields(updated);
                          }}
                        >
                          <SelectTrigger className="bg-muted/50 border-border h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="select">Select</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-[10px]">Min Length</Label>
                        <Input
                          type="number"
                          value={field.min_length ?? ""}
                          onChange={(e) => {
                            const updated = [...customFields];
                            updated[idx] = { ...updated[idx], min_length: e.target.value ? parseInt(e.target.value) : null };
                            setCustomFields(updated);
                          }}
                          className="bg-muted/50 border-border h-8 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-[10px]">Max Length</Label>
                        <Input
                          type="number"
                          value={field.max_length ?? ""}
                          onChange={(e) => {
                            const updated = [...customFields];
                            updated[idx] = { ...updated[idx], max_length: e.target.value ? parseInt(e.target.value) : null };
                            setCustomFields(updated);
                          }}
                          className="bg-muted/50 border-border h-8 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-[10px]">Linked Mode</Label>
                        <Select
                          value={field.linked_mode}
                          onValueChange={(val) => {
                            const updated = [...customFields];
                            updated[idx] = { ...updated[idx], linked_mode: val };
                            setCustomFields(updated);
                          }}
                        >
                          <SelectTrigger className="bg-muted/50 border-border h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fulfillmentModes.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.required}
                        onCheckedChange={(checked) => {
                          const updated = [...customFields];
                          updated[idx] = { ...updated[idx], required: checked };
                          setCustomFields(updated);
                        }}
                        className="scale-75"
                      />
                      <Label className="text-muted-foreground text-[10px]">Required</Label>
                    </div>

                    {/* Options for select type */}
                    {field.field_type === "select" && (
                      <div className="space-y-1.5 pt-1 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <Label className="text-muted-foreground text-[10px]">Dropdown Options</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 text-[10px] px-1.5 gap-0.5"
                            onClick={() => {
                              const updated = [...customFields];
                              updated[idx] = { ...updated[idx], options: [...(updated[idx].options || []), ""] };
                              setCustomFields(updated);
                            }}
                          >
                            <Plus className="w-2.5 h-2.5" /> Add
                          </Button>
                        </div>
                        {(!field.options || field.options.length === 0) && (
                          <p className="text-[10px] text-muted-foreground/50 text-center py-1.5">No options added</p>
                        )}
                        {(field.options || []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-1.5">
                            <Input
                              value={opt}
                              onChange={(e) => {
                                const updated = [...customFields];
                                const newOpts = [...(updated[idx].options || [])];
                                newOpts[optIdx] = e.target.value;
                                updated[idx] = { ...updated[idx], options: newOpts };
                                setCustomFields(updated);
                              }}
                              placeholder={`Option ${optIdx + 1}`}
                              className="bg-muted/50 border-border h-7 text-xs flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...customFields];
                                const newOpts = (updated[idx].options || []).filter((_, i) => i !== optIdx);
                                updated[idx] = { ...updated[idx], options: newOpts };
                                setCustomFields(updated);
                              }}
                              className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button type="submit" className="w-full btn-glow">{editing ? "Update" : "Create"} Product</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="flex gap-2 animate-fade-in items-center flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`filter-pill ${activeCategory === cat ? "filter-pill-active" : "filter-pill-inactive"}`}
          >
            {cat}
          </button>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto gap-1.5 text-xs"
          onClick={async () => {
            if (!products || !confirm("Reset product order to alphabetical?")) return;
            const previousOrder = products.map((p: any) => ({ id: p.id, sort_order: p.sort_order }));
            const sorted = [...products].sort((a: any, b: any) => a.name.localeCompare(b.name));
            const updated = sorted.map((p: any, i: number) => ({ ...p, sort_order: i }));
            queryClient.setQueryData(["admin-products"], updated);
            for (const p of updated) {
              await supabase.from("products").update({ sort_order: p.sort_order } as any).eq("id", p.id);
            }
            queryClient.invalidateQueries({ queryKey: ["products"] });
            const DURATION = 10000;
            toast.custom((id) => (
              <UndoToast
                id={id}
                duration={DURATION}
                message={`Order reset to alphabetical — ${updated.length} product${updated.length === 1 ? "" : "s"} reordered`}
                onUndo={async () => {
                  toast.dismiss(id);
                  for (const p of previousOrder) {
                    await supabase.from("products").update({ sort_order: p.sort_order } as any).eq("id", p.id);
                  }
                  queryClient.invalidateQueries({ queryKey: ["admin-products"] });
                  queryClient.invalidateQueries({ queryKey: ["products"] });
                  toast.success("Order restored to previous arrangement");
                }}
              />
            ), { duration: DURATION });
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Order
        </Button>
      </div>

      <DataCard noPadding className="animate-fade-in">
        <div className="overflow-x-auto">
          <DragDropContext onDragEnd={handleDragEnd}>
            <table className="premium-table">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-10 p-4"></th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Product</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Category</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Duration</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-4">Retail</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-4">Wholesale</th>
                  <th className="text-center text-xs font-medium text-muted-foreground p-4">Stock</th>
                  <th className="text-center text-xs font-medium text-muted-foreground p-4">Credentials</th>
                  <th className="text-center text-xs font-medium text-muted-foreground p-4">Actions</th>
                </tr>
              </thead>
              <Droppable droppableId="products">
                {(provided) => (
                  <tbody ref={provided.innerRef} {...provided.droppableProps}>
                    {(products || [])
                      .filter((p: any) => activeCategory === "All" || p.category === activeCategory)
                      .map((p: any, index: number) => {
                      const cc = credentialCounts?.[p.id];
                      return (
                        <Draggable key={p.id} draggableId={p.id} index={index}>
                          {(provided, snapshot) => (
                            <tr
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`border-b border-border/50 transition-colors ${snapshot.isDragging ? "bg-muted/60 shadow-lg" : "hover:bg-muted/30"}`}
                            >
                              <td className="p-4" {...provided.dragHandleProps}>
                                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  {p.image_url ? (
                                    <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover border border-border/50" />
                                  ) : (
                                    <span className="text-lg">{p.icon}</span>
                                  )}
                                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                                </div>
                              </td>
                              <td className="p-4 text-sm text-muted-foreground">{p.category}</td>
                              <td className="p-4 text-sm text-muted-foreground">{p.duration}</td>
                              <td className="p-4 text-sm text-right"><Money amount={p.retail_price} className="text-muted-foreground" /></td>
                              <td className="p-4 text-sm text-right"><Money amount={p.wholesale_price} /></td>
                              <td className="p-4 text-sm font-mono text-center text-foreground">
                                {(p as any).type === "manual" ? <span className="text-xs text-muted-foreground italic">N/A</span> : p.stock}
                              </td>
                              <td className="p-4 text-center">
                                <span className={`text-xs font-mono px-2 py-1 rounded-full ${
                                  cc && cc.available > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                                }`}>
                                  {cc ? `${cc.available}/${cc.total}` : "0/0"}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-center gap-2">
                                  <Link to={`/admin/credentials?product=${p.id}`} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="View credentials">
                                    <KeyRound className="w-4 h-4" />
                                  </Link>
                                  <PricingTiersDialog productId={p.id} productName={`${p.name} ${p.duration}`} />
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
