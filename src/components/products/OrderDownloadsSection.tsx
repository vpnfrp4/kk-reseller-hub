import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Download, FileText, FileArchive, File, ExternalLink, Check,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

const FILE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText, zip: FileArchive, rar: FileArchive, "7z": FileArchive,
};

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const Icon = FILE_ICONS[ext] || File;
  return <Icon className="w-3.5 h-3.5" />;
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
  orderId: string;
  /** Render style: "modal" for order success card, "page" for order detail */
  variant?: "modal" | "page";
}

export default function OrderDownloadsSection({ productId, orderId, variant = "page" }: Props) {
  const { user } = useAuth();
  const [downloadedIdx, setDownloadedIdx] = useState<Set<number>>(new Set());

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

  if (downloads.length === 0) return null;

  const handleDownload = async (download: any, idx: number) => {
    // Log
    if (user) {
      await supabase.from("download_logs" as any).insert({
        download_id: download.id,
        user_id: user.id,
        order_id: orderId,
      });
    }

    setDownloadedIdx((prev) => new Set([...prev, idx]));

    if (download.download_type === "external_link") {
      window.open(download.file_url, download.open_new_tab ? "_blank" : "_self");
    } else {
      const { data } = await supabase.storage
        .from("product-downloads")
        .createSignedUrl(download.file_url, 3600);
      if (data?.signedUrl) {
        const a = document.createElement("a");
        a.href = data.signedUrl;
        a.download = download.file_name;
        a.click();
      }
    }
  };

  if (variant === "modal") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mx-5 mb-4"
      >
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.15em] font-semibold" style={{ color: "#8b949e" }}>
            Your Downloads
          </p>
          <div className="space-y-1.5">
            {downloads.map((dl: any, i: number) => (
              <button
                key={dl.id || i}
                onClick={() => handleDownload(dl, i)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg transition-all hover:brightness-110"
                style={{
                  background: downloadedIdx.has(i) ? "rgba(16,185,129,0.08)" : "rgba(59,130,246,0.08)",
                  border: `1px solid ${downloadedIdx.has(i) ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)"}`,
                }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: downloadedIdx.has(i) ? "rgba(16,185,129,0.1)" : "rgba(59,130,246,0.1)" }}>
                  {downloadedIdx.has(i) ? (
                    <Check className="w-4 h-4" style={{ color: "#10b981" }} />
                  ) : (
                    <span style={{ color: "#3b82f6" }}>{getFileIcon(dl.file_name)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-xs font-medium text-white truncate">{dl.file_name || dl.link_text}</p>
                  <div className="flex items-center gap-2">
                    {dl.file_size > 0 && <span className="text-[10px]" style={{ color: "#8b949e" }}>{formatFileSize(dl.file_size)}</span>}
                    {dl.file_version && <span className="text-[10px]" style={{ color: "#8b949e" }}>{dl.file_version}</span>}
                  </div>
                </div>
                <Download className="w-4 h-4 shrink-0" style={{ color: downloadedIdx.has(i) ? "#10b981" : "#3b82f6" }} />
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  // Page variant for order detail
  return (
    <div className="rounded-[var(--radius-card)] border border-border/40 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Download className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Your Downloads</h3>
          <p className="text-[10px] text-muted-foreground">{downloads.length} file{downloads.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
      <div className="space-y-2">
        {downloads.map((dl: any, i: number) => (
          <div key={dl.id || i} className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-background/50 hover:border-primary/30 transition-all">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              {getFileIcon(dl.file_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{dl.file_name || dl.link_text}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {dl.file_size > 0 && <span className="text-[10px] text-muted-foreground">{formatFileSize(dl.file_size)}</span>}
                {dl.file_version && <span className="text-[10px] text-muted-foreground">{dl.file_version}</span>}
              </div>
            </div>
            <button
              onClick={() => handleDownload(dl, i)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all shrink-0"
            >
              {downloadedIdx.has(i) ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              {downloadedIdx.has(i) ? "Downloaded" : "Download"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
