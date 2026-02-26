import { useState, useRef, useEffect, forwardRef, CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Zap,
  Clock,
  Wallet,
  Smartphone,
  Globe,
  Key,
  Sparkles,
  UserPlus,
  CreditCard,
  ShoppingCart,
  Truck,
  ChevronRight,
  CheckCircle2,
  Eye,
  Lock,
  HeadphonesIcon,
  BarChart3,
  MessageCircle,
  X,
  Send,
  Phone,
  ArrowRight,
  Search,
  Package,
  Users,
  TrendingUp,
  Activity,
  Check,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCountUpOnView } from "@/hooks/use-count-up";
import RecentUnlocksTicker from "@/components/landing/RecentUnlocksTicker";
import ProviderLogosCarousel from "@/components/landing/ProviderLogosCarousel";

/* ───────── SCROLL REVEAL ───────── */
const ScrollReveal = forwardRef<HTMLDivElement, { children: ReactNode; delay?: number; className?: string }>(
  ({ children, delay = 0, className = "" }, forwardedRef) => {
    const innerRef = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.unobserve(el); } },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      );
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    const style: CSSProperties = {
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(20px)",
      transition: `opacity 0.5s ease-out ${delay}ms, transform 0.5s ease-out ${delay}ms`,
    };

    const setRefs = (node: HTMLDivElement | null) => {
      (innerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    };

    return <div ref={setRefs} style={style} className={className}>{children}</div>;
  }
);
ScrollReveal.displayName = "ScrollReveal";

/* ───────── SERVICES ───────── */
const gsmServices = [
  {
    icon: Smartphone,
    title: "IMEI Check",
    text: "Verify carrier lock status, warranty, and device information for any phone worldwide using our reliable IMEI lookup system.",
  },
  {
    icon: Lock,
    title: "iPhone Unlock",
    text: "Official iPhone carrier unlock services supporting all models and networks. Permanent unlock directly from Apple's database.",
  },
  {
    icon: Shield,
    title: "Samsung FRP",
    text: "Remove Factory Reset Protection on Samsung devices quickly. Supports all Galaxy models with high success rates.",
  },
  {
    icon: Globe,
    title: "Network Unlock",
    text: "Unlock any phone from any carrier worldwide. We support AT&T, T-Mobile, Sprint, international networks, and more.",
  },
];

const digitalServices = [
  {
    icon: Sparkles,
    title: "CapCut Pro Accounts",
    text: "Wholesale CapCut Pro accounts for video editing businesses. Premium features at reseller-friendly prices for Myanmar market.",
  },
  {
    icon: Eye,
    title: "Canva Pro Accounts",
    text: "Genuine Canva Pro subscriptions at wholesale rates. Perfect for designers and social media managers in Myanmar.",
  },
  {
    icon: Key,
    title: "VPN Keys",
    text: "ExpressVPN, LetsVPN and other premium VPN keys at bulk pricing. Ideal for resellers serving privacy-conscious customers.",
  },
  {
    icon: Globe,
    title: "AI Tool Accounts",
    text: "Access premium AI tools like ChatGPT Plus, Midjourney, and more at wholesale rates for tech-forward resellers.",
  },
];

/* ───────── STEPS ───────── */
const steps = [
  { icon: UserPlus, title: "Register", desc: "Create your free reseller account in under 2 minutes." },
  { icon: CreditCard, title: "Top Up Wallet", desc: "Add funds via KBZPay, WavePay, or bank transfer." },
  { icon: ShoppingCart, title: "Place Order", desc: "Browse products and purchase at wholesale prices." },
  { icon: Truck, title: "Receive Delivery", desc: "Get credentials instantly or within stated delivery time." },
];

/* ───────── FAQ ───────── */
const faqs = [
  {
    q: "What is GSM unlock service?",
    a: "GSM unlock removes the carrier lock on a mobile phone, allowing it to work with any SIM card worldwide. Our service uses official databases to provide permanent, warranty-safe unlocks.",
  },
  {
    q: "How long does IMEI unlock take?",
    a: "Delivery times vary by service. Many IMEI checks are instant. iPhone carrier unlocks typically take 1–5 business days depending on the carrier and model.",
  },
  {
    q: "How do I become a reseller?",
    a: "Simply register for a free account, verify your email, top up your wallet, and start ordering at wholesale prices. No minimum order required to get started.",
  },
  {
    q: "Is wallet top-up secure?",
    a: "Yes. All transactions are processed through our secure system. We support Myanmar payment methods including KBZPay and WavePay with proof-of-payment verification.",
  },
  {
    q: "Do you support Myanmar payment methods?",
    a: "Absolutely. We accept KBZPay, WavePay, CB Pay, AYA Pay, and direct bank transfers from major Myanmar banks. Top-ups are approved within 5–15 minutes.",
  },
];

/* ───────── COMPARISON DATA ───────── */
const comparisonRows = [
  { feature: "Pricing Model", kktech: "Transparent wholesale tiers with volume discounts", other: "Hidden fees, inconsistent pricing" },
  { feature: "Provider Selection", kktech: "Multiple verified providers, best price comparison", other: "Single source, no alternatives" },
  { feature: "Success Rate Visibility", kktech: "Real-time stats per provider shown upfront", other: "No visibility until after payment" },
  { feature: "Bulk Ordering", kktech: "Built-in quantity pricing with instant delivery", other: "Manual process, slow turnaround" },
  { feature: "Delivery Tracking", kktech: "Live order status with receipt generation", other: "Email-only updates, no tracking" },
  { feature: "Payment Methods", kktech: "KBZPay, WavePay, CB Pay, bank transfers", other: "Credit card or crypto only" },
];

/* ───────── FAQ JSON-LD ───────── */
function FaqJsonLd() {
  const structured = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
    />
  );
}

/* ───────── Organization + WebSite JSON-LD ───────── */
function OrgWebsiteJsonLd() {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "KKTechDeals",
    url: "https://kk-reseller-hub.lovable.app",
    logo: "https://kk-reseller-hub.lovable.app/pwa-512x512.png",
    description: "Buy IMEI Unlock, Mobile Legends Diamonds, Hardware Schematics Tools and Digital Licenses in Myanmar. Instant delivery, reseller pricing, secure wallet system.",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["en", "my"],
    },
    sameAs: [],
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "KKTechDeals",
    url: "https://kk-reseller-hub.lovable.app",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://kk-reseller-hub.lovable.app/dashboard/products?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
    </>
  );
}

/* ───────── LIVE STATS HOOK ───────── */
function useLandingStats() {
  return useQuery({
    queryKey: ["landing-stats"],
    queryFn: async () => {
      const [productsRes, providersRes, ordersRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("imei_providers").select("id, success_rate, status"),
        supabase.from("orders").select("id", { count: "exact", head: true }),
      ]);
      const activeProviders = (providersRes.data ?? []).filter(p => p.status === "active");
      const avgSuccess = activeProviders.length > 0
        ? Math.round(activeProviders.reduce((s, p) => s + (Number(p.success_rate) || 0), 0) / activeProviders.length)
        : 99;
      return {
        products: productsRes.count ?? 0,
        providers: activeProviders.length,
        successRate: avgSuccess,
        orders: ordersRes.count ?? 0,
      };
    },
    staleTime: 60_000,
  });
}

/* ───────── ANIMATED STAT ───────── */
function AnimatedStat({ value, suffix, label, icon: Icon }: { value: number; suffix?: string; label: string; icon: typeof Package }) {
  const { display, ref } = useCountUpOnView(value, 1200);
  return (
    <div ref={ref} className="flex flex-col items-center gap-2 p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <span className="text-3xl font-extrabold tabular-nums text-foreground">
        {display.toLocaleString()}{suffix}
      </span>
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [contactOpen, setContactOpen] = useState(false);
  const { data: stats } = useLandingStats();

  return (
    <>
      <FaqJsonLd />
      <OrgWebsiteJsonLd />

      {/* ─── NAV ─── */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="text-xl font-extrabold tracking-tight text-foreground">
            KK<span className="text-primary">Tech</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#services" className="transition-colors hover:text-foreground">Services</a>
            <Link to="/services/imei-unlock" className="transition-colors hover:text-foreground">IMEI Unlock</Link>
            <Link to="/services/vpn-keys" className="transition-colors hover:text-foreground">VPN Keys</Link>
            <Link to="/services/capcut-pro" className="transition-colors hover:text-foreground">CapCut Pro</Link>
            <Link to="/tools/imei-check" className="transition-colors hover:text-foreground">IMEI Checker</Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="text-sm font-medium" asChild>
              <Link to="/login">Log In</Link>
            </Button>
            <Button size="sm" className="text-sm px-5 font-semibold" asChild>
              <Link to="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* ═══════════ MARKETPLACE HERO ═══════════ */}
        <section className="relative overflow-hidden bg-background pb-16 pt-20 sm:pb-28 sm:pt-32">
          {/* Background decoration */}
          <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2">
            <div className="h-[600px] w-[600px] rounded-full bg-primary/[0.05] blur-[120px]" />
          </div>
          <div className="pointer-events-none absolute -bottom-20 -right-20 hidden sm:block">
            <div className="h-[300px] w-[300px] rounded-full bg-primary/[0.04] blur-[80px]" />
          </div>

          <ScrollReveal>
            <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
              {/* Animated Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.08] px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-semibold text-primary">
                  {stats?.products ?? "..."} Services · 3 Categories · {stats?.providers ?? "..."} Verified Providers
                </span>
              </div>

              <h1 className="text-[2.25rem] font-extrabold leading-[1.15] tracking-tight text-foreground sm:text-[3.25rem]">
                Myanmar's Trusted Unlock
                <br className="hidden sm:block" />
                {" "}&amp; Digital
                <span className="text-primary"> Marketplace</span>
              </h1>

              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-secondary-foreground sm:text-lg">
                Multi-provider marketplace with transparent pricing. Compare success rates, delivery times, and prices across verified providers — all in one platform.
              </p>

              {/* Search-style CTA */}
              <div className="mx-auto mt-10 max-w-lg">
                <Link
                  to="/login"
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 pr-4 shadow-card transition-all hover:shadow-elevated hover:border-primary/30"
                >
                  <div className="flex h-11 w-full items-center gap-3 rounded-xl bg-muted/50 px-4 text-sm text-muted-foreground">
                    <Search className="h-4 w-4 shrink-0" />
                    <span>Enter IMEI number to find unlock services...</span>
                  </div>
                  <Button size="sm" className="shrink-0 px-5 font-semibold">
                    Search <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </Link>
                <p className="mt-3 text-xs text-muted-foreground">
                  Free to register · No monthly fees · Pay only for what you order
                </p>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ═══════════ RECENT UNLOCKS TICKER ═══════════ */}
        <RecentUnlocksTicker />

        {/* ═══════════ LIVE STATS ═══════════ */}
        <section className="border-t border-border bg-muted/20 py-4">
          <div className="mx-auto max-w-4xl px-5 sm:px-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
              <AnimatedStat icon={Package} value={stats?.products ?? 0} label="Services Available" />
              <AnimatedStat icon={Users} value={stats?.providers ?? 0} label="Active Providers" />
              <AnimatedStat icon={TrendingUp} value={stats?.successRate ?? 0} suffix="%" label="Avg Success Rate" />
              <AnimatedStat icon={Activity} value={stats?.orders ?? 0} label="Orders Processed" />
            </div>
          </div>
        </section>

        {/* ═══════════ PROVIDER LOGOS ═══════════ */}
        <ProviderLogosCarousel />

        {/* ═══════════ TRUST NOTICE ═══════════ */}
        <section className="bg-background py-16">
          <ScrollReveal className="mx-auto max-w-3xl px-5 sm:px-8">
            <div className="flex gap-4 rounded-2xl border border-primary/20 bg-primary/[0.06] p-6">
              <div className="flex-shrink-0 border-l-[3px] border-primary" />
              <div className="flex gap-3">
                <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Verified Wholesale Platform
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    KKTech is trusted by 500+ active resellers across Myanmar. All transactions are secured with wallet-based fraud protection, and every order generates a verifiable receipt. We process thousands of unlock requests monthly with a 99.2% success rate.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ═══════════ SERVICES ═══════════ */}
        <section id="services" className="border-t border-border bg-muted/30 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <ScrollReveal>
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Services</p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Our Unlock &amp; Digital Services
                </h2>
                <p className="mt-3 text-base text-muted-foreground">
                  Everything you need to run a profitable digital reselling business.
                </p>
              </div>
            </ScrollReveal>

            {/* GSM */}
            <div className="mt-14">
              <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                GSM &amp; IMEI Services
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {gsmServices.map((s, i) => (
                  <ScrollReveal key={s.title} delay={i * 80}>
                    <article
                      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-elevated hover:border-primary/25 h-full"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                        <s.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h4 className="text-base font-semibold text-foreground">{s.title}</h4>
                      <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                    </article>
                  </ScrollReveal>
                ))}
              </div>
            </div>

            {/* Digital */}
            <div className="mt-14">
              <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                Digital Accounts Wholesale
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {digitalServices.map((s, i) => (
                  <ScrollReveal key={s.title} delay={i * 80}>
                    <article
                      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-elevated hover:border-primary/25 h-full"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                        <s.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h4 className="text-base font-semibold text-foreground">{s.title}</h4>
                      <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                    </article>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ COMPARISON TABLE ═══════════ */}
        <section id="compare" className="py-20 sm:py-28">
          <div className="mx-auto max-w-4xl px-5 sm:px-8">
            <ScrollReveal>
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Why Choose Us</p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  KKTech vs Traditional Unlock Sites
                </h2>
                <p className="mt-3 text-base text-muted-foreground">
                  See why resellers choose our multi-provider marketplace over legacy platforms.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={150}>
              <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                {/* Header row */}
                <div className="grid grid-cols-3 border-b border-border bg-muted/40 px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Feature</span>
                  <span className="text-center text-primary">KKTech</span>
                  <span className="text-center">Others</span>
                </div>

                {/* Rows */}
                {comparisonRows.map((row, i) => (
                  <div
                    key={row.feature}
                    className={`grid grid-cols-3 items-center gap-2 px-5 py-4 text-sm ${
                      i < comparisonRows.length - 1 ? "border-b border-border/50" : ""
                    }`}
                  >
                    <span className="font-medium text-foreground">{row.feature}</span>
                    <div className="flex items-start gap-2 justify-center text-center">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground text-left">{row.kktech}</span>
                    </div>
                    <div className="flex items-start gap-2 justify-center text-center">
                      <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
                      <span className="text-muted-foreground/60 text-left">{row.other}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══════════ HOW IT WORKS ═══════════ */}
        <section id="how" className="border-t border-border bg-muted/30 py-20 sm:py-28">
          <div className="mx-auto max-w-4xl px-5 sm:px-8">
            <ScrollReveal>
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">How It Works</p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Start Reselling in 4 Simple Steps
                </h2>
              </div>
            </ScrollReveal>

            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <ScrollReveal key={s.title} delay={i * 100}>
                  <div
                    className="relative flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-5 pb-6 pt-8 text-center shadow-card h-full"
                  >
                    {/* Step number */}
                    <div className="absolute -top-3.5 left-5 flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                      {i + 1}
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <s.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="text-base font-semibold text-foreground">{s.title}</h4>
                    <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Inline CTA */}
            <ScrollReveal delay={200}>
              <div className="mt-12 text-center">
                <Button size="lg" className="h-12 px-8 text-sm font-semibold" asChild>
                  <Link to="/login">
                    Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <p className="mt-3 text-sm text-muted-foreground">No monthly fees · Pay only for what you order</p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══════════ SEO CONTENT BLOCK (visually hidden, SEO indexed) ═══════════ */}
        <section className="sr-only" aria-hidden="false">
          <div className="prose prose-sm mx-auto max-w-3xl px-4 text-muted-foreground sm:px-6 [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground">
            <h2 className="text-2xl font-bold tracking-tight">
              Myanmar's Trusted GSM Unlock Server &amp; Digital Reseller Hub
            </h2>

            <p>
              KKTech is a comprehensive <strong>GSM unlock server</strong> and digital reseller
              platform built specifically for the Myanmar market. Whether you are an established
              mobile repair shop or an individual reseller starting out, our platform gives you
              access to premium <strong>IMEI unlock services</strong>, digital accounts, and VPN
              keys — all at competitive wholesale prices with instant or scheduled delivery.
            </p>

            <h3>IMEI Unlock Services for Every Carrier</h3>
            <p>
              Our <strong>IMEI unlock reseller</strong> system connects you to major unlock
              servers worldwide. From <strong>iPhone unlock wholesale</strong> via official Apple
              databases to Samsung FRP removal and network unlocks for carriers like AT&amp;T,
              T-Mobile, Vodafone, and dozens of international networks, we aggregate the most
              reliable sources into one easy-to-use dashboard. Simply enter the IMEI, choose the
              service, and let our automated system handle the rest. Most orders are processed
              within minutes, while carrier-dependent services complete within 1–5 business days.
            </p>

            <h3>Digital Accounts &amp; VPN Keys at Bulk Pricing</h3>
            <p>
              Beyond GSM services, KKTech is your go-to{" "}
              <strong>digital accounts reseller platform</strong>. We offer{" "}
              <strong>CapCut Pro reseller</strong> accounts for video editors, Canva Pro
              subscriptions for designers, and{" "}
              <strong>VPN wholesale accounts</strong> including ExpressVPN and LetsVPN keys. Each
              product comes with transparent pricing that shows your profit margin upfront, so
              you always know exactly how much you stand to earn on every sale.
            </p>

            <h3>Purpose-Built for Myanmar Resellers</h3>
            <p>
              Unlike global platforms that treat Myanmar as an afterthought, KKTech was designed
              from the ground up with Myanmar payment methods, Myanmar-language support
              considerations, and a wallet system that accepts KBZPay, WavePay, CB Pay, AYA Pay,
              and direct bank transfers. Top-up approvals happen within 5–15 minutes during
              business hours, meaning you never have to wait long to start selling.
            </p>

            <h3>Secure, Transparent &amp; Scalable</h3>
            <p>
              Security is baked into every layer. Your wallet balance is protected by our fraud
              detection system, and every order generates a detailed receipt with timestamps and
              credential information. Our real-time stock system ensures you never sell something
              that is out of stock, and pricing tiers reward higher-volume resellers with better
              unit costs. Whether you process 10 orders a month or 10,000, KKTech scales with
              your business.
            </p>

            <h3>Getting Started Is Free</h3>
            <p>
              Registration is completely free, and there are no monthly fees or subscriptions. You
              only pay for what you order. Create an account, top up your wallet with as little as
              5,000 MMK, and start browsing our catalog of GSM unlock services, digital accounts,
              and VPN keys. Our support team is available via Telegram and Viber to help you get
              set up.
            </p>
          </div>
        </section>

        {/* ═══════════ FAQ ═══════════ */}
        <section id="faq" className="py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <ScrollReveal>
              <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Frequently Asked Questions
              </h2>
            </ScrollReveal>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((f, i) => (
                <ScrollReveal key={i}>
                  <AccordionItem
                    value={`faq-${i}`}
                    className="rounded-card border border-border/40 bg-card/60 backdrop-blur-sm px-5 shadow-luxury"
                  >
                    <AccordionTrigger className="text-left text-sm font-semibold text-foreground hover:no-underline">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                </ScrollReveal>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ═══════════ CTA (visually hidden, SEO indexed) ═══════════ */}
        <section className="sr-only" aria-hidden="false">
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Start Reselling Today
            </h2>
            <p className="mt-3 text-muted-foreground">
              Join hundreds of Myanmar resellers already using KKTech to grow their business.
            </p>
            <Button size="lg" className="mt-6" asChild>
              <Link to="/login">
                Create Free Account <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* ═══════════ SEO KEYWORD CONTENT ═══════════ */}
        <section className="border-t border-border bg-muted/10 py-16">
          <div className="mx-auto max-w-4xl px-5 sm:px-8 space-y-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              About KKTechDeals — Myanmar's Premier Unlock &amp; Digital Services Platform
            </h2>

            <div className="space-y-5 text-sm leading-relaxed text-secondary-foreground">
              <p>
                <strong className="text-foreground">KKTechDeals</strong> is Myanmar's largest and most trusted marketplace for <strong className="text-foreground">IMEI unlock services</strong>, GSM tools, hardware schematics, and premium digital subscriptions. We connect resellers across Myanmar with verified providers who deliver fast, reliable unlocking solutions for every major phone brand — including Samsung, iPhone, Huawei, Xiaomi, Oppo, Vivo, and more. Whether you need a factory unlock, network unlock, or carrier unlock, our multi-provider comparison engine lets you find the best price, fastest turnaround, and highest success rate in one place.
              </p>

              <h3 className="text-lg font-semibold text-foreground pt-2">IMEI Unlock &amp; GSM Services</h3>
              <p>
                Our <strong className="text-foreground">IMEI unlock marketplace</strong> supports all major carriers and networks worldwide. Resellers can submit unlock requests for AT&amp;T, T-Mobile, Sprint, Verizon, EE, Vodafone, O2, and hundreds of other carriers across the US, UK, Europe, and Asia. Each provider on our platform is vetted for reliability, and real-time success rate tracking ensures you always know what to expect. We support both <strong className="text-foreground">clean IMEI unlocks</strong> and <strong className="text-foreground">premium server unlocks</strong> with processing times ranging from instant delivery to 1–7 business days depending on the service tier.
              </p>

              <h3 className="text-lg font-semibold text-foreground pt-2">Hardware Schematics &amp; Repair Tools</h3>
              <p>
                For mobile repair professionals and technicians in Myanmar, KKTechDeals offers access to premium <strong className="text-foreground">hardware schematics tools</strong> and diagnostic software. Our catalog includes licenses for industry-standard platforms used in board-level repair, component-level diagnostics, and advanced troubleshooting. All licenses are delivered digitally with secure credential management — no waiting for physical shipments.
              </p>

              <h3 className="text-lg font-semibold text-foreground pt-2">Digital Subscriptions &amp; Premium Accounts</h3>
              <p>
                Beyond unlocking, we provide a curated selection of <strong className="text-foreground">digital subscriptions</strong> and premium accounts at wholesale reseller pricing. Our digital catalog includes VPN services for secure browsing, <strong className="text-foreground">CapCut Pro</strong> editing tools for content creators, AI-powered productivity accounts, and gaming top-ups like <strong className="text-foreground">Mobile Legends Diamonds</strong>. Every digital product is fulfilled instantly through our automated delivery system — purchase and receive your credentials in seconds.
              </p>

              <h3 className="text-lg font-semibold text-foreground pt-2">Built for Myanmar Resellers</h3>
              <p>
                KKTechDeals is purpose-built for the Myanmar reseller market. Our platform supports <strong className="text-foreground">local payment methods</strong> including KBZPay, WavePay, CB Pay, AYA Pay, and direct bank transfers — no international credit card required. Pricing is displayed in Myanmar Kyat (MMK) with real-time USD conversion for international services. Our <strong className="text-foreground">secure wallet system</strong> lets you top up once and purchase multiple products without repeated payment steps, while volume-based <strong className="text-foreground">pricing tiers</strong> automatically apply discounts as your order volume grows.
              </p>

              <p>
                Every transaction is tracked with a unique order code, downloadable PDF receipts, and real-time status updates. Our admin-verified provider network ensures quality and accountability on every order. Whether you're a solo mobile shop owner or a large-scale reseller operation, KKTechDeals gives you the tools, pricing, and reliability to grow your business in Myanmar's digital economy.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-border bg-card py-12">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:grid-cols-3 sm:px-8">
          <div>
            <span className="text-xl font-extrabold text-foreground">
              KK<span className="text-primary">Tech</span>
            </span>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Myanmar's wholesale GSM unlock server and digital accounts reseller platform.
              Instant IMEI services, VPN keys, and premium digital tools at competitive pricing.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 text-sm">
            <span className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Quick Links
            </span>
            <a href="#services" className="text-secondary-foreground transition-colors hover:text-primary">Services</a>
            <a href="#faq" className="text-secondary-foreground transition-colors hover:text-primary">FAQ</a>
            <Link to="/tools/imei-check" className="text-secondary-foreground transition-colors hover:text-primary">Free IMEI Checker</Link>
            <Link to="/login" className="text-secondary-foreground transition-colors hover:text-primary">Reseller Login</Link>
          </div>
          <div className="flex flex-col gap-2.5 text-sm">
            <span className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Policies
            </span>
            <Link to="/terms" className="text-secondary-foreground transition-colors hover:text-primary">Terms &amp; Conditions</Link>
            <Link to="/terms" className="text-secondary-foreground transition-colors hover:text-primary">Privacy Policy</Link>
            <Link to="/terms" className="text-secondary-foreground transition-colors hover:text-primary">Refund Policy</Link>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-6xl border-t border-border px-5 pt-6 sm:px-8">
          <p className="text-center text-xs text-muted-foreground font-medium">
            © {new Date().getFullYear()} KKTech. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ═══════════ FLOATING CONTACT BUTTON ═══════════ */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
        {contactOpen && (
          <div className="mb-1 flex flex-col gap-2 animate-fade-in">
            <a
              href="https://t.me/kktech_support"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-elevated transition-all hover:bg-muted"
            >
              <Send className="h-4 w-4 text-[hsl(200_80%_50%)]" />
              Telegram
            </a>
            <a
              href="viber://chat?number=%2B959xxxxxxxxx"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-elevated transition-all hover:bg-muted"
            >
              <Phone className="h-4 w-4 text-[hsl(270_60%_55%)]" />
              Viber
            </a>
          </div>
        )}
        <button
          onClick={() => setContactOpen(!contactOpen)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated transition-transform hover:scale-105 active:scale-95"
          aria-label="Contact support"
        >
          {contactOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </button>
      </div>
    </>
  );
}
