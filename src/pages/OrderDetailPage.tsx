import { useState, useMemo, useEffect } from "react";
import ProductIcon from "@/components/products/ProductIcon";
import { sanitizeName } from "@/lib/sanitize-name";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import Breadcrumb from "@/components/Breadcrumb";
import { Button } from "@/components/ui/button";
import { PageContainer, Money } from "@/components/shared";
import { t, useT, statusLabel } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import ReviewModal from "@/components/marketplace/ReviewModal";
import {
  Copy,
  CheckCircle2,
  Download,
  ArrowLeft,
  FileText,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Star,
} from "lucide-react";
import CredentialCards from "@/components/orders/CredentialCards";
import FulfillmentNotesCard from "@/components/orders/FulfillmentNotesCard";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

function Section({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] uppercase tracking-[0.12em] font-semibold text-muted-foreground mb-4">
      {children}
    </h3>
  );
}

function StatusBadgeLocal({ status }: { status: string }) {
  const l = useT();
  const label = statusLabel(status);
  const isSuccess = ["delivered", "approved", "completed"].includes(status);
  const isPending = ["pending", "pending_creation", "pending_review", "processing"].includes(status);
  const isFailed = ["rejected", "cancelled"].includes(status);

  const badgeClass = isSuccess
    ? "bg-success/10 text-success border border-success/20"
    : isPending
    ? "bg-warning/10 text-warning border border-warning/20"
    : isFailed
    ? "bg-destructive/10 text-destructive border border-destructive/20"
    : "bg-muted text-muted-foreground";

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold", badgeClass)}>
      {isSuccess && <CheckCircle2 className="w-3 h-3" />}
      {isPending && <Clock className="w-3 h-3" />}
      {isFailed && <AlertTriangle className="w-3 h-3" />}
      {l(label)}
    </span>
  );
}

function ProductTypeBadge({ type }: { type: string | null }) {
  const map: Record<string, { label: string; style: string }> = {
    digital: { label: "Digital", style: "bg-secondary text-muted-foreground" },
    imei: { label: "IMEI", style: "bg-secondary text-muted-foreground" },
    manual: { label: "Manual", style: "bg-secondary text-muted-foreground" },
    api: { label: "API", style: "bg-primary/10 text-primary" },
  };
  const s = map[type || "digital"] || map.digital;
  return (
    <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${s.style}`}>
      {s.label}
    </span>
  );
}

/* ─── Timeline Step ─── */
interface TimelineStepData {
  label: { mm: string; en: string };
  timestamp?: string | null;
  isActive: boolean;
  isDone: boolean;
}

function StatusTimeline({ steps }: { steps: TimelineStepData[] }) {
  const l = useT();
  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const isFailed = l(step.label).toLowerCase().includes("fail") || l(step.label).toLowerCase().includes("reject") || l(step.label).toLowerCase().includes("cancel");
        const isLast = i === steps.length - 1;
        return (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                  step.isDone && !isFailed
                    ? "bg-primary text-primary-foreground"
                    : step.isDone && isFailed
                      ? "bg-destructive text-destructive-foreground"
                      : step.isActive
                        ? "bg-primary/10 border-2 border-primary text-primary"
                        : "bg-muted border border-border text-muted-foreground",
                )}
              >
                {step.isDone ? (
                  isFailed ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )
                ) : step.isActive ? (
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "w-px flex-1 min-h-[32px] transition-all",
                    step.isDone ? "bg-primary/20" : "bg-border",
                  )}
                />
              )}
            </div>
            <div className={cn("pb-6", isLast && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-semibold leading-8",
                  step.isDone && !isFailed
                    ? "text-primary"
                    : step.isDone && isFailed
                      ? "text-destructive"
                      : step.isActive
                        ? "text-primary"
                        : "text-muted-foreground",
                )}
              >
                {l(step.label)}
              </p>
              {step.timestamp && (
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  {format(new Date(step.timestamp), "MMM d, yyyy 'at' HH:mm")}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Detail Row ─── */
function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={cn("text-sm font-medium text-foreground text-right", mono && "font-mono")}>
        {value}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const l = useT();
  const { user } = useAuth();

  const queryClient = useQueryClient();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`order-detail-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;
          if (newData?.status && newData.status !== oldData?.status) {
            toast.info(`Order status updated to "${newData.status.replace("_", " ")}"`);
          } else if (newData?.result !== oldData?.result || newData?.credentials !== oldData?.credentials) {
            toast.info("Order details have been updated");
          }
          queryClient.invalidateQueries({ queryKey: ["order-detail", id] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, queryClient]);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("orders")
        .select("*, products:product_id(image_url, category)")
        .eq("id", id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!id,
  });

  const { data: existingReview } = useQuery({
    queryKey: ["order-review", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_reviews" as any)
        .select("id, rating, comment")
        .eq("order_id", id!)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isImei = order?.product_type === "imei";
  const isDelivered = ["delivered", "completed"].includes(order?.status || "");
  const isPending = ["pending", "pending_creation", "pending_review", "processing"].includes(order?.status || "");

  const deliveryContent = useMemo(() => {
    if (order?.result) return order.result;
    return order?.credentials || "";
  }, [order]);

  const credentialLines = useMemo(() => {
    if (!deliveryContent) return [];
    return deliveryContent.split("\n").filter((line: string) => line.trim().length > 0);
  }, [deliveryContent]);

  const fulfillmentDisplay = useMemo(() => {
    const mode = order?.fulfillment_mode || "instant";
    const map: Record<string, { mm: string; en: string }> = {
      instant: t.fulfillment.instant,
      custom_username: t.fulfillment.custom_username,
      imei: t.fulfillment.imei,
      manual: t.fulfillment.manual,
    };
    return map[mode] || { mm: mode, en: mode };
  }, [order?.fulfillment_mode]);

  const timelineSteps: TimelineStepData[] = useMemo(() => {
    const ordered = order?.created_at || null;
    const baseSteps: TimelineStepData[] = [
      { label: t.orderDetail.timelineOrdered, timestamp: ordered, isDone: true, isActive: false },
      { label: t.orderDetail.timelineProcessing, timestamp: isPending ? ordered : isDelivered ? ordered : null, isDone: isDelivered, isActive: isPending },
    ];
    if (isImei) {
      baseSteps.push({
        label: { mm: "ရလဒ်ရပြီ", en: "Result Ready" },
        timestamp: isDelivered && order?.result ? order.completed_at || ordered : null,
        isDone: isDelivered && !!order?.result,
        isActive: false,
      });
    }
    baseSteps.push({
      label: t.orderDetail.timelineCompleted,
      timestamp: isDelivered ? (order?.completed_at || ordered) : null,
      isDone: isDelivered,
      isActive: false,
    });
    return baseSteps;
  }, [order, isDelivered, isPending, isImei]);

  // Activity log removed — timeline is sufficient

  const handleDownloadInvoice = () => {
    if (!order) return;
    const lines = [
      `INVOICE — KKTech Reseller Platform`,
      `──────────────────────────────`,
      `Order Code: ${(order as any).order_code || order.id}`,
      `Product: ${order.product_name}`,
      `Type: ${order.product_type || "digital"}`,
      `Date: ${format(new Date(order.created_at), "PPP 'at' HH:mm")}`,
      `Status: ${order.status}`,
      `Fulfillment: ${order.fulfillment_mode}`,
      `──────────────────────────────`,
      `Total Paid: ${order.price.toLocaleString()} MMK`,
      `Payment Method: Wallet`,
      `──────────────────────────────`,
      isImei && order.imei_number ? `IMEI Number: ${order.imei_number}` : "",
      isImei && order.result ? `Result:\n${order.result}` : `Credentials:\n${order.credentials}`,
      `──────────────────────────────`,
      `Generated at ${new Date().toISOString()}`,
    ].filter(Boolean);
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${(order as any).order_code || order.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Invoice downloaded");
  };

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="space-y-[var(--space-section)]">
        <Breadcrumb items={[
          { label: l(t.nav.dashboard), path: "/dashboard" },
          { label: l(t.nav.orders), path: "/dashboard/orders" },
          { label: l(t.orderDetail.breadcrumb) },
        ]} />
        <PageContainer maxWidth="max-w-3xl">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </PageContainer>
      </div>
    );
  }

  /* ── Not found ── */
  if (!order) {
    return (
      <div className="space-y-[var(--space-section)]">
        <Breadcrumb items={[
          { label: l(t.nav.dashboard), path: "/dashboard" },
          { label: l(t.nav.orders), path: "/dashboard/orders" },
          { label: l(t.orderDetail.breadcrumb) },
        ]} />
        <PageContainer maxWidth="max-w-xl">
          <Section className="text-center py-12 space-y-4">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{l(t.orderDetail.notFound)}</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">{l(t.orderDetail.notFoundDesc)}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button className="gap-2" onClick={() => navigate("/dashboard/orders")}>
                <ArrowLeft className="w-4 h-4" />
                {l(t.orderDetail.backToOrders)}
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => navigate("/dashboard")}>
                {l(t.orderDetail.backToDashboard)}
              </Button>
            </div>
          </Section>
        </PageContainer>
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="space-y-[var(--space-section)] animate-fade-in">
      <Breadcrumb items={[
        { label: l(t.nav.dashboard), path: "/dashboard" },
        { label: l(t.nav.orders), path: "/dashboard/orders" },
        { label: l(t.orderDetail.breadcrumb) },
      ]} />

      <PageContainer maxWidth="max-w-3xl">
        <div className="space-y-4">
          {/* ═══ 1. ORDER HEADER ═══ */}
          <Section>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <ProductIcon
                  imageUrl={(order as any).products?.image_url}
                  name={order.product_name}
                  category={(order as any).products?.category || order.product_type || "General"}
                  size="lg"
                />
                <div className="space-y-1.5">
                  <h1 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                    {sanitizeName(order.product_name)}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadgeLocal status={order.status} />
                    <ProductTypeBadge type={order.product_type} />
                    <span className="text-xs text-muted-foreground font-mono">
                      {(order as any).order_code || order.id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(order.created_at), "PPP 'at' HH:mm")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    handleCopy((order as any).order_code || order.id, "order-id");
                    toast.success(l(t.orderDetail.copiedId));
                  }}
                >
                  {copiedField === "order-id" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {l(t.orderDetail.copyId)}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={handleDownloadInvoice}
                >
                  <Download className="w-3.5 h-3.5" />
                  {l(t.orderDetail.downloadInvoice)}
                </Button>
              </div>
            </div>
          </Section>

          {/* ═══ 2. STATUS TIMELINE ═══ */}
          <Section>
            <SectionLabel>Status Timeline</SectionLabel>
            <StatusTimeline steps={timelineSteps} />
          </Section>

          {/* ═══ 3. ORDER DETAILS ═══ */}
          <Section>
            <SectionLabel>{l(t.orderDetail.customerDetails)}</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <DetailRow label={l(t.orders.product)} value={sanitizeName(order.product_name)} />
              <DetailRow label="Product Type" value={<ProductTypeBadge type={order.product_type} />} />
              <DetailRow label={l(t.orderDetail.fulfillmentMode)} value={l(fulfillmentDisplay)} />
              <DetailRow label="Status" value={<StatusBadgeLocal status={order.status} />} />
              <DetailRow label={l(t.orderDetail.requestedOn)} value={format(new Date(order.created_at), "PPP")} />
              {order.imei_number && <DetailRow label="IMEI Number" value={order.imei_number} mono />}
              {order.custom_fields_data &&
                typeof order.custom_fields_data === "object" &&
                Object.entries(order.custom_fields_data as Record<string, string>).map(([key, value]) => (
                  <DetailRow key={key} label={key} value={value} mono />
                ))}
            </div>
          </Section>

          {/* ═══ 4. PRICING ═══ */}
          <Section>
            <SectionLabel>{l(t.orderDetail.pricingBreakdown)}</SectionLabel>
            <div className="space-y-0">
              <DetailRow
                label={l(t.orderDetail.totalPaid)}
                value={<Money amount={order.price} className="text-primary font-bold text-base" />}
              />
              <DetailRow
                label={l(t.orderDetail.walletUsed)}
                value={<Money amount={order.price} className="text-muted-foreground" />}
              />
            </div>
          </Section>

          {/* ═══ 5. CREDENTIALS ═══ */}
          {credentialLines.length > 0 &&
            credentialLines[0] !== "Pending manual fulfillment" &&
            credentialLines[0] !== "Pending API fulfillment" && (
              <Section>
                <CredentialCards rawCredentials={deliveryContent} isImei={isImei} completed={isDelivered} />
              </Section>
            )}

          {/* ═══ 5b. FULFILLMENT NOTES ═══ */}
          {(() => {
            if (!order.admin_notes) return null;
            const userRelevantKeywords = [
              "reject", "denied", "not supported", "unsupported", "failed",
              "manual verification", "verification required", "refund",
              "cancelled", "canceled", "invalid", "error", "issue",
              "contact support", "re-submit", "resubmit",
            ];
            const lines = order.admin_notes.split("\n").filter((line: string) => {
              const lower = line.trim().toLowerCase();
              if (!lower) return false;
              if (lower.includes("tier discount") || lower.includes("margin") || lower.includes("provider cost") || lower.includes("profit")) return false;
              if (lower.includes("system log") || lower.includes("internal")) return false;
              return userRelevantKeywords.some(kw => lower.includes(kw));
            });
            if (lines.length === 0) return null;
            return (
              <Section>
                <FulfillmentNotesCard notes={lines.join("\n")} completed={order.status === "completed"} />
              </Section>
            );
          })()}

          {/* ═══ 5c. REVIEW ═══ */}
          {isDelivered && (
            <Section>
              {existingReview ? (
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-primary fill-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Review</h4>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn("w-4 h-4", s <= (existingReview as any).rating ? "text-primary fill-primary" : "text-muted-foreground/30")}
                        />
                      ))}
                    </div>
                    {(existingReview as any).comment && (
                      <p className="text-sm text-muted-foreground">{(existingReview as any).comment}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Rate this service</h4>
                      <p className="text-xs text-muted-foreground">Help others by sharing your experience</p>
                    </div>
                  </div>
                  <Button size="sm" className="gap-1.5 text-xs" onClick={() => setReviewOpen(true)}>
                    <Star className="w-3.5 h-3.5" />
                    Write Review
                  </Button>
                </div>
              )}
            </Section>
          )}

          {/* ═══ 6. ACTIVITY LOG ═══ */}
          <Section>
            <SectionLabel>{l(t.orderDetail.activityLog)}</SectionLabel>
            <div className="space-y-0">
              {activityLog.map((entry, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", i === activityLog.length - 1 ? "bg-primary" : "bg-muted-foreground/30")} />
                    <span className="text-sm text-foreground">{l(entry.label)}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {format(new Date(entry.time), "MMM d, HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* ═══ 7. IMPORTANT NOTICE ═══ */}
          <Section className="border-l-2 border-l-primary/30">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">{l(t.orderDetail.importantNotice)}</h4>
                <ul className="space-y-1.5">
                  <li className="text-xs text-muted-foreground leading-relaxed">{l(t.orderDetail.noticeCredentials)}</li>
                  <li className="text-xs text-muted-foreground leading-relaxed">{l(t.orderDetail.noticeNoRefund)}</li>
                  <li className="text-xs text-muted-foreground leading-relaxed">{l(t.orderDetail.noticeSupport)}</li>
                </ul>
              </div>
            </div>
          </Section>

          {/* Back */}
          <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => navigate("/dashboard/orders")}>
            <ArrowLeft className="w-4 h-4" />
            {l(t.orderDetail.backToOrders)}
          </Button>
        </div>
      </PageContainer>

      {order && user && (
        <ReviewModal
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          orderId={order.id}
          productName={order.product_name}
          userId={user.id}
        />
      )}
    </div>
  );
}
