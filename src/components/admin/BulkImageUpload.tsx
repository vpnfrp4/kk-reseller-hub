import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, X, CheckCircle, AlertCircle, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  icon: string;
  image_url: string | null;
}

interface QueueItem {
  file: File;
  preview: string;
  productId: string;
  status: "pending" | "compressing" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
}

function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
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
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        "image/webp",
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export default function BulkImageUpload({ products }: { products: Product[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems: QueueItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        productId: "",
        status: "pending" as const,
        progress: 0,
      }));
    if (newItems.length === 0) {
      toast.error("No valid image files selected");
      return;
    }
    setQueue((prev) => [...prev, ...newItems]);
  };

  const removeItem = (index: number) => {
    setQueue((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateItem = (index: number, updates: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const processQueue = async () => {
    const valid = queue.filter((item) => item.productId && item.status === "pending");
    if (valid.length === 0) {
      toast.error("Assign products to all images first");
      return;
    }

    setProcessing(true);

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (!item.productId || item.status !== "pending") continue;

      try {
        updateItem(i, { status: "compressing", progress: 20 });
        const compressed = await compressImage(item.file);

        updateItem(i, { status: "uploading", progress: 50 });
        const fileName = `${crypto.randomUUID()}.webp`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, compressed, { contentType: "image/webp", upsert: true });

        if (uploadError) throw uploadError;

        updateItem(i, { progress: 80 });

        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        const { error: dbError } = await supabase
          .from("products")
          .update({ image_url: urlData.publicUrl })
          .eq("id", item.productId);

        if (dbError) throw dbError;

        updateItem(i, { status: "done", progress: 100 });
      } catch (err: any) {
        updateItem(i, { status: "error", error: err.message || "Failed" });
      }
    }

    setProcessing(false);
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });

    const doneCount = queue.filter((_, i) => {
      // Re-read from state won't work here, but we can count successes
      return true;
    }).length;
    toast.success("Bulk upload complete");
  };

  const handleClose = (v: boolean) => {
    if (!v && !processing) {
      queue.forEach((item) => URL.revokeObjectURL(item.preview));
      setQueue([]);
    }
    if (!processing) setOpen(v);
  };

  const unassignedProducts = products.filter(
    (p) => !queue.some((q) => q.productId === p.id && q.status !== "error")
  );

  const pendingCount = queue.filter((q) => q.productId && q.status === "pending").length;
  const allDone = queue.length > 0 && queue.every((q) => q.status === "done" || q.status === "error");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ImageIcon className="w-4 h-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Bulk Image Upload</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={processing}
            className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 disabled:opacity-50"
          >
            <Upload className="w-5 h-5" />
            <span className="text-xs">Click to select multiple images</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />

          {/* Queue */}
          {queue.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {queue.length} image{queue.length > 1 ? "s" : ""} — assign each to a product
              </p>
              {queue.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/20"
                >
                  <img
                    src={item.preview}
                    alt="preview"
                    className="w-12 h-12 rounded-md object-cover border border-border/50 shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {item.status === "done" ? (
                      <div className="flex items-center gap-1.5 text-xs text-success">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Uploaded</span>
                      </div>
                    ) : item.status === "error" ? (
                      <div className="flex items-center gap-1.5 text-xs text-destructive">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{item.error || "Failed"}</span>
                      </div>
                    ) : item.status === "compressing" || item.status === "uploading" ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-foreground font-medium">
                            {item.status === "compressing" ? "Compressing…" : "Uploading…"}
                          </span>
                          <span className="text-muted-foreground font-mono">{item.progress}%</span>
                        </div>
                        <Progress value={item.progress} className="h-1" />
                      </div>
                    ) : (
                      <Select
                        value={item.productId}
                        onValueChange={(v) => updateItem(idx, { productId: v })}
                      >
                        <SelectTrigger className="h-8 text-xs bg-muted/50 border-border">
                          <SelectValue placeholder="Select product…" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">
                              <span className="mr-1.5">{p.icon}</span>
                              {p.name}
                              {p.image_url && " (has image)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <p className="text-[10px] text-muted-foreground truncate">
                      {item.file.name} ({(item.file.size / 1024).toFixed(0)} KB)
                    </p>
                  </div>
                  {(item.status === "pending" || item.status === "error") && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {queue.length > 0 && (
            <div className="flex gap-2">
              {allDone ? (
                <Button className="w-full" onClick={() => handleClose(false)}>
                  Done
                </Button>
              ) : (
                <Button
                  className="w-full btn-glow"
                  disabled={processing || pendingCount === 0}
                  onClick={processQueue}
                >
                  {processing ? "Processing…" : `Upload ${pendingCount} Image${pendingCount !== 1 ? "s" : ""}`}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
