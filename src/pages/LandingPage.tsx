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
    <div ref={ref} className="relative group text-center rounded-2xl border border-border/40 bg-card/50 backdrop-blur-xl p-8 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/[0.08] transition-transform duration-300 group-hover:scale-110">
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
            <div className="absolute top-[60%] right-[20%] w-[300px] h-[300px] rounded-full bg-primary/[0.04] blur-[80px] animate-float-gentle" style={{ animationDelay: "-6s" }} />
          </div>

          <div className="relative mx-auto max-w-[1200px] px-6 pt-20 pb-16 sm:pt-28 sm:pb-20 md:pt-36 md:pb-28 lg:pt-44 lg:pb-36">
            <div className="flex flex-col items-center text-center relative z-10">
              {/* Trust badge */}
              <ScrollReveal>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] backdrop-blur-xl px-5 py-2 mb-8 shadow-[0_0_30px_-8px_hsl(var(--primary)/0.25)]">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-primary/80">Trusted by technicians and resellers worldwide</span>
                </div>
              </ScrollReveal>

              {/* Main heading */}
              <ScrollReveal delay={100}>
                <h1 className="text-[2.5rem] font-black leading-[1.06] tracking-tight sm:text-[3.5rem] lg:text-[4.5rem] max-w-4xl">
                  <span className="text-foreground">KKTech</span>{" "}
                  <span className="gradient-text">Reseller</span>
                  <br />
                  <span className="text-foreground">Platform</span>
                </h1>
              </ScrollReveal>

              {/* Subtitle */}
              <ScrollReveal delay={200}>
                <p className="mt-4 text-lg sm:text-xl font-semibold text-foreground/80 tracking-wide">
                  Professional Unlock Services Marketplace for Technicians
                </p>
              </ScrollReveal>

              {/* Description */}
              <ScrollReveal delay={300}>
                <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
                  Access premium unlock services, IMEI tools, and digital services from a single powerful platform.
                </p>
              </ScrollReveal>

              {/* CTA Buttons */}
              <ScrollReveal delay={400}>
                <div className="mt-10 flex flex-col sm:flex-row gap-4">
                  <Button size="lg" variant="premium" className="h-14 px-10 text-base font-bold shadow-[0_0_40px_-8px_hsl(var(--primary)/0.5)]" asChild>
                    <Link to="/login">
                      Start Ordering <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" className="h-14 px-10 text-base font-semibold border-border/60 bg-card/40 backdrop-blur-sm hover:bg-card/70" asChild>
                    <Link to="/login">Create Reseller Account</Link>
                  </Button>
                </div>
              </ScrollReveal>

              {/* Floating device illustrations */}
              <ScrollReveal delay={500}>
                <div className="mt-16 relative w-full max-w-3xl mx-auto">
                  <div className="flex justify-center items-end gap-4 sm:gap-8">
                    {/* Phone mockup left */}
                    <div className="w-[100px] sm:w-[140px] h-[200px] sm:h-[280px] rounded-[20px] sm:rounded-[28px] border-2 border-border/30 bg-card/60 backdrop-blur-xl shadow-2xl transform -rotate-6 translate-y-4 transition-transform duration-500 hover:rotate-0 hover:translate-y-0">
                      <div className="p-2 sm:p-3 pt-6 sm:pt-8 space-y-2">
                        <div className="h-2 w-3/4 bg-primary/20 rounded-full" />
                        <div className="h-2 w-1/2 bg-muted rounded-full" />
                        <div className="mt-3 sm:mt-4 space-y-1.5">
                          <div className="h-6 sm:h-8 rounded-lg bg-primary/[0.08] border border-primary/10" />
                          <div className="h-6 sm:h-8 rounded-lg bg-accent/[0.06] border border-accent/10" />
                          <div className="h-6 sm:h-8 rounded-lg bg-primary/[0.05] border border-border/20" />
                        </div>
                      </div>
                    </div>

                    {/* Main device */}
                    <div className="w-[160px] sm:w-[220px] h-[260px] sm:h-[360px] rounded-[24px] sm:rounded-[32px] border-2 border-primary/20 bg-card/70 backdrop-blur-xl shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.2)] z-10 transition-transform duration-500 hover:-translate-y-2">
                      <div className="p-3 sm:p-4 pt-8 sm:pt-10 space-y-3">
                        <div className="text-center">
                          <div className="h-3 w-2/3 mx-auto bg-primary/30 rounded-full mb-1" />
                          <div className="h-2 w-1/2 mx-auto bg-muted rounded-full" />
                        </div>
                        <div className="mt-2 sm:mt-4 grid grid-cols-2 gap-1.5 sm:gap-2">
                          {["Unlock", "IMEI", "iCloud", "Status"].map((label) => (
                            <div key={label} className="h-12 sm:h-16 rounded-xl bg-primary/[0.06] border border-primary/10 flex items-center justify-center">
                              <span className="text-[8px] sm:text-[10px] font-semibold text-primary/60">{label}</span>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-5 sm:h-7 rounded-lg bg-muted/50 border border-border/20" />
                          <div className="h-5 sm:h-7 rounded-lg bg-muted/30 border border-border/10" />
                        </div>
                      </div>
                    </div>

                    {/* Phone mockup right */}
                    <div className="w-[100px] sm:w-[140px] h-[200px] sm:h-[280px] rounded-[20px] sm:rounded-[28px] border-2 border-border/30 bg-card/60 backdrop-blur-xl shadow-2xl transform rotate-6 translate-y-4 transition-transform duration-500 hover:rotate-0 hover:translate-y-0">
                      <div className="p-2 sm:p-3 pt-6 sm:pt-8 space-y-2">
                        <div className="h-2 w-2/3 bg-accent/20 rounded-full" />
                        <div className="h-2 w-1/3 bg-muted rounded-full" />
                        <div className="mt-3 sm:mt-4 space-y-1.5">
                          <div className="flex items-center gap-1.5 h-6 sm:h-8 rounded-lg bg-green-500/[0.08] border border-green-500/10 px-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            <div className="h-1.5 flex-1 bg-green-500/15 rounded-full" />
                          </div>
                          <div className="flex items-center gap-1.5 h-6 sm:h-8 rounded-lg bg-amber-500/[0.06] border border-amber-500/10 px-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <div className="h-1.5 flex-1 bg-amber-500/10 rounded-full" />
                          </div>
                          <div className="flex items-center gap-1.5 h-6 sm:h-8 rounded-lg bg-primary/[0.05] border border-border/20 px-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                            <div className="h-1.5 flex-1 bg-primary/10 rounded-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ═══════════ FEATURES ═══════════ */}
        <section id="features" className="relative border-y border-border/40 py-20 sm:py-28 bg-card/20">
          <div className="pointer-events-none absolute inset-0" style={{
            background: "radial-gradient(800px circle at 50% 0%, hsl(var(--primary) / 0.04), transparent 60%)",
          }} />
          <div className="relative mx-auto max-w-[1200px] px-6">
            <ScrollReveal>
              <div className="text-center">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary/70">Platform Features</p>
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
                  <div className="group relative rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-7 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 h-full">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/[0.08] transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/[0.12]">
                      <feat.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-2">{feat.title}</h3>
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
      <footer className="border-t border-border/40">
        <div className="mx-auto max-w-[1200px] px-6 pt-16 pb-8">
          <div className="grid gap-12 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <span className="flex items-center gap-2.5">
                <img src={kkLogo} alt="KKTech" className="h-7 w-7 rounded-lg" />
                <span className="text-xl font-extrabold text-foreground">
                  KK<span className="text-primary">Tech</span>
                </span>
              </span>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Professional unlock services marketplace for technicians and resellers. Fast processing, transparent pricing, reliable delivery.
              </p>
              <div className="mt-6 flex gap-3">
                <a href="https://t.me/kkremote" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary" aria-label="Telegram">
                  <Send className="h-4 w-4" />
                </a>
                <a href="https://t.me/KKTechDeals" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary" aria-label="Channel">
                  <MessageCircle className="h-4 w-4" />
                </a>
                <a href="viber://chat?number=%2B959787313137" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary" aria-label="Viber">
                  <Phone className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <span className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Quick Links</span>
              <Link to="/login" className="text-muted-foreground transition-colors hover:text-foreground">Login</Link>
              <Link to="/login" className="text-muted-foreground transition-colors hover:text-foreground">Create Account</Link>
              <Link to="/terms" className="text-muted-foreground transition-colors hover:text-foreground">Terms & Conditions</Link>
              <a href="https://t.me/kkremote" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-foreground">Support</a>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <span className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Connect</span>
              <a href="https://t.me/kkremote" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-foreground">Telegram</a>
              <a href="https://t.me/KKTechDeals" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-foreground">Telegram Channel</a>
              <Link to="/tools/imei-check" className="text-muted-foreground transition-colors hover:text-foreground">Free IMEI Check</Link>
              <Link to="/blog" className="text-muted-foreground transition-colors hover:text-foreground">Blog</Link>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center gap-3 border-t border-border/20 pt-8 sm:flex-row sm:justify-between">
            <p className="text-xs text-muted-foreground/60">© {new Date().getFullYear()} KKTech. All rights reserved.</p>
            <p className="text-xs text-muted-foreground/40">Built for resellers, by resellers.</p>
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
