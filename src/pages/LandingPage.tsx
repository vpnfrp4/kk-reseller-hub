import { useState, useRef, useEffect, forwardRef, CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Zap,
  Clock,
  Smartphone,
  Key,
  Sparkles,
  UserPlus,
  CreditCard,
  ShoppingCart,
  Truck,
  ChevronRight,
  CheckCircle2,
  HeadphonesIcon,
  MessageCircle,
  X,
  Send,
  Phone,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

/* ───────── CATEGORIES ───────── */
const categories = [
  {
    icon: Smartphone,
    title: "IMEI Unlock",
    desc: "Official carrier unlocks for iPhone, Samsung & all brands. Multi-provider pricing.",
    link: "/services/imei-unlock",
    tag: "Most Popular",
  },
  {
    icon: Sparkles,
    title: "Digital Accounts",
    desc: "CapCut Pro, Canva Pro, AI tools — wholesale accounts with instant delivery.",
    link: "/login",
    tag: "Instant",
  },
  {
    icon: Key,
    title: "VPN Keys",
    desc: "ExpressVPN, LetsVPN and premium VPN keys at bulk reseller pricing.",
    link: "/services/vpn-keys",
    tag: "Bulk Deals",
  },
];

/* ───────── STEPS ───────── */
const steps = [
  { icon: UserPlus, title: "Register", desc: "Free account in under 2 minutes." },
  { icon: CreditCard, title: "Top Up", desc: "KBZPay, WavePay, or bank transfer." },
  { icon: ShoppingCart, title: "Order", desc: "Browse & buy at wholesale prices." },
  { icon: Truck, title: "Receive", desc: "Instant or scheduled delivery." },
];

/* ───────── TRUST BADGES ───────── */
const trustBadges = [
  { icon: Shield, label: "Verified Providers" },
  { icon: Zap, label: "Instant Delivery" },
  { icon: Clock, label: "24/7 Support" },
  { icon: HeadphonesIcon, label: "Myanmar Payments" },
];

/* ───────── FAQ ───────── */
const faqs = [
  {
    q: "How long does IMEI unlock take?",
    a: "Many services are instant. Carrier-dependent iPhone unlocks typically take 1–5 business days.",
  },
  {
    q: "How do I become a reseller?",
    a: "Register for free, top up your wallet, and start ordering at wholesale prices. No minimums.",
  },
  {
    q: "What payment methods do you accept?",
    a: "KBZPay, WavePay, CB Pay, AYA Pay, and direct bank transfers. Top-ups approved within 5–15 minutes.",
  },
  {
    q: "Is it safe and secure?",
    a: "All transactions use our secure wallet system with fraud protection. Every order generates a verifiable receipt.",
  },
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
    description: "Myanmar's trusted IMEI unlock and digital reseller marketplace.",
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "KKTechDeals",
    url: "https://kk-reseller-hub.lovable.app",
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   LANDING PAGE — SIMPLIFIED
   ═══════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <FaqJsonLd />
      <OrgWebsiteJsonLd />

      {/* ─── NAV ─── */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="text-xl font-extrabold tracking-tight text-foreground">
            KK<span className="text-primary">Tech</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#services" className="transition-colors hover:text-foreground">Services</a>
            <a href="#how" className="transition-colors hover:text-foreground">How It Works</a>
            <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
            <Link to="/blog" className="transition-colors hover:text-foreground">Blog</Link>
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
        {/* ═══════════ HERO ═══════════ */}
        <section className="relative overflow-hidden bg-background py-24 sm:py-32">
          <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2">
            <div className="h-[500px] w-[500px] rounded-full bg-primary/[0.04] blur-[100px]" />
          </div>

          <ScrollReveal>
            <div className="relative mx-auto max-w-2xl px-5 text-center sm:px-8">
              <h1 className="text-[2.5rem] font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-[3.5rem]">
                Unlock & Resell
                <br />
                <span className="text-primary">with Confidence</span>
              </h1>

              <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
                Myanmar's trusted marketplace for IMEI unlocks, digital accounts, and VPN keys at wholesale prices.
              </p>

              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button size="lg" className="h-12 px-8 text-sm font-semibold" asChild>
                  <Link to="/login">
                    Start Free <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  No fees · Pay only for what you order
                </p>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ═══════════ TRUST BADGES ═══════════ */}
        <section className="border-y border-border bg-muted/20 py-8">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {trustBadges.map((b, i) => (
                <ScrollReveal key={b.label} delay={i * 60}>
                  <div className="flex flex-col items-center gap-2.5 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <b.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {b.label}
                    </span>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ CATEGORY CARDS ═══════════ */}
        <section id="services" className="bg-background py-20 sm:py-28">
          <div className="mx-auto max-w-4xl px-5 sm:px-8">
            <ScrollReveal>
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  What We Offer
                </h2>
                <p className="mt-3 text-base text-muted-foreground">
                  Three categories. Thousands of products. One platform.
                </p>
              </div>
            </ScrollReveal>

            <div className="mt-14 grid gap-5 sm:grid-cols-3">
              {categories.map((cat, i) => (
                <ScrollReveal key={cat.title} delay={i * 100}>
                  <Link
                    to={cat.link}
                    className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/30 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.15)]"
                  >
                    {/* Tag */}
                    <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      {cat.tag}
                    </span>

                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                      <cat.icon className="h-7 w-7 text-primary" />
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-foreground">{cat.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {cat.desc}
                      </p>
                    </div>

                    <span className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-primary">
                      Browse <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ HOW IT WORKS ═══════════ */}
        <section id="how" className="border-t border-border bg-muted/20 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <ScrollReveal>
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  How It Works
                </h2>
                <p className="mt-3 text-base text-muted-foreground">
                  Four steps to start reselling.
                </p>
              </div>
            </ScrollReveal>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <ScrollReveal key={s.title} delay={i * 80}>
                  <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-5 pb-6 pt-8 text-center">
                    <div className="absolute -top-3 left-5 flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground">
                      {i + 1}
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <s.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground">{s.title}</h4>
                    <p className="text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={200}>
              <div className="mt-12 text-center">
                <Button size="lg" className="h-12 px-8 text-sm font-semibold" asChild>
                  <Link to="/login">
                    Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══════════ FAQ ═══════════ */}
        <section id="faq" className="bg-background py-20 sm:py-28">
          <div className="mx-auto max-w-2xl px-5 sm:px-8">
            <ScrollReveal>
              <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Frequently Asked Questions
              </h2>
            </ScrollReveal>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((f, i) => (
                <ScrollReveal key={i} delay={i * 50}>
                  <AccordionItem
                    value={`faq-${i}`}
                    className="rounded-2xl border border-border bg-card px-5"
                  >
                    <AccordionTrigger className="text-left text-sm font-semibold text-foreground hover:no-underline py-4">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground pb-4">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                </ScrollReveal>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ═══════════ SEO CONTENT (sr-only) ═══════════ */}
        <section className="sr-only" aria-hidden="false">
          <h2>Myanmar's Trusted GSM Unlock Server &amp; Digital Reseller Hub</h2>
          <p>
            KKTech is a comprehensive GSM unlock server and digital reseller platform built for the Myanmar market.
            Access premium IMEI unlock services, digital accounts, and VPN keys at competitive wholesale prices
            with instant delivery. We support KBZPay, WavePay, CB Pay, AYA Pay, and direct bank transfers.
          </p>
        </section>
      </main>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-border bg-card py-12">
        <div className="mx-auto grid max-w-5xl gap-10 px-5 sm:grid-cols-3 sm:px-8">
          <div>
            <span className="text-xl font-extrabold text-foreground">
              KK<span className="text-primary">Tech</span>
            </span>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Myanmar's trusted wholesale unlock & digital reseller platform.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 text-sm">
            <span className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Quick Links
            </span>
            <a href="#services" className="text-muted-foreground transition-colors hover:text-primary">Services</a>
            <a href="#faq" className="text-muted-foreground transition-colors hover:text-primary">FAQ</a>
            <Link to="/tools/imei-check" className="text-muted-foreground transition-colors hover:text-primary">Free IMEI Checker</Link>
            <Link to="/login" className="text-muted-foreground transition-colors hover:text-primary">Reseller Login</Link>
          </div>
          <div className="flex flex-col gap-2.5 text-sm">
            <span className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Policies
            </span>
            <Link to="/terms" className="text-muted-foreground transition-colors hover:text-primary">Terms & Conditions</Link>
            <Link to="/terms" className="text-muted-foreground transition-colors hover:text-primary">Privacy Policy</Link>
            <Link to="/terms" className="text-muted-foreground transition-colors hover:text-primary">Refund Policy</Link>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-5xl border-t border-border px-5 pt-6 sm:px-8">
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} KKTech. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ═══════════ FLOATING CONTACT ═══════════ */}
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
