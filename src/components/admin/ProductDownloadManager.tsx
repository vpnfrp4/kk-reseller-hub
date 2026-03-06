import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus, X, Upload, Download, Link2, FileText, FileArchive,
  File, Loader2, Trash2, GripVertical, ExternalLink,
} from "lucide-react";

interface DownloadFile {
  id?: string;
  download_type: "file_upload" | "external_link";
  file_url: string;
  file_name: string;
  file_size: number;
  file_version: string;
  link_text: string;
  open_new_tab: boolean;
  sort_order: number;
  system_requirements: string;
  release_date: string;
}

interface DownloadSettings {
  require_login: boolean;
  show_on_thankyou: boolean;
  send_via_email: boolean;
  download_limit: number | null;
  download_expiry_days: number | null;
}

interface Props {
  productId: string | null;
  files: DownloadFile[];
  settings: DownloadSettings;
  onFilesChange: (files: DownloadFile[]) => void;
  onSettingsChange: (settings: DownloadSettings) => void;
}

const FILE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  zip: FileArchive,
  rar: FileArchive,
  "7z": FileArchive,
};

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const Icon = FILE_ICONS[ext] || File;
  return <Icon className="w-4 h-4" />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function ProductDownloadManager({ productId, files, settings, onFilesChange, onSettingsChange }: Props) {
  const [uploading, setUploading] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState<number | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const hasDownloads = files.length > 0;

  const addFile = (type: "file_upload" | "external_link") => {
    onFilesChange([
      ...files,
      {
        download_type: type,
        file_url: "",
        file_name: "",
        file_size: 0,
        file_version: "",
        link_text: "Download",
        open_new_tab: true,
        sort_order: files.length,
        system_requirements: "",
        release_date: "",
      },
    ]);
  };

  const updateFile = (index: number, updates: Partial<DownloadFile>) => {
    const updated = [...files];
    updated[index] = { ...updated[index], ...updates };
    onFilesChange(updated);
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const handleFileUpload = useCallback(async (file: globalThis.File, index: number) => {
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File must be under 100MB");
      return;
    }

    setUploading(index);
    setUploadProgress(0);

    const fileName = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 5, 90));
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from("product-downloads")
        .upload(fileName, file, { upsert: true });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      setUploadProgress(100);

      // Get signed URL for the file (private bucket)
      const { data: urlData } = await supabase.storage
        .from("product-downloads")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

      updateFile(index, {
        file_url: fileName, // Store the path, not the signed URL
        file_name: file.name,
        file_size: file.size,
      });

      toast.success(`"${file.name}" uploaded`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(null);
      setUploadProgress(0);
    }
  }, [files, onFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setIsDragging(null);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file, index);
  }, [handleFileUpload]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Download className="w-4 h-4 text-primary" /> Product Downloads
        </Label>
      </div>

      {/* No Downloads State */}
      {!hasDownloads && (
        <div className="rounded-lg border-2 border-dashed border-border p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
            <Download className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">No downloads attached</p>
            <p className="text-[10px] text-muted-foreground mt-1">Add files or links that customers can download after purchase</p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => addFile("file_upload")}>
              <Upload className="w-3.5 h-3.5" /> Upload File
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => addFile("external_link")}>
              <Link2 className="w-3.5 h-3.5" /> Add Link
            </Button>
          </div>
        </div>
      )}

      {/* File List */}
      {files.map((file, idx) => (
        <div key={idx} className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 cursor-grab" />
              <span className="text-xs font-semibold text-muted-foreground">
                {file.download_type === "file_upload" ? "📁 File Upload" : "🔗 External Link"} #{idx + 1}
              </span>
            </div>
            <button type="button" onClick={() => removeFile(idx)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {file.download_type === "file_upload" ? (
            <>
              {/* Drag & Drop Upload Area */}
              {!file.file_url ? (
                <div
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(idx); }}
                  onDragLeave={() => setIsDragging(null)}
                  className={`rounded-lg border-2 border-dashed transition-all ${
                    isDragging === idx ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  {uploading === idx ? (
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-foreground font-medium flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…
                        </span>
                        <span className="text-muted-foreground font-mono">{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-1.5" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[idx]?.click()}
                      className="w-full flex flex-col items-center justify-center gap-2 py-5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-xs font-medium">Click or drag file here</span>
                      <span className="text-[10px] text-muted-foreground/60">PDF, ZIP, RAR, EXE, DOC, MP3, MP4 · Max 100MB</span>
                    </button>
                  )}
                  <input
                    ref={(el) => { fileInputRefs.current[idx] = el; }}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, idx);
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  {getFileIcon(file.file_name)}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{file.file_name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatFileSize(file.file_size)}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => updateFile(idx, { file_url: "", file_name: "", file_size: 0 })}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* External Link */}
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[10px]">Download URL</Label>
                  <Input
                    type="url"
                    value={file.file_url}
                    onChange={(e) => updateFile(idx, { file_url: e.target.value })}
                    placeholder="https://example.com/file.zip"
                    className="bg-muted/50 border-border text-xs h-8"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-[10px]">File Name</Label>
                    <Input
                      value={file.file_name}
                      onChange={(e) => updateFile(idx, { file_name: e.target.value })}
                      placeholder="software-v2.zip"
                      className="bg-muted/50 border-border text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-[10px]">Link Text</Label>
                    <Input
                      value={file.link_text}
                      onChange={(e) => updateFile(idx, { link_text: e.target.value })}
                      placeholder="Download Software"
                      className="bg-muted/50 border-border text-xs h-8"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={file.open_new_tab}
                    onCheckedChange={(checked) => updateFile(idx, { open_new_tab: checked })}
                    className="scale-75"
                  />
                  <Label className="text-muted-foreground text-[10px]">Open in new tab</Label>
                </div>
              </div>
            </>
          )}

          {/* Common Metadata */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-[10px]">Version</Label>
              <Input
                value={file.file_version}
                onChange={(e) => updateFile(idx, { file_version: e.target.value })}
                placeholder="v2.1.0"
                className="bg-muted/50 border-border text-xs h-7"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-[10px]">File Size (manual)</Label>
              <Input
                value={file.file_size ? formatFileSize(file.file_size) : ""}
                disabled={file.download_type === "file_upload"}
                onChange={(e) => {
                  // Parse size input like "245MB"
                  const val = e.target.value;
                  const match = val.match(/^([\d.]+)\s*(B|KB|MB|GB)?$/i);
                  if (match) {
                    const num = parseFloat(match[1]);
                    const unit = (match[2] || "B").toUpperCase();
                    const multipliers: Record<string, number> = { B: 1, KB: 1024, MB: 1048576, GB: 1073741824 };
                    updateFile(idx, { file_size: Math.round(num * (multipliers[unit] || 1)) });
                  }
                }}
                placeholder="e.g. 245MB"
                className="bg-muted/50 border-border text-xs h-7"
              />
            </div>
          </div>
        </div>
      ))}

      {/* Add More Buttons */}
      {hasDownloads && (
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => addFile("file_upload")}>
            <Plus className="w-3 h-3" /> Upload File
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => addFile("external_link")}>
            <Plus className="w-3 h-3" /> Add Link
          </Button>
        </div>
      )}

      {/* Download Settings */}
      {hasDownloads && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground">Download Settings</Label>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-[10px]">Require login to download</Label>
                <Switch checked={settings.require_login} onCheckedChange={(v) => onSettingsChange({ ...settings, require_login: v })} className="scale-75" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-[10px]">Show on Thank You page</Label>
                <Switch checked={settings.show_on_thankyou} onCheckedChange={(v) => onSettingsChange({ ...settings, show_on_thankyou: v })} className="scale-75" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-[10px]">Send download link via email</Label>
                <Switch checked={settings.send_via_email} onCheckedChange={(v) => onSettingsChange({ ...settings, send_via_email: v })} className="scale-75" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[10px]">Download limit (blank = unlimited)</Label>
                  <Input
                    type="number"
                    value={settings.download_limit ?? ""}
                    onChange={(e) => onSettingsChange({ ...settings, download_limit: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Unlimited"
                    className="bg-muted/50 border-border text-xs h-7 font-mono"
                    min={1}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[10px]">Expiry (days after purchase)</Label>
                  <Input
                    type="number"
                    value={settings.download_expiry_days ?? ""}
                    onChange={(e) => onSettingsChange({ ...settings, download_expiry_days: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Never expires"
                    className="bg-muted/50 border-border text-xs h-7 font-mono"
                    min={1}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Helper to save downloads to the database
export async function saveProductDownloads(
  productId: string,
  files: DownloadFile[],
  settings: DownloadSettings
) {
  // Delete existing downloads
  await supabase.from("product_downloads" as any).delete().eq("product_id", productId);

  // Insert new downloads
  if (files.length > 0) {
    const rows = files.map((f, i) => ({
      product_id: productId,
      download_type: f.download_type,
      file_url: f.file_url,
      file_name: f.file_name,
      file_size: f.file_size,
      file_version: f.file_version,
      link_text: f.link_text,
      open_new_tab: f.open_new_tab,
      sort_order: i,
      system_requirements: f.system_requirements,
      release_date: f.release_date || null,
    }));
    await supabase.from("product_downloads" as any).insert(rows);
  }

  // Upsert settings
  if (files.length > 0) {
    await supabase.from("product_download_settings" as any).upsert({
      product_id: productId,
      require_login: settings.require_login,
      show_on_thankyou: settings.show_on_thankyou,
      send_via_email: settings.send_via_email,
      download_limit: settings.download_limit,
      download_expiry_days: settings.download_expiry_days,
      updated_at: new Date().toISOString(),
    });
  } else {
    await supabase.from("product_download_settings" as any).delete().eq("product_id", productId);
  }
}

// Helper to load downloads from the database
export async function loadProductDownloads(productId: string): Promise<{
  files: DownloadFile[];
  settings: DownloadSettings;
}> {
  const [{ data: downloads }, { data: settingsData }] = await Promise.all([
    supabase.from("product_downloads" as any).select("*").eq("product_id", productId).order("sort_order"),
    supabase.from("product_download_settings" as any).select("*").eq("product_id", productId).maybeSingle(),
  ]);

  return {
    files: (downloads || []).map((d: any) => ({
      id: d.id,
      download_type: d.download_type,
      file_url: d.file_url,
      file_name: d.file_name,
      file_size: d.file_size || 0,
      file_version: d.file_version || "",
      link_text: d.link_text || "Download",
      open_new_tab: d.open_new_tab ?? true,
      sort_order: d.sort_order || 0,
      system_requirements: d.system_requirements || "",
      release_date: d.release_date || "",
    })),
    settings: {
      require_login: (settingsData as any)?.require_login ?? true,
      show_on_thankyou: (settingsData as any)?.show_on_thankyou ?? true,
      send_via_email: (settingsData as any)?.send_via_email ?? false,
      download_limit: (settingsData as any)?.download_limit ?? null,
      download_expiry_days: (settingsData as any)?.download_expiry_days ?? null,
    },
  };
}
