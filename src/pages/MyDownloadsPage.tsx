import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Download, FileText, FileArchive, File, ExternalLink, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { sanitizeName } from "@/lib/sanitize-name";

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

export default function MyDownloadsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get all orders with products that have downloads
  const { data: ordersWithDownloads = [], isLoading } = useQuery({
    queryKey: ["my-downloads", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get user's completed orders
      const { data: orders } = await supabase
        .from("orders")
        .select("id, product_id, product_name, created_at, status")
        .eq("user_id", user.id)
        .in("status", ["delivered", "completed"])
        .not("product_id", "is", null)
        .order("created_at", { ascending: false });

      if (!orders || orders.length === 0) return [];

      const productIds = [...new Set(orders.map((o: any) => o.product_id).filter(Boolean))];

      // Get downloads for those products
      const { data: downloads } = await supabase
        .from("product_downloads" as any)
        .select("*")
        .in("product_id", productIds)
        .order("sort_order");

      if (!downloads || downloads.length === 0) return [];

      // Group by product
      const downloadsByProduct: Record<string, any[]> = {};
      downloads.forEach((d: any) => {
        if (!downloadsByProduct[d.product_id]) downloadsByProduct[d.product_id] = [];
        downloadsByProduct[d.product_id].push(d);
      });

      // Combine
      return orders
        .filter((o: any) => downloadsByProduct[o.product_id])
        .map((o: any) => ({
          ...o,
          downloads: downloadsByProduct[o.product_id] || [],
        }));
    },
    enabled: !!user,
  });

  const handleDownload = async (download: any, orderId: string) => {
    if (user) {
      await supabase.from("download_logs" as any).insert({
        download_id: download.id,
        user_id: user.id,
        order_id: orderId,
      });
    }

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

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <Download className="w-5 h-5 text-primary" />
          My Downloads
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {ordersWithDownloads.length} product{ordersWithDownloads.length !== 1 ? "s" : ""} with downloads
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : ordersWithDownloads.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-border/40 p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
            <Package className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-foreground">No downloads yet</p>
          <p className="text-xs text-muted-foreground">Purchase a product with downloadable content to see it here</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/products")}>
            Browse Products
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {ordersWithDownloads.map((order: any) => (
            <div key={order.id} className="rounded-[var(--radius-card)] border border-border/40 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{sanitizeName(order.product_name)}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Purchased {format(new Date(order.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                  className="text-[10px] text-primary hover:underline"
                >
                  View Order
                </button>
              </div>
              <div className="space-y-1.5">
                {order.downloads.map((dl: any) => (
                  <div key={dl.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/30 bg-background/50 hover:border-primary/30 transition-all">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      {getFileIcon(dl.file_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{dl.file_name || dl.link_text}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {dl.file_size > 0 && <span className="text-[10px] text-muted-foreground">{formatFileSize(dl.file_size)}</span>}
                        {dl.file_version && <span className="text-[10px] text-muted-foreground">{dl.file_version}</span>}
                        {dl.download_type === "external_link" && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <ExternalLink className="w-2.5 h-2.5" /> Link
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(dl, order.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
