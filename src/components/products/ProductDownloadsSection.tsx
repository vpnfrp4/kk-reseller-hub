import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Download, Lock, FileText, FileArchive, File, ExternalLink, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const FILE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText, zip: FileArchive, rar: FileArchive, "7z": FileArchive,
};

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const Icon = FILE_ICONS[ext] || File;
  return <Icon className="w-4 h-4" />;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

interface Props {
  productId: string;
  hasPurchased?: boolean;
  orderId?: string;
}

export default function ProductDownloadsSection({ productId, hasPurchased = false, orderId }: Props) {
  const { user } = useAuth();

  const { data: downloads = [] } = useQuery({
    queryKey: ["product-downloads", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_downloads" as any)
        .select("*")
        .eq("product_id", productId)
        .order("sort_order");
      return data || [];
    },
    enabled: !!productId,
  });

  const { data: settings } = useQuery({
    queryKey: ["product-download-settings", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_download_settings" as any)
        .select("*")
        .eq("product_id", productId)
        .maybeSingle();
      return data;
    },
    enabled: !!productId,
  });

  if (downloads.length === 0) return null;

  const totalSize = downloads.reduce((sum: number, d: any) => sum + (d.file_size || 0), 0);
  const canDownload = hasPurchased;

  const handleDownload = async (download: any) => {
    if (!canDownload) return;

    // Log the download
    if (user) {
      await supabase.from("download_logs" as any).insert({
        download_id: download.id,
        user_id: user.id,
        order_id: orderId || null,
      });
    }

    if (download.download_type === "external_link") {
      window.open(download.file_url, download.open_new_tab ? "_blank" : "_self");
    } else {
      // Generate signed URL for private bucket file
      const { data } = await supabase.storage
        .from("product-downloads")
        .createSignedUrl(download.file_url, 3600); // 1 hour
      if (data?.signedUrl) {
        const a = document.createElement("a");
        a.href = data.signedUrl;
        a.download = download.file_name;
        a.click();
      }
    }
  };

  return (
    <div className="rounded-[var(--radius-card)] border border-border/40 p-5 space-y-4"
      style={{ background: "linear-gradient(145deg, rgba(16,185,129,0.03) 0%, transparent 100%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Download className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Downloads Included</h3>
            <p className="text-[10px] text-muted-foreground">
              {downloads.length} file{downloads.length !== 1 ? "s" : ""}
              {totalSize > 0 && ` · ${formatFileSize(totalSize)} total`}
            </p>
          </div>
        </div>
        {!canDownload && (
          <Tooltip>
            <TooltipTrigger>
              <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-muted/50 text-muted-foreground rounded-md border border-border/50">
                <Lock className="w-3 h-3" /> After purchase
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Files available after you complete your purchase</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* File List */}
      <div className="space-y-2">
        {downloads.map((dl: any, i: number) => (
          <div
            key={dl.id || i}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
              canDownload
                ? "border-border/40 bg-background/50 hover:border-primary/30 hover:bg-primary/[0.02]"
                : "border-border/20 bg-muted/20 opacity-70"
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              canDownload ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground"
            }`}>
              {getFileIcon(dl.file_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{dl.file_name || dl.link_text || "Download"}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {dl.file_size > 0 && (
                  <span className="text-[10px] text-muted-foreground">{formatFileSize(dl.file_size)}</span>
                )}
                {dl.file_version && (
                  <span className="text-[10px] text-muted-foreground/60">{dl.file_version}</span>
                )}
                {dl.download_type === "external_link" && (
                  <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                    <ExternalLink className="w-2.5 h-2.5" /> Link
                  </span>
                )}
              </div>
            </div>
            {canDownload ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs shrink-0 border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => handleDownload(dl)}
              >
                <Download className="w-3.5 h-3.5" />
                {dl.link_text || "Download"}
              </Button>
            ) : (
              <div className="p-2 shrink-0">
                <Lock className="w-4 h-4 text-muted-foreground/40" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info note */}
      {!canDownload && (
        <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 pt-1">
          <Info className="w-3 h-3" /> Available after purchase — download from your orders page
        </p>
      )}
    </div>
  );
}
