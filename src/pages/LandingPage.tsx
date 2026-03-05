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
  Shield,
  Clock,
  Globe,
  Headphones,
  CreditCard,
  Cloud,
  Smartphone,
  Lock,
  Search,
  Code,
  Wrench,
  UserPlus,
  Wallet,
  MousePointerClick,
  CheckCircle2,
  Languages,
  BarChart3,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { useLang } from "@/contexts/LangContext";
import HeroIphoneMockup from "@/components/landing/HeroIphoneMockup";
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
      transform: visible ? "translateY(0)" : "translateY(16px)",
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

/* ───────── ANIMATED STAT ───────── */
function AnimatedStat({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const { display, ref } = useCountUpOnView(target, 1200);
  return (
    <div ref={ref} className="text-center">
      <p className="text-3xl sm:text-4xl font-black tracking-tight gradient-text">
        {display.toLocaleString()}{suffix}
      </p>
      <p className="mt-1.5 text-xs sm:text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

/* ───────── DATA ───────── */
const services = [
  { icon: Cloud, title: "iCloud Removal", desc: "Remove iCloud activation lock from any Apple device securely and permanently.", color: "text-sky-400" },
  { icon: Search, title: "IMEI Check", desc: "Instant carrier, warranty, and blacklist status checks for any device worldwide.", color: "text-emerald-400" },
  { icon: Lock, title: "Carrier Unlock", desc: "Unlock devices from any carrier globally. Support for 200+ networks.", color: "text-amber-400" },
  { icon: Shield, title: "Apple ID Services", desc: "Professional Apple ID and activation solutions for technicians.", color: "text-violet-400" },
  { icon: Code, title: "API Services", desc: "RESTful API access for bulk operations and automated service integration.", color: "text-rose-400" },
];

const platformFeatures = [
  { icon: Zap, title: "Instant Delivery", desc: "Most services fulfilled automatically in seconds." },
  { icon: ShieldCheck, title: "Secure Payments", desc: "Encrypted wallet system with fraud protection." },
  { icon: Activity, title: "Real-time Tracking", desc: "Live order status updates and notifications." },
  { icon: Code, title: "API Integration", desc: "Full REST API for automated bulk operations." },
  { icon: Wrench, title: "Professional Tools", desc: "Built for technicians and resellers at scale." },
  { icon: Globe, title: "Global Coverage", desc: "200+ carriers across 120+ countries supported." },
];

const steps = [
  { icon: UserPlus, step: "01", title: "Create Account", desc: "Sign up in seconds. No minimums required." },
  { icon: Wallet, step: "02", title: "Add Balance", desc: "Top up via KBZPay, WavePay, or bank transfer." },
  { icon: MousePointerClick, step: "03", title: "Select Service", desc: "Browse and order from our service catalog." },
  { icon: CheckCircle2, step: "04", title: "Get Results", desc: "Receive results instantly or within hours." },
];

const faqs = [
  { q: "How long does IMEI unlock take?", a: "Many services are instant. Carrier-dependent iPhone unlocks typically take 1–5 business days." },
  { q: "How do I become a reseller?", a: "Register for free, top up your wallet, and start ordering at wholesale prices. No minimums." },
  { q: "What payment methods do you accept?", a: "KBZPay, WavePay, CB Pay, AYA Pay, and direct bank transfers. Top-ups approved within 5–15 minutes." },
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
    description: "Premium Apple device services platform. IMEI unlock, iCloud removal, and digital services for resellers and technicians.",
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
   LANDING PAGE — PREMIUM SAAS
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
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={kkLogo} alt="KKTech" className="h-8 w-8 rounded-lg" />
            <span className="text-xl font-extrabold tracking-tight text-foreground">
              KK<span className="text-primary">Tech</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#services" className="transition-colors hover:text-foreground">Services</a>
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#how-it-works" className="transition-colors hover:text-foreground">How It Works</a>
            <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={toggleLang} className="h-9 w-9 text-muted-foreground hover:text-foreground" aria-label="Toggle language">
              <Languages className="h-4 w-4" />
            </Button>
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
          {/* Grid background */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(hsl(var(--foreground) / 0.12) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.12) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />

          {/* Floating orbs */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute top-[15%] left-[10%] w-[400px] h-[400px] rounded-full bg-primary/[0.07] blur-[100px] animate-float-gentle" />
            <div className="absolute top-[30%] right-[5%] w-[350px] h-[350px] rounded-full bg-accent/[0.06] blur-[100px] animate-float-gentle" style={{ animationDelay: "-3s" }} />
            <div className="absolute bottom-[10%] left-[40%] w-[300px] h-[300px] rounded-full bg-primary-glow/[0.05] blur-[80px] animate-float-gentle" style={{ animationDelay: "-5s" }} />
          </div>

          <div className="relative mx-auto max-w-[1120px] px-6 pt-20 pb-16 sm:pt-28 sm:pb-24 md:pt-36 md:pb-32">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-8 items-center">
              {/* LEFT */}
              <ScrollReveal className="text-center md:text-left relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] backdrop-blur-xl px-4 py-1.5 mb-6 shadow-[0_0_20px_-6px_hsl(var(--primary)/0.2)]">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary/80">Trusted by technicians and resellers worldwide</span>
                </div>

                <h1 className="text-[2.2rem] font-black leading-[1.08] tracking-tight sm:text-[3rem] lg:text-[3.6rem]">
                  <span className="text-foreground">Premium</span>{" "}
                  <span className="gradient-text">Apple Device</span>
                  <br />
                  <span className="text-foreground">Solutions</span>
                </h1>

                <p className="mt-5 text-base sm:text-lg font-medium text-muted-foreground tracking-wide">
                  Unlock&ensp;•&ensp;iCloud&ensp;•&ensp;IMEI&ensp;•&ensp;Repair Services
                </p>

                <div className="mt-8 flex flex-wrap gap-3 justify-center md:justify-start">
                  <Button size="lg" variant="premium" className="h-12 px-8 text-sm font-bold shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)]" asChild>
                    <Link to="/login">
                      Get Started <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" className="h-12 px-8 text-sm font-semibold border-border/60 bg-card/40 backdrop-blur-sm hover:bg-card/70" asChild>
                    <Link to="/tools/imei-check">Check IMEI</Link>
                  </Button>
                </div>
              </ScrollReveal>

              {/* RIGHT */}
              <ScrollReveal delay={200} className="flex justify-center md:justify-end relative z-0">
                <div className="w-[220px] sm:w-[280px] md:w-[300px] lg:w-[340px] max-sm:opacity-80">
                  <HeroIphoneMockup />
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ═══════════ TRUST STATS ═══════════ */}
        <section className="border-y border-border/30 bg-card/20 backdrop-blur-sm">
          <div className="mx-auto max-w-[1120px] px-6 py-14 sm:py-16">
            <ScrollReveal>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
                <AnimatedStat target={1200} suffix="+" label="Technicians" />
                <AnimatedStat target={30000} suffix="+" label="Orders Completed" />
                <AnimatedStat target={98} suffix="%" label="Success Rate" />
                <AnimatedStat target={24} suffix="/7" label="Support Available" />
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══════════ SERVICES ═══════════ */}
        <section id="services" className="relative py-20 sm:py-28">
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: "linear-gradient(hsl(var(--foreground) / 0.1) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
          <div className="relative mx-auto max-w-[1120px] px-6">
            <ScrollReveal>
              <div className="text-center">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary/70">Services</p>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl gradient-text">
                  Everything You Need
                </h2>
                <p className="mt-3 text-base text-muted-foreground max-w-lg mx-auto">
                  Professional Apple device services for technicians and resellers.
                </p>
              </div>
            </ScrollReveal>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s, i) => (
                <ScrollReveal key={s.title} delay={i * 80}>
                  <div className="group relative rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
                    <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/[0.08] transition-transform duration-300 group-hover:scale-110`}>
                      <s.icon className={`h-5 w-5 ${s.color}`} />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">{s.title}</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
                    <Link
                      to="/login"
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0"
                    >
                      Order Now <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ PLATFORM FEATURES ═══════════ */}
        <section id="features" className="relative border-y border-border/40 py-20 sm:py-28 bg-card/20">
          <div className="pointer-events-none absolute inset-0" style={{
            background: "radial-gradient(800px circle at 50% 0%, hsl(var(--primary) / 0.04), transparent 60%)",
          }} />
          <div className="relative mx-auto max-w-[1120px] px-6">
            <ScrollReveal>
              <div className="text-center">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary/70">Platform</p>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl gradient-text">
                  Why KKTech Platform
                </h2>
                <p className="mt-3 text-base text-muted-foreground max-w-lg mx-auto">
                  Built for professionals who demand speed, security, and scale.
                </p>
              </div>
            </ScrollReveal>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {platformFeatures.map((feat, i) => (
                <ScrollReveal key={feat.title} delay={i * 70}>
                  <div className="group flex items-start gap-4 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-5 transition-all duration-300 hover:border-primary/25 hover:bg-card/80">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/[0.12]">
                      <feat.icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{feat.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{feat.desc}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ HOW IT WORKS ═══════════ */}
        <section id="how-it-works" className="relative py-20 sm:py-28">
          <div className="mx-auto max-w-[1120px] px-6">
            <ScrollReveal>
              <div className="text-center">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary/70">Process</p>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl gradient-text">
                  How It Works
                </h2>
              </div>
            </ScrollReveal>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <ScrollReveal key={s.step} delay={i * 100}>
                  <div className="relative text-center rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-6 pt-8">
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {i + 1}
                    </span>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/[0.08]">
                      <s.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1.5">{s.title}</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ FAQ ═══════════ */}
        <section id="faq" className="relative border-t border-border/40 py-20 sm:py-28 bg-card/20">
          <div className="relative mx-auto max-w-[800px] px-6">
            <ScrollReveal>
              <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-primary/70">Support</p>
              <h2 className="mb-4 text-center text-2xl font-bold tracking-tight sm:text-3xl gradient-text">
                Frequently Asked Questions
              </h2>
              <p className="mb-12 text-center text-sm text-muted-foreground">
                Quick answers to common questions about our platform.
              </p>
            </ScrollReveal>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((f, i) => (
                <ScrollReveal key={i} delay={i * 50}>
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
          <div className="mx-auto max-w-[1120px] px-6">
            <ScrollReveal>
              <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl px-8 py-16 text-center sm:px-16 sm:py-20">
                <div className="pointer-events-none absolute inset-0 rounded-3xl" style={{
                  background: "radial-gradient(600px circle at 50% 40%, hsl(var(--primary) / 0.06), transparent 60%)",
                }} />
                <div className="relative">
                  <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                    Start unlocking devices today
                  </h2>
                  <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
                    Join thousands of technicians and resellers using KKTech for reliable Apple device services.
                  </p>
                  <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                    <Button size="lg" className="h-12 px-10 text-sm font-semibold" asChild>
                      <Link to="/login">Create Account</Link>
                    </Button>
                    <Button variant="outline" size="lg" className="h-12 px-10 text-sm font-semibold" asChild>
                      <a href="#services" className="inline-flex items-center gap-2">
                        View Services <ArrowRight className="h-3.5 w-3.5" />
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
          <h2>KKTech — Premium Apple Device Services Platform</h2>
          <p>KKTech provides premium Apple device services including iCloud removal, IMEI checks, carrier unlock, and repair solutions for technicians and resellers worldwide.</p>
        </section>
      </main>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-border/40">
        <div className="mx-auto max-w-[1120px] px-6 pt-16 pb-8">
          <div className="grid gap-12 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <span className="flex items-center gap-2.5">
                <img src={kkLogo} alt="KKTech" className="h-7 w-7 rounded-lg" />
                <span className="text-xl font-extrabold text-foreground">
                  KK<span className="text-primary">Tech</span>
                </span>
              </span>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Premium Apple device services platform for professional technicians and resellers. Fast processing, transparent pricing, reliable delivery.
              </p>
              <div className="mt-6 flex gap-3">
                <a href="https://t.me/kkremote" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary" aria-label="Telegram">
                  <Send className="h-4 w-4" />
                </a>
                <a href="viber://chat?number=%2B959787313137" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary" aria-label="Viber">
                  <Phone className="h-4 w-4" />
                </a>
                <a href="https://t.me/KKTechDeals" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary" aria-label="Channel">
                  <MessageCircle className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <span className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Quick Links</span>
              <a href="#services" className="text-muted-foreground transition-colors hover:text-foreground">Services</a>
              <a href="#faq" className="text-muted-foreground transition-colors hover:text-foreground">FAQ</a>
              <Link to="/tools/imei-check" className="text-muted-foreground transition-colors hover:text-foreground">Free IMEI Checker</Link>
              <Link to="/blog" className="text-muted-foreground transition-colors hover:text-foreground">Blog</Link>
              <Link to="/login" className="text-muted-foreground transition-colors hover:text-foreground">Reseller Login</Link>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <span className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Policies</span>
              <Link to="/terms" className="text-muted-foreground transition-colors hover:text-foreground">Terms & Conditions</Link>
              <Link to="/terms" className="text-muted-foreground transition-colors hover:text-foreground">Privacy Policy</Link>
              <Link to="/terms" className="text-muted-foreground transition-colors hover:text-foreground">Refund Policy</Link>
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
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
          aria-label="Contact support"
        >
          {contactOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
}
