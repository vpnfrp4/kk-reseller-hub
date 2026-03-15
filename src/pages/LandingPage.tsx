import { useState, useRef, useEffect, forwardRef, CSSProperties, ReactNode } from "react";
import { SITE_URL } from "@/lib/utils";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  MessageCircle,
  Send,
  Phone,
  X,
  Zap,
  ShieldCheck,
  Clock,
  Globe,
  CreditCard,
  Smartphone,
  Lock,
  Search,
  UserPlus,
  Wallet,
  MousePointerClick,
  CheckCircle2,
  Languages,
  Activity,
  Bell,
  BotMessageSquare,
  Server,
  BarChart3,
  Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { useLang } from "@/contexts/LangContext";
import kkLogo from "@/assets/kkremote-logo.png";
import landingBanner from "@/assets/landing-banner.png";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useCountUpOnView } from "@/hooks/use-count-up";

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
      transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms`,
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

/* ───────── ANIMATED STAT ───────── */
function AnimatedStat({ target, suffix, label, icon: Icon }: { target: number; suffix: string; label: string; icon: typeof Zap }) {
  const { display, ref } = useCountUpOnView(target, 1400);
  return (
    <div ref={ref} className="relative group text-center rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-8 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
      {/* Top accent shine */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent rounded-t-2xl" />
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/[0.08] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_16px_-4px_hsl(var(--primary)/0.3)]">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <p className="text-3xl sm:text-4xl font-black tracking-tight gradient-text">
        {display.toLocaleString()}{suffix}
      </p>
      <p className="mt-2 text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

/* ───────── DATA ───────── */
const features = [
  { icon: Zap, title: "Instant Service Ordering", desc: "Browse and order services in seconds. Automated fulfillment delivers results instantly for supported services." },
  { icon: Activity, title: "Real-time Order Tracking", desc: "Monitor every order with live status updates, push notifications, and detailed progress timeline." },
  { icon: CreditCard, title: "Secure Wallet System", desc: "Encrypted digital wallet with instant top-ups, transaction history, and automated balance management." },
  { icon: BotMessageSquare, title: "Telegram Bot Automation", desc: "Receive instant order notifications, wallet alerts, and execute quick commands directly from Telegram." },
  { icon: Globe, title: "Global Unlock Services", desc: "Access 200+ carriers across 120+ countries. Support for all major device brands and networks worldwide." },
  { icon: ShieldCheck, title: "High Success Rate", desc: "Industry-leading success rates backed by verified providers and rigorous quality control processes." },
];

const steps = [
  { icon: UserPlus, step: "01", title: "Create Reseller Account", desc: "Sign up in seconds with your email. No minimums, no commitments required to get started." },
  { icon: Wallet, step: "02", title: "Add Funds to Wallet", desc: "Top up via KBZPay, WavePay, bank transfer, or Binance. Approved within minutes." },
  { icon: MousePointerClick, step: "03", title: "Start Ordering Services", desc: "Browse the catalog, select your service, submit details, and receive results automatically." },
];

const popularServices = [
  { name: "Softbank Japan Unlock", category: "Carrier Unlock", price: "$12.50" },
  { name: "Apple ID USA", category: "Apple Services", price: "$45.00" },
  { name: "IMEI Activation Check", category: "IMEI Tools", price: "$0.50" },
  { name: "Blacklist Status", category: "IMEI Tools", price: "$1.00" },
];

const telegramFeatures = [
  { icon: Bell, title: "Order Status Updates", desc: "Get instant notifications when your orders are completed or updated." },
  { icon: Wallet, title: "Wallet Alerts", desc: "Receive balance notifications for top-ups and deductions in real-time." },
  { icon: BotMessageSquare, title: "Quick Commands", desc: "Check order status, view balance, and browse services directly in Telegram." },
];

const faqs = [
  { q: "How long does IMEI unlock take?", a: "Many services are instant. Carrier-dependent iPhone unlocks typically take 1–5 business days depending on the carrier." },
  { q: "How do I become a reseller?", a: "Register for free, top up your wallet, and start ordering at wholesale prices. No minimum orders required." },
  { q: "What payment methods do you accept?", a: "KBZPay, WavePay, CB Pay, AYA Pay, direct bank transfers, and Binance. Top-ups are approved within 5–15 minutes." },
  { q: "Is it safe and secure?", a: "All transactions use our secure wallet system with fraud protection. Every order generates a verifiable receipt." },
];

/* ───────── JSON-LD ───────── */
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
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }} />;
}

function OrgWebsiteJsonLd() {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "KKTech",
    url: SITE_URL,
    logo: `${SITE_URL}/pwa-512x512.png`,
    description: "Professional unlock services marketplace for technicians. IMEI unlock, carrier unlock, and digital services platform.",
    contactPoint: { "@type": "ContactPoint", contactType: "customer support", url: "https://t.me/kkremote" },
    sameAs: ["https://t.me/kkremote", "https://t.me/KKTechDeals"],
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "KKTech",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/dashboard/products?q={search_term_string}`,
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

/* ═══════════════════════════════════════════════════════
   LANDING PAGE — PREMIUM SAAS (LetsVPN / Stripe inspired)
   ═══════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [contactOpen, setContactOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const { lang, toggle: toggleLang } = useLang();

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen w-full" style={{ overflow: "visible" }}>
      <FaqJsonLd />
      <OrgWebsiteJsonLd />

      {/* ─── STICKY NAV ─── */}
      <header
        className="sticky top-0 z-50 border-b transition-all duration-300"
        style={{
          borderColor: scrollY > 20 ? "hsl(var(--border) / 0.5)" : "transparent",
          background: scrollY > 20 ? "hsl(var(--background) / 0.85)" : "hsl(var(--background) / 0.6)",
          backdropFilter: "blur(20px) saturate(1.4)",
          WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        }}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={kkLogo} alt="KKTech" className="h-8 w-8 rounded-lg" />
            <span className="text-xl font-extrabold tracking-tight text-foreground">
              KK<span className="text-primary">Tech</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#how-it-works" className="transition-colors hover:text-foreground">How It Works</a>
            <a href="#services" className="transition-colors hover:text-foreground">Services</a>
            <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="text-sm font-medium" asChild>
              <Link to="/login">Log In</Link>
            </Button>
            <Button size="sm" variant="premium" className="text-sm px-5 font-semibold" asChild>
              <Link to="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full" style={{ overflow: "visible" }}>

        {/* ═══════════ HERO ═══════════ */}
        <section className="relative overflow-hidden">
          {/* Tech grid background */}
          <div className="absolute inset-0 opacity-[0.035]" style={{
            backgroundImage: "linear-gradient(hsl(var(--foreground) / 0.1) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }} />

          {/* Floating gradient orbs */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute top-[8%] left-[5%] w-[500px] h-[500px] rounded-full bg-primary/[0.08] blur-[120px] animate-float-gentle" />
            <div className="absolute top-[20%] right-[0%] w-[450px] h-[450px] rounded-full bg-accent/[0.07] blur-[120px] animate-float-gentle" style={{ animationDelay: "-2s" }} />
            <div className="absolute bottom-[5%] left-[30%] w-[400px] h-[400px] rounded-full bg-primary-glow/[0.06] blur-[100px] animate-float-gentle" style={{ animationDelay: "-4s" }} />
          </div>

          <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 pt-16 pb-12 sm:pt-24 sm:pb-20 md:pt-28 md:pb-24">
            {/* ─── Text content ─── */}
            <ScrollReveal>
              <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-4 py-1.5 mb-6">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary/90">Myanmar&apos;s #1 Digital Unlock Platform</span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] gradient-text">
                  Professional Unlock
                  <br />
                  <span className="text-foreground">Services at Scale</span>
                </h1>
                <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                  Instant IMEI unlock, GSM tools, and premium digital subscriptions. Built for resellers who demand speed, reliability, and wholesale pricing.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button size="lg" variant="premium" className="text-base px-8 py-6 font-semibold w-full sm:w-auto" asChild>
                    <Link to="/login">
                      Get Started Free
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="text-base px-8 py-6 font-medium w-full sm:w-auto border-border/50 hover:bg-secondary/50" asChild>
                    <a href="#features">
                      Explore Features
                    </a>
                  </Button>
                </div>
              </div>
            </ScrollReveal>

            {/* ─── Banner image ─── */}
            <ScrollReveal delay={150}>
              <div className="relative w-full max-w-5xl mx-auto group">
                {/* Glow behind the image */}
                <div className="absolute -inset-4 sm:-inset-6 rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-b from-primary/[0.12] via-primary/[0.04] to-transparent blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none" />
                {/* Subtle border frame */}
                <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-border/30 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] group-hover:shadow-[0_24px_70px_-12px_rgba(0,0,0,0.5)] transition-shadow duration-500">
                  <img
                    src={landingBanner}
                    alt="KarKar4 Store - Premium Digital Services including VPN, Netflix, Spotify, CapCut"
                    className="w-full block"
                    loading="eager"
                    fetchPriority="high"
                  />
                  {/* Bottom fade overlay for seamless blend */}
                  <div className="absolute inset-x-0 bottom-0 h-16 sm:h-24 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══════════ FEATURES ═══════════ */}
        <section id="features" className="relative border-y border-border/40 py-20 sm:py-28 bg-card/20">
          <div className="pointer-events-none absolute inset-0" style={{
            background: "radial-gradient(800px circle at 50% 0%, hsl(var(--primary) / 0.04), transparent 60%)",
          }} />
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.015]" style={{
            backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }} />
          <div className="relative mx-auto max-w-[1200px] px-6">
            <ScrollReveal>
              <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/[0.05] px-4 py-1.5 mb-4">
                  <Zap className="w-3 h-3 text-primary" />
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80">Platform Features</p>
                </div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl gradient-text">
                  Everything You Need to Scale
                </h2>
                <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
                  A complete toolkit built for professional technicians who demand reliability and speed.
                </p>
              </div>
            </ScrollReveal>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feat, i) => (
                <ScrollReveal key={feat.title} delay={i * 80}>
                  <div className="group relative rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-7 transition-all duration-300 hover:border-primary/25 hover:shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.15)] hover:-translate-y-1.5 h-full overflow-hidden">
                    {/* Top shine line */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    {/* Corner glow */}
                    <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-primary/[0.04] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/[0.08] transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-primary/[0.12] group-hover:shadow-[0_0_24px_-6px_hsl(var(--primary)/0.3)] relative">
                      <feat.icon className="h-5 w-5 text-primary relative z-10" />
                      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ boxShadow: "inset 0 0 12px hsl(var(--primary) / 0.15)" }} />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">{feat.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{feat.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ HOW IT WORKS ═══════════ */}
        <section id="how-it-works" className="relative py-20 sm:py-28">
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: "linear-gradient(hsl(var(--foreground) / 0.1) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }} />
          <div className="relative mx-auto max-w-[1200px] px-6">
            <ScrollReveal>
              <div className="text-center">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary/70">Get Started</p>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl gradient-text">
                  How It Works
                </h2>
                <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-lg mx-auto">
                  Three simple steps to start ordering unlock services.
                </p>
              </div>
            </ScrollReveal>

            <div className="mt-14 grid gap-6 sm:grid-cols-3">
              {steps.map((s, i) => (
                <ScrollReveal key={s.step} delay={i * 120}>
                  <div className="relative group rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-8 text-center transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                    {/* Step number */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-[0_0_20px_-4px_hsl(var(--primary)/0.4)]">
                      {i + 1}
                    </div>
                    {/* Connector line */}
                    {i < steps.length - 1 && (
                      <div className="hidden sm:block absolute top-8 -right-3 w-6 border-t-2 border-dashed border-primary/20 z-10" />
                    )}
                    <div className="mx-auto mb-5 mt-2 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/[0.08] transition-transform duration-300 group-hover:scale-110">
                      <s.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-2">{s.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ POPULAR SERVICES ═══════════ */}
        <section id="services" className="relative border-y border-border/40 py-20 sm:py-28 bg-card/20">
          <div className="pointer-events-none absolute inset-0" style={{
            background: "radial-gradient(600px circle at 30% 50%, hsl(var(--accent) / 0.03), transparent 60%)",
          }} />
          <div className="relative mx-auto max-w-[1200px] px-6">
            <ScrollReveal>
              <div className="text-center">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary/70">Catalog</p>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl gradient-text">
                  Popular Services
                </h2>
                <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-lg mx-auto">
                  Browse our most requested unlock and IMEI services.
                </p>
              </div>
            </ScrollReveal>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {popularServices.map((svc, i) => (
                <ScrollReveal key={svc.name} delay={i * 80}>
                  <div className="group rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 flex flex-col h-full">
                    <span className="inline-block self-start text-[10px] font-bold uppercase tracking-widest text-primary/60 bg-primary/[0.06] rounded-full px-3 py-1 mb-4">
                      {svc.category}
                    </span>
                    <h3 className="text-base font-semibold text-foreground mb-2">{svc.name}</h3>
                    <p className="text-2xl font-black gradient-text mb-5 mt-auto">{svc.price}</p>
                    <Button variant="outline" size="sm" className="w-full font-semibold border-primary/20 hover:bg-primary/[0.06] hover:border-primary/40" asChild>
                      <Link to="/login">
                        Order Now <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ PLATFORM STATS ═══════════ */}
        <section className="relative py-20 sm:py-28">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute top-[20%] left-[10%] w-[350px] h-[350px] rounded-full bg-primary/[0.05] blur-[100px] animate-float-gentle" style={{ animationDelay: "-1s" }} />
            <div className="absolute bottom-[10%] right-[15%] w-[300px] h-[300px] rounded-full bg-accent/[0.04] blur-[90px] animate-float-gentle" style={{ animationDelay: "-3s" }} />
          </div>
          <div className="relative mx-auto max-w-[1200px] px-6">
            <ScrollReveal>
              <div className="text-center mb-14">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary/70">Trust</p>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl gradient-text">
                  Platform Statistics
                </h2>
                <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-lg mx-auto">
                  Numbers that speak for themselves.
                </p>
              </div>
            </ScrollReveal>
            <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
              <ScrollReveal delay={0}><AnimatedStat target={10000} suffix="+" label="Orders Processed" icon={BarChart3} /></ScrollReveal>
              <ScrollReveal delay={100}><AnimatedStat target={500} suffix="+" label="Active Technicians" icon={Fingerprint} /></ScrollReveal>
              <ScrollReveal delay={200}><AnimatedStat target={99} suffix=".9%" label="Platform Uptime" icon={Server} /></ScrollReveal>
              <ScrollReveal delay={300}><AnimatedStat target={24} suffix="/7" label="Service Availability" icon={Clock} /></ScrollReveal>
            </div>
          </div>
        </section>

        {/* ═══════════ TELEGRAM INTEGRATION ═══════════ */}
        <section className="relative border-y border-border/40 py-20 sm:py-28 bg-card/20">
          <div className="pointer-events-none absolute inset-0" style={{
            background: "radial-gradient(700px circle at 70% 30%, hsl(var(--primary) / 0.03), transparent 60%)",
          }} />
          <div className="relative mx-auto max-w-[1200px] px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              {/* Left: Content */}
              <ScrollReveal>
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary/70">Automation</p>
                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl gradient-text mb-4">
                    Telegram Integration
                  </h2>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8">
                    Receive instant order notifications directly in Telegram. Stay updated on every order without opening the dashboard.
                  </p>
                  <div className="space-y-5 mb-10">
                    {telegramFeatures.map((tf, i) => (
                      <div key={tf.title} className="flex items-start gap-4 group">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] transition-transform duration-300 group-hover:scale-110">
                          <tf.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{tf.title}</h3>
                          <p className="mt-0.5 text-sm text-muted-foreground">{tf.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button size="lg" variant="premium" className="h-12 px-8 text-sm font-bold shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)]" asChild>
                    <a href="https://t.me/kkremote" target="_blank" rel="noopener noreferrer">
                      <Send className="w-4 h-4 mr-2" /> Connect Telegram
                    </a>
                  </Button>
                </div>
              </ScrollReveal>

              {/* Right: Telegram mockup */}
              <ScrollReveal delay={200}>
                <div className="relative flex justify-center">
                  <div className="w-full max-w-[340px] rounded-2xl border border-border/40 bg-card/70 backdrop-blur-xl p-6 shadow-xl">
                    {/* Chat header */}
                    <div className="flex items-center gap-3 pb-4 border-b border-border/30 mb-4">
                      <div className="h-10 w-10 rounded-full bg-primary/[0.12] flex items-center justify-center">
                        <BotMessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">KKTech Bot</p>
                        <p className="text-xs text-muted-foreground">Online</p>
                      </div>
                    </div>
                    {/* Chat messages */}
                    <div className="space-y-3">
                      <div className="self-end ml-auto max-w-[80%] rounded-xl rounded-br-sm bg-primary/[0.1] border border-primary/20 px-4 py-2.5">
                        <p className="text-xs text-foreground">/check KK-1847</p>
                      </div>
                      <div className="max-w-[90%] rounded-xl rounded-bl-sm bg-card border border-border/40 px-4 py-3">
                        <p className="text-xs font-semibold text-primary mb-1">Order Status</p>
                        <p className="text-xs text-foreground">Softbank Japan Unlock</p>
                        <p className="text-xs text-muted-foreground mt-1">Status: <span className="text-green-400 font-semibold">Completed</span></p>
                      </div>
                      <div className="max-w-[90%] rounded-xl rounded-bl-sm bg-card border border-border/40 px-4 py-3">
                        <p className="text-xs font-semibold text-primary mb-1">Wallet Alert</p>
                        <p className="text-xs text-foreground">Balance credited: $50.00</p>
                        <p className="text-xs text-muted-foreground mt-1">Current balance: <span className="font-semibold text-foreground">$187.50</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ═══════════ FAQ ═══════════ */}
        <section id="faq" className="relative py-20 sm:py-28">
          <div className="relative mx-auto max-w-[800px] px-6">
            <ScrollReveal>
              <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-primary/70">Support</p>
              <h2 className="mb-4 text-center text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl gradient-text">
                Frequently Asked Questions
              </h2>
              <p className="mb-12 text-center text-base text-muted-foreground max-w-lg mx-auto">
                Quick answers to common questions about our platform.
              </p>
            </ScrollReveal>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((f, i) => (
                <ScrollReveal key={i} delay={i * 60}>
                  <AccordionItem
                    value={`faq-${i}`}
                    className="rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm px-6 transition-colors hover:border-border"
                  >
                    <AccordionTrigger className="text-left text-sm font-semibold text-foreground hover:no-underline py-5">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground pb-5">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                </ScrollReveal>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ═══════════ FINAL CTA ═══════════ */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-[1200px] px-6">
            <ScrollReveal>
              <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl px-8 py-16 text-center sm:px-16 sm:py-20">
                <div className="pointer-events-none absolute inset-0 rounded-3xl" style={{
                  background: "radial-gradient(600px circle at 50% 40%, hsl(var(--primary) / 0.06), transparent 60%)",
                }} />
                <div className="relative">
                  <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                    Ready to start ordering?
                  </h2>
                  <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
                    Join thousands of technicians and resellers using KKTech for reliable unlock services.
                  </p>
                  <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                    <Button size="lg" variant="premium" className="h-14 px-10 text-base font-bold shadow-[0_0_40px_-8px_hsl(var(--primary)/0.5)]" asChild>
                      <Link to="/login">Create Account <ArrowRight className="w-4 h-4 ml-2" /></Link>
                    </Button>
                    <Button variant="outline" size="lg" className="h-14 px-10 text-base font-semibold" asChild>
                      <a href="#services" className="inline-flex items-center gap-2">
                        View Services
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* SEO */}
        <section className="sr-only" aria-hidden="false">
          <h2>KKTech — Professional Unlock Services Marketplace</h2>
          <p>KKTech provides professional unlock services, IMEI tools, and digital services for technicians and resellers worldwide. Access premium carrier unlock, iCloud removal, and IMEI check services from a single powerful platform.</p>
        </section>
      </main>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="relative border-t border-border/40 overflow-hidden">
        {/* Footer ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-primary/[0.03] blur-[100px] pointer-events-none" />
        <div className="relative mx-auto max-w-[1200px] px-6 pt-16 pb-8">
          <div className="grid gap-12 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <span className="flex items-center gap-2.5 group">
                <div className="relative">
                  <div className="absolute -inset-1 rounded-lg bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <img src={kkLogo} alt="KKTech" className="relative h-7 w-7 rounded-lg" />
                </div>
                <span className="text-xl font-extrabold text-foreground">
                  KK<span className="text-primary">Tech</span>
                </span>
              </span>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Professional unlock services marketplace for technicians and resellers. Fast processing, transparent pricing, reliable delivery.
              </p>
              <div className="mt-6 flex gap-3">
                {[
                  { href: "https://t.me/kkremote", icon: Send, label: "Telegram" },
                  { href: "https://t.me/KKTechDeals", icon: MessageCircle, label: "Channel" },
                  { href: "viber://chat?number=%2B959787313137", icon: Phone, label: "Viber" },
                ].map((social) => (
                  <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 text-muted-foreground transition-all duration-300 hover:border-primary/40 hover:text-primary hover:shadow-[0_0_12px_-3px_hsl(var(--primary)/0.3)] hover:-translate-y-0.5"
                    aria-label={social.label}>
                    <social.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <span className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Quick Links</span>
              <Link to="/login" className="text-muted-foreground transition-colors hover:text-foreground hover:translate-x-0.5 transform transition-transform duration-200">Login</Link>
              <Link to="/login" className="text-muted-foreground transition-colors hover:text-foreground hover:translate-x-0.5 transform transition-transform duration-200">Create Account</Link>
              <Link to="/terms" className="text-muted-foreground transition-colors hover:text-foreground hover:translate-x-0.5 transform transition-transform duration-200">Terms & Conditions</Link>
              <a href="https://t.me/kkremote" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-foreground hover:translate-x-0.5 transform transition-transform duration-200">Support</a>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <span className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Connect</span>
              <a href="https://t.me/kkremote" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-foreground hover:translate-x-0.5 transform transition-transform duration-200">Telegram</a>
              <a href="https://t.me/KKTechDeals" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-foreground hover:translate-x-0.5 transform transition-transform duration-200">Telegram Channel</a>
              <Link to="/tools/imei-check" className="text-muted-foreground transition-colors hover:text-foreground hover:translate-x-0.5 transform transition-transform duration-200">Free IMEI Check</Link>
              <Link to="/blog" className="text-muted-foreground transition-colors hover:text-foreground hover:translate-x-0.5 transform transition-transform duration-200">Blog</Link>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center gap-3 border-t border-border/20 pt-8 sm:flex-row sm:justify-between">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} KKTech. All rights reserved.</p>
            <p className="text-xs text-muted-foreground/80">Built for resellers, by resellers.</p>
          </div>
        </div>
      </footer>

      {/* ═══════════ FLOATING CONTACT ═══════════ */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
        {contactOpen && (
          <div className="mb-1 flex flex-col gap-2 animate-fade-in">
            <a href="https://t.me/kkremote" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-full border border-border/50 bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-lg transition-all hover:bg-accent/5">
              <Send className="h-4 w-4 text-sky-400" /> Telegram
            </a>
            <a href="viber://chat?number=%2B959787313137" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-full border border-border/50 bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-lg transition-all hover:bg-accent/5">
              <Phone className="h-4 w-4 text-violet-400" /> Viber
            </a>
          </div>
        )}
        <button
          onClick={() => setContactOpen(!contactOpen)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-95"
          aria-label="Contact support"
        >
          {contactOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
}
