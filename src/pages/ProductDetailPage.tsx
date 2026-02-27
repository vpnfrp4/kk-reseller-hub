import { useParams, useNavigate, Link } from "react-router-dom";
import { SITE_URL } from "@/lib/utils";
import PriceComparisonTable from "@/components/marketplace/PriceComparisonTable";
import Breadcrumb from "@/components/Breadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ChevronDown,
  Star,
  MessageSquare,
  Zap,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import StructuredDescription from "@/components/products/StructuredDescription";
import { cn } from "@/lib/utils";
import { t, useT } from "@/lib/i18n";
import ReviewModal from "@/components/marketplace/ReviewModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProductDetailPage() {
  const l = useT();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [providerExpanded, setProviderExpanded] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const heroCTARef = useRef<HTMLButtonElement>(null);

  const SPEC_ITEMS = [
    { label: "Activation", value: t.detailExtra.activation },
    { label: "Account Type", value: t.detailExtra.accountType },
    { label: "Warranty", value: t.detailExtra.warranty },
    { label: "Replacement", value: t.detailExtra.replacement },
    { label: "Delivery", value: t.detailExtra.secureDelivery },
  ];

  const NOTICES = [
    { label: t.detailExtra.noticeNoRefund },
    { label: t.detailExtra.noticeIncorrect },
    { label: t.detailExtra.noticeVerify },
  ];

  // ── Data fetching ──
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, imei_providers(id, name, avg_rating, success_rate, total_completed, total_reviews, is_verified, fulfillment_type)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const provider = (product as any)?.imei_providers || null;

  useEffect(() => {
    if (product?.name) {
      document.title = `${product.name} – Buy Online in Myanmar | KKTechDeals`;
    }
    return () => {
      document.title = "Myanmar Biggest Unlock Marketplace | IMEI, GSM & Digital Services – KKTechDeals";
    };
  }, [product?.name]);

  // Intersection observer: show sticky CTA when hero button scrolls out of view
  useEffect(() => {
    const el = heroCTARef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [product]);

  const { data: pricingTiers = [] } = useQuery({
    queryKey: ["pricing-tiers", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pricing_tiers")
        .select("*")
        .eq("product_id", id!)
        .order("min_qty", { ascending: true });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["order-reviews", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_reviews")
        .select("id, rating, comment, created_at, user_id")
        .in("order_id",
          (await supabase.from("orders").select("id").eq("product_id", id!).in("status", ["completed", "delivered"])).data?.map((o: any) => o.id) || []
        )
        .order("created_at", { ascending: false })
        .limit(10);
      return (data || []) as any[];
    },
    enabled: !!id,
  });

  const { data: userCompletedOrder } = useQuery({
    queryKey: ["user-completed-order", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id")
        .eq("product_id", id!)
        .eq("user_id", user!.id)
        .in("status", ["completed", "delivered"])
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: existingReview } = useQuery({
    queryKey: ["user-review-check", id, user?.id],
    queryFn: async () => {
      if (!userCompletedOrder) return null;
      const { data } = await supabase
        .from("order_reviews")
        .select("id")
        .eq("order_id", userCompletedOrder.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!userCompletedOrder && !!user,
  });

  // ── Loading / Not Found ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-[var(--space-default)] text-center py-20">
        <p className="text-muted-foreground text-sm">{l(t.detailExtra.productNotFound)}</p>
        <Button variant="outline" onClick={() => navigate("/dashboard/products")}>{l(t.detailExtra.goBack)}</Button>
      </div>
    );
  }

  // ── Derived values ──
  const productType = (product as any).product_type || "digital";
  const hasStockTracking = productType === "digital";
  const isOutOfStock = hasStockTracking ? product.stock === 0 : false;
  const isLowStock = hasStockTracking ? product.stock > 0 && product.stock <= 5 : false;
  const isImeiProduct = productType === "imei";
  const hasTiers = pricingTiers.length > 0;
  const lowestTier = hasTiers
    ? [...pricingTiers].sort((a: any, b: any) => a.unit_price - b.unit_price)[0] as any
    : null;
  const profitPerUnit = product.retail_price - product.wholesale_price;
  const showMargin = profitPerUnit !== 0;
  const showRetail = product.retail_price !== product.wholesale_price;

  const deliveryTimeConfig: Record<string, string> = product?.delivery_time_config && typeof product.delivery_time_config === "object"
    ? product.delivery_time_config as Record<string, string>
    : {};
  const productModes: string[] = Array.isArray(product.fulfillment_modes) ? (product.fulfillment_modes as any[]).map(String) : ["instant"];
  const defaultMode = productModes[0] || "instant";
  const currentDeliveryBadge = deliveryTimeConfig[defaultMode] || l(t.detailExtra.instantDelivery);

  const fulfillmentLabel = productType === "api" ? "Auto" : productType === "imei" || productType === "manual" ? "Manual" : "Instant";

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || product.name,
    sku: (product as any).product_code,
    category: product.category,
    image: (product as any).image_url || `${SITE_URL}/pwa-512x512.png`,
    brand: { "@type": "Brand", name: "KKTechDeals" },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/dashboard/products/${product.id}`,
      priceCurrency: "MMK",
      price: product.wholesale_price,
      availability: isOutOfStock
        ? "https://schema.org/OutOfStock"
        : isLowStock
        ? "https://schema.org/LimitedAvailability"
        : "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "KKTechDeals" },
    },
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <Breadcrumb items={[
        { label: l(t.nav.dashboard), path: "/dashboard" },
        { label: l(t.nav.products), path: "/dashboard/products" },
        { label: product.name },
      ]} />

      {/* ═══════════════════════════════════════
           1. HERO — Product Brochure
         ═══════════════════════════════════════ */}
      <section
        className="rounded-[var(--radius-card)] border border-border/40 p-6 md:p-8"
        style={{
          background: "linear-gradient(145deg, #15151C 0%, #111116 100%)",
          boxShadow: "0 6px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.02)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          {/* Left: Identity */}
          <div className="space-y-3 min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-semibold text-foreground tracking-wide leading-snug">
              {product.name}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-primary/[0.08] text-primary rounded-md border border-primary/20">
                {product.category}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border",
                  isOutOfStock
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : "bg-muted/30 text-muted-foreground border-border/30"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", isOutOfStock ? "bg-destructive" : "bg-primary")} />
                {isOutOfStock ? l(t.products.outOfStock) : !hasStockTracking ? (isImeiProduct ? (product.processing_time || "1-3 Days") : l(t.products.inStock)) : isLowStock ? `${product.stock} ${l(t.products.left)}` : `${product.stock} ${l(t.products.inStock)}`}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border",
                  fulfillmentLabel === "Manual"
                    ? "bg-muted/30 text-muted-foreground border-border/30"
                    : "bg-primary/[0.08] text-primary border-primary/20"
                )}
              >
                {fulfillmentLabel === "Instant" ? <Zap className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {fulfillmentLabel}
              </span>
              {product.duration && (
                <span className="text-xs text-muted-foreground">{product.duration}</span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> {currentDeliveryBadge}
            </p>
          </div>

          {/* Right: Price + CTA */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-medium mb-1">Price</p>
              <p className="text-3xl md:text-4xl font-bold font-mono tabular-nums text-primary leading-none drop-shadow-[0_0_6px_rgba(212,175,55,0.15)]">
                {product.wholesale_price.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground ml-1.5">MMK</span>
              </p>
              {hasTiers && lowestTier && lowestTier.unit_price < product.wholesale_price && (
                <p className="text-[11px] text-primary font-medium mt-1">
                  {l(t.products.from)} {lowestTier.unit_price.toLocaleString()} MMK ({lowestTier.min_qty}+)
                </p>
              )}
            </div>
            <Button
              ref={heroCTARef}
              className={cn(
                "h-11 rounded-[var(--radius-btn)] px-8 font-semibold text-sm gap-2 btn-glow",
                "transition-all duration-200 ease-in-out",
                "hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(212,175,55,0.2)]",
                "active:scale-[0.97] active:translate-y-0"
              )}
              onClick={() => navigate(`/dashboard/order/${product.id}`)}
              disabled={isOutOfStock}
            >
              {isOutOfStock ? l(t.products.outOfStock) : (
                <>
                  Proceed to Order
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
           2. PROVIDER — Collapsible
         ═══════════════════════════════════════ */}
      {provider && (
        <section className="rounded-[var(--radius-card)] border border-border/40 overflow-hidden"
          style={{ background: "linear-gradient(145deg, #15151C 0%, #111116 100%)" }}
        >
          <button
            onClick={() => setProviderExpanded(!providerExpanded)}
            className="w-full px-5 md:px-6 py-4 flex items-center justify-between text-left transition-colors duration-200 hover:bg-muted/10"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(
                "w-8 h-8 rounded-full border flex items-center justify-center shrink-0",
                provider.is_verified ? "bg-primary/10 border-primary/25" : "bg-muted/40 border-border/40"
              )}>
                {provider.is_verified ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <span className="text-xs font-bold text-muted-foreground">{provider.name?.charAt(0)}</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm min-w-0">
                <span className="font-semibold text-foreground truncate">{provider.name}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground text-xs font-mono">{provider.success_rate ?? "—"}%</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground text-xs font-mono">{(provider.total_completed || 0).toLocaleString()} orders</span>
              </div>
            </div>
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              providerExpanded && "rotate-180"
            )} />
          </button>

          {providerExpanded && (
            <div className="px-5 md:px-6 pb-5 space-y-3 animate-fade-in border-t border-border/20 pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-medium mb-1">Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                    <span className="text-sm font-bold font-mono text-foreground">{provider.avg_rating || "—"}</span>
                    {provider.total_reviews != null && (
                      <span className="text-[10px] text-muted-foreground">({provider.total_reviews})</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-medium mb-1">Success Rate</p>
                  <span className={cn(
                    "text-sm font-bold font-mono",
                    (provider.success_rate || 0) >= 95 ? "text-primary" : (provider.success_rate || 0) >= 80 ? "text-warning" : "text-destructive"
                  )}>
                    {provider.success_rate ?? "—"}%
                  </span>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-medium mb-1">Fulfillment</p>
                  <span className="text-sm font-medium text-foreground capitalize">
                    {provider.fulfillment_type === "api" ? "Automated" : "Manual"}
                  </span>
                </div>
              </div>
              {provider.is_verified && (
                <div className="flex items-center gap-2 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Verified Provider</span>
                </div>
              )}
              <Link
                to={`/dashboard/providers/${provider.id}`}
                className="text-xs text-primary hover:underline underline-offset-2"
              >
                View provider profile →
              </Link>
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════
           3. TABBED SECONDARY CONTENT
         ═══════════════════════════════════════ */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full bg-muted/20 border border-border/30 rounded-[var(--radius-card)] p-1 h-auto">
          <TabsTrigger value="details" className="flex-1 text-xs font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg py-2">
            Details
          </TabsTrigger>
          <TabsTrigger value="specs" className="flex-1 text-xs font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg py-2">
            Specifications
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex-1 text-xs font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg py-2">
            Comparison
          </TabsTrigger>
        </TabsList>

        {/* ── Details Tab ── */}
        <TabsContent value="details" className="mt-4 space-y-4">
          {/* Pricing breakdown */}
          <div
            className="rounded-[var(--radius-card)] border border-border/40 p-5 space-y-4"
            style={{ background: "linear-gradient(145deg, #15151C 0%, #111116 100%)" }}
          >
            <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-medium">
              {l(t.detailExtra.pricingStructure)}
            </p>

            <div className={cn("grid gap-0 divide-x divide-border/20", showRetail ? "grid-cols-3" : "grid-cols-1")}>
              <div className="pr-4">
                <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-medium mb-1">{l(t.detailExtra.wholesale)}</p>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground leading-none">
                  {product.wholesale_price.toLocaleString()}
                  <span className="text-[10px] font-normal text-muted-foreground ml-1">MMK</span>
                </p>
              </div>
              {showRetail && (
                <div className="px-4">
                  <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-medium mb-1">{l(t.detailExtra.retail)}</p>
                  <p className="text-base font-medium font-mono tabular-nums text-muted-foreground leading-none">
                    {product.retail_price.toLocaleString()}
                    <span className="text-[10px] font-normal text-muted-foreground/70 ml-1">MMK</span>
                  </p>
                </div>
              )}
              {showRetail && showMargin && (
                <div className="pl-4">
                  <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-medium mb-1">{l(t.detailExtra.margin)}</p>
                  <p className={cn("text-base font-semibold font-mono tabular-nums leading-none", profitPerUnit > 0 ? "text-primary" : "text-muted-foreground")}>
                    {profitPerUnit > 0 ? "+" : ""}{profitPerUnit.toLocaleString()}
                    <span className="text-[10px] font-normal text-muted-foreground/70 ml-1">MMK</span>
                  </p>
                </div>
              )}
            </div>

            {hasTiers && (
              <div className="border-t border-border/20 pt-3 space-y-0">
                <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-medium mb-2">Volume Pricing</p>
                {[...pricingTiers].sort((a: any, b: any) => a.min_qty - b.min_qty).map((tier: any, i: number) => {
                  const label = tier.max_qty ? `${tier.min_qty} – ${tier.max_qty}` : `${tier.min_qty}+`;
                  const isLowest = lowestTier && tier.unit_price === lowestTier.unit_price;
                  return (
                    <div key={i} className={cn(
                      "flex items-center justify-between py-2 text-[11px] border-b border-border/10 last:border-0",
                      isLowest && "bg-primary/[0.03] -mx-2 px-2 rounded"
                    )}>
                      <span className="font-mono tabular-nums text-foreground">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn("font-mono tabular-nums font-semibold", isLowest ? "text-primary" : "text-foreground")}>
                          {tier.unit_price.toLocaleString()} MMK
                        </span>
                        {isLowest && <span className="text-[9px] font-semibold text-primary uppercase">{l(t.detail.bestValue)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {product.description && (
            <StructuredDescription description={product.description} />
          )}

          {/* Important Notice — collapsible */}
          <div
            className="rounded-[var(--radius-card)] border border-border/40 overflow-hidden"
            style={{ background: "linear-gradient(145deg, #15151C 0%, #111116 100%)" }}
          >
            <button
              onClick={() => setNoticeOpen(!noticeOpen)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-left transition-colors duration-200 hover:bg-muted/10"
            >
              <div className="flex items-center gap-3">
                <div className="w-1 h-4 rounded-full bg-warning" />
                <span className="text-[10px] font-semibold text-foreground uppercase tracking-wider">{l(t.detailExtra.importantNotice)}</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", noticeOpen && "rotate-180")} />
            </button>
            {noticeOpen && (
              <div className="px-5 pb-4 space-y-2 animate-fade-in border-t border-border/20 pt-3">
                {NOTICES.map((notice, i) => (
                  <div key={i} className="flex items-start gap-2 py-0.5">
                    <span className="w-1 h-1 rounded-full bg-warning/60 mt-1.5 shrink-0" />
                    <span className="text-[11px] text-foreground/80">{l(notice.label)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Specifications Tab ── */}
        <TabsContent value="specs" className="mt-4">
          <div
            className="rounded-[var(--radius-card)] border border-border/40 overflow-hidden"
            style={{ background: "linear-gradient(145deg, #15151C 0%, #111116 100%)" }}
          >
            {SPEC_ITEMS.map((item, i) => (
              <SpecAccordionItem key={i} label={item.label} value={l(item.value)} isLast={i === SPEC_ITEMS.length - 1} />
            ))}
          </div>
        </TabsContent>

        {/* ── Comparison Tab ── */}
        <TabsContent value="comparison" className="mt-4">
          <PriceComparisonTable category={product.category} excludeProductId={product.id} />
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════
           4. REVIEWS — Minimal
         ═══════════════════════════════════════ */}
      <section
        className="rounded-[var(--radius-card)] border border-border/40 p-5 md:p-6"
        style={{ background: "linear-gradient(145deg, #15151C 0%, #111116 100%)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-medium">Reviews</p>
            {reviews.length > 0 && (
              <span className="text-[10px] text-muted-foreground">({reviews.length})</span>
            )}
          </div>
          {user && userCompletedOrder && !existingReview && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReviewOpen(true)}
              className="gap-1.5 text-xs h-8 border-border/40"
            >
              <Star className="h-3 w-3" />
              Write Review
            </Button>
          )}
        </div>

        {reviews.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-4">
            <MessageSquare className="h-4 w-4 text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-xs text-muted-foreground">No reviews yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reviews.map((review: any) => (
              <div key={review.id} className="rounded-lg border border-border/20 bg-muted/10 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "h-3 w-3",
                          star <= review.rating ? "text-primary fill-primary" : "text-muted-foreground/20"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-xs text-foreground/80 leading-relaxed">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {existingReview && (
          <p className="text-[10px] text-muted-foreground text-center pt-2">
            ✓ You've already reviewed this product
          </p>
        )}
      </section>

      {/* ── Sticky CTA — only visible when hero button scrolls out of view ── */}
      {!isOutOfStock && (
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-40 transition-all duration-200 ease-out pointer-events-none",
            showStickyBar
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          )}
        >
          <div className="max-w-2xl mx-auto px-4 pb-4 pt-3 pointer-events-auto"
            style={{
              background: "linear-gradient(to top, hsl(var(--background)) 60%, transparent)",
            }}
          >
            <Button
              className={cn(
                "w-full h-11 rounded-[var(--radius-btn)] font-semibold text-sm gap-2 btn-glow",
                "transition-all duration-200 ease-in-out",
                "hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(212,175,55,0.2)]",
                "active:scale-[0.97] active:translate-y-0",
                "shadow-[0_-4px_20px_rgba(0,0,0,0.4)]"
              )}
              onClick={() => navigate(`/dashboard/order/${product.id}`)}
            >
              Proceed to Order — {product.wholesale_price.toLocaleString()} MMK
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Review Modal ── */}
      {userCompletedOrder && user && (
        <ReviewModal
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          orderId={userCompletedOrder.id}
          productName={product.name}
          userId={user.id}
          providerId={provider?.id}
        />
      )}
    </div>
  );
}

/* ── Spec Accordion Item ── */
function SpecAccordionItem({ label, value, isLast }: { label: string; value: string; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn(!isLast && "border-b border-border/15")}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-3 flex items-center justify-between text-left transition-colors duration-200 hover:bg-muted/10"
      >
        <span className="text-[11px] font-medium text-foreground">{label}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-5 pb-3 animate-fade-in">
          <p className="text-[11px] text-muted-foreground">{value}</p>
        </div>
      )}
    </div>
  );
}
