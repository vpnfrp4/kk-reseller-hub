import { useState, useRef, useEffect, forwardRef, CSSProperties, ReactNode } from "react";
import { SITE_URL } from "@/lib/utils";
import { Link } from "react-router-dom";
import {
  Smartphone,
  Wrench,
  Monitor,
  ArrowRight,
  MessageCircle,
  Send,
  Phone,
  X,
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

/* ───────── DATA ───────── */
const categories = [
  {
    icon: Smartphone,
    title: "IMEI Unlock",
    desc: "Direct access to global unlock services with structured provider routing.",
    link: "/services/imei-unlock",
  },
  {
    icon: Wrench,
    title: "Hardware & Repair Tools",
    desc: "Professional activation and licensing solutions for repair technicians.",
    link: "/login",
  },
  {
    icon: Monitor,
    title: "Digital Subscriptions",
    desc: "Secure digital account provisioning for controlled reseller distribution.",
    link: "/login",
  },
];

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
    description: "Professional digital service infrastructure for resellers. IMEI unlock, GSM tools, and digital accounts.",
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "KKTech",
    url: SITE_URL,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   LANDING PAGE — PREMIUM MINIMAL
   ═══════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <FaqJsonLd />
      <OrgWebsiteJsonLd />

      {/* ─── NAV ─── */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-extrabold tracking-tight text-foreground">
            KK<span className="gold-shimmer">Tech</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#services" className="transition-colors hover:text-foreground">Services</a>
            <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
            <Link to="/tools/imei-check" className="transition-colors hover:text-foreground">IMEI Check</Link>
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
        {/* ═══════════ HERO — Ultra Minimal ═══════════ */}
        <section className="relative overflow-hidden bg-background">
          {/* Very subtle radial warmth */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(900px circle at 50% 30%, hsl(43 65% 52% / 0.04), transparent 60%)" }}
          />

          <div className="relative mx-auto max-w-[1120px] px-6 pt-36 pb-32 md:pt-44 md:pb-40 text-center">
            <ScrollReveal>
              <p className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-primary/70">
                Reseller-First Infrastructure
              </p>
              <h1 className="text-[2.5rem] font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-[3.5rem] lg:text-[4rem]">
                Execution Layer for
                <br />
                <span className="text-muted-foreground">Digital Unlock & GSM Services.</span>
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={120}>
              <p className="mx-auto mt-7 max-w-lg text-base text-muted-foreground/80 sm:text-lg">
                One platform. Professional execution. Reliable outcomes.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={240}>
              <div className="mt-14 flex flex-col items-center gap-5">
                <Button size="lg" className="h-13 px-12 text-sm font-semibold" asChild>
                  <Link to="/login">Get Started</Link>
                </Button>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  Browse Services <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══════════ TRUST STRIP ═══════════ */}
        <section className="border-y border-border/30">
          <div className="mx-auto max-w-[1120px] px-6 py-8">
            <ScrollReveal>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Fast Processing</span>
                <span className="text-primary/40">•</span>
                <span className="font-semibold text-foreground">Verified Providers</span>
                <span className="text-primary/40">•</span>
                <span className="font-semibold text-foreground">Transparent Pricing</span>
                <span className="text-primary/40">•</span>
                <span className="font-semibold text-foreground">Reliable Delivery</span>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══════════ SERVICES — Clean Minimal Blocks ═══════════ */}
        <section id="services" className="bg-background py-[120px] max-sm:py-20">
          <div className="mx-auto max-w-[1120px] px-6">
            <ScrollReveal>
              <div className="text-center">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary/70">
                  Services
                </p>
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Structured for Scale
                </h2>
                <p className="mt-3 text-base text-muted-foreground">
                  Three categories. One controlled environment.
                </p>
              </div>
            </ScrollReveal>

            <div className="mt-16 grid gap-6 sm:grid-cols-3">
              {categories.map((cat, i) => (
                <ScrollReveal key={cat.title} delay={i * 100}>
                  <Link
                    to={cat.link}
                    className="group flex flex-col gap-5 rounded-2xl border border-border/50 bg-card/50 p-8 sm:p-10 transition-all duration-200 hover:-translate-y-0.5 hover:border-border"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/8">
                      <cat.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{cat.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {cat.desc}
                      </p>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ FAQ ═══════════ */}
        <section id="faq" className="border-t border-border/30 bg-background py-[120px] max-sm:py-20">
          <div className="mx-auto max-w-[800px] px-6">
            <ScrollReveal>
              <h2 className="mb-12 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Frequently Asked Questions
              </h2>
            </ScrollReveal>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((f, i) => (
                <ScrollReveal key={i} delay={i * 50}>
                  <AccordionItem
                    value={`faq-${i}`}
                    className="rounded-2xl border border-border/50 bg-card/50 px-6"
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

        {/* ═══════════ SEO CONTENT (sr-only) ═══════════ */}
        <section className="sr-only" aria-hidden="false">
          <h2>KKTech — Professional Digital Service Infrastructure for Resellers</h2>
          <p>
            KKTech is a controlled digital service infrastructure for professional resellers.
            Access IMEI unlock services, GSM tools, and digital accounts through a secure,
            structured environment with transparent pricing and reliable delivery.
          </p>
        </section>
      </main>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-border/30 bg-card/30 py-16">
        <div className="mx-auto grid max-w-[1120px] gap-12 px-6 sm:grid-cols-3">
          <div>
            <span className="text-xl font-extrabold text-foreground">
              KK<span className="gold-shimmer">Tech</span>
            </span>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Controlled digital service infrastructure for professional resellers.
            </p>
          </div>
          <div className="flex flex-col gap-3 text-sm">
            <span className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Quick Links
            </span>
            <a href="#services" className="text-muted-foreground transition-colors hover:text-primary">Services</a>
            <a href="#faq" className="text-muted-foreground transition-colors hover:text-primary">FAQ</a>
            <Link to="/tools/imei-check" className="text-muted-foreground transition-colors hover:text-primary">Free IMEI Checker</Link>
            <Link to="/blog" className="text-muted-foreground transition-colors hover:text-primary">Blog</Link>
            <Link to="/login" className="text-muted-foreground transition-colors hover:text-primary">Reseller Login</Link>
          </div>
          <div className="flex flex-col gap-3 text-sm">
            <span className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Policies
            </span>
            <Link to="/terms" className="text-muted-foreground transition-colors hover:text-primary">Terms & Conditions</Link>
            <Link to="/terms" className="text-muted-foreground transition-colors hover:text-primary">Privacy Policy</Link>
            <Link to="/terms" className="text-muted-foreground transition-colors hover:text-primary">Refund Policy</Link>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-[1120px] border-t border-border/30 px-6 pt-8">
          <p className="text-center text-xs text-muted-foreground/60">
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
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-lg transition-all hover:bg-muted"
            >
              <Send className="h-4 w-4 text-[hsl(200_80%_50%)]" />
              Telegram
            </a>
            <a
              href="viber://chat?number=%2B959xxxxxxxxx"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-lg transition-all hover:bg-muted"
            >
              <Phone className="h-4 w-4 text-[hsl(270_60%_55%)]" />
              Viber
            </a>
          </div>
        )}
        <button
          onClick={() => setContactOpen(!contactOpen)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label="Contact support"
        >
          {contactOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </button>
      </div>
    </>
  );
}
