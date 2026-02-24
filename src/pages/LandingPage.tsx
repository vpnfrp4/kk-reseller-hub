import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/* ───────── TRUST BADGES ───────── */
const trustBadges = [
  { icon: Zap, label: "Instant Delivery" },
  { icon: BarChart3, label: "Wholesale Pricing" },
  { icon: Clock, label: "24/7 Processing" },
  { icon: Shield, label: "Secure Wallet" },
];

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

/* ───────── WHY CHOOSE US ───────── */
const reasons = [
  { icon: BarChart3, text: "Real-Time Stock System" },
  { icon: Clock, text: "Fast Top-Up Approval (5–15 minutes)" },
  { icon: Eye, text: "Transparent Pricing" },
  { icon: Wallet, text: "Profit Margin Visibility" },
  { icon: Shield, text: "Fraud Protection" },
  { icon: HeadphonesIcon, text: "Myanmar-Friendly Support" },
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

/* ═══════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <FaqJsonLd />

      {/* ─── NAV ─── */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <span className="text-lg font-bold tracking-tight text-foreground">
            KK<span className="text-primary">Tech</span>
          </span>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#services" className="hover:text-foreground transition-colors">Services</a>
            <a href="#why" className="hover:text-foreground transition-colors">Why Us</a>
            <a href="#how" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Log In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/login">Register</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* ═══════════ HERO ═══════════ */}
        <section className="relative overflow-hidden bg-background py-20 sm:py-28">
          {/* subtle radial glow */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
          </div>

          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
              GSM Unlock &amp; Digital Reseller Platform in Myanmar
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Instant IMEI Services, VPN Accounts &amp; Digital Tools at Wholesale Pricing
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link to="/login">
                  Register as Reseller <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#services">View Services</a>
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {trustBadges.map((b) => (
                <div
                  key={b.label}
                  className="flex flex-col items-center gap-2 rounded-card border border-border bg-card p-4 shadow-luxury"
                >
                  <b.icon className="h-6 w-6 text-primary" />
                  <span className="text-xs font-semibold text-foreground">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ SERVICES ═══════════ */}
        <section id="services" className="bg-muted/30 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Our Unlock &amp; Digital Services
            </h2>

            {/* GSM */}
            <h3 className="mb-4 mt-12 text-lg font-semibold text-foreground">
              GSM &amp; IMEI Services
            </h3>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {gsmServices.map((s) => (
                <article
                  key={s.title}
                  className="flex flex-col gap-3 rounded-card border border-border bg-card p-5 shadow-luxury hover-lift"
                >
                  <s.icon className="h-8 w-8 text-primary" />
                  <h4 className="font-semibold text-foreground">{s.title}</h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                </article>
              ))}
            </div>

            {/* Digital */}
            <h3 className="mb-4 mt-12 text-lg font-semibold text-foreground">
              Digital Accounts Wholesale
            </h3>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {digitalServices.map((s) => (
                <article
                  key={s.title}
                  className="flex flex-col gap-3 rounded-card border border-border bg-card p-5 shadow-luxury hover-lift"
                >
                  <s.icon className="h-8 w-8 text-primary" />
                  <h4 className="font-semibold text-foreground">{s.title}</h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ WHY CHOOSE US ═══════════ */}
        <section id="why" className="py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Why Choose KKTech Reseller Platform?
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reasons.map((r) => (
                <div
                  key={r.text}
                  className="flex items-start gap-3 rounded-card border border-border bg-card p-5 shadow-luxury"
                >
                  <r.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm font-medium text-foreground">{r.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ HOW IT WORKS ═══════════ */}
        <section id="how" className="bg-muted/30 py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              How Our Reseller System Works
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <div
                  key={s.title}
                  className="relative flex flex-col items-center gap-3 rounded-card border border-border bg-card p-6 text-center shadow-luxury"
                >
                  <span className="absolute -top-3 left-4 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <s.icon className="h-8 w-8 text-primary" />
                  <h4 className="font-semibold text-foreground">{s.title}</h4>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ SEO CONTENT BLOCK ═══════════ */}
        <section className="py-16 sm:py-24">
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
        <section id="faq" className="bg-muted/30 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="space-y-2">
              {faqs.map((f, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="rounded-card border border-border bg-card px-5 shadow-luxury"
                >
                  <AccordionTrigger className="text-left text-sm font-semibold text-foreground hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ═══════════ CTA ═══════════ */}
        <section className="py-16 sm:py-24">
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
      </main>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-border bg-card py-10">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3 sm:px-6">
          {/* Brand */}
          <div>
            <span className="text-lg font-bold text-foreground">
              KK<span className="text-primary">Tech</span>
            </span>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Myanmar's wholesale GSM unlock server and digital accounts reseller platform.
              Instant IMEI services, VPN keys, and premium digital tools at competitive pricing.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Links
            </span>
            <a href="#services" className="text-foreground hover:text-primary transition-colors">
              Services
            </a>
            <a href="#faq" className="text-foreground hover:text-primary transition-colors">
              FAQ
            </a>
            <Link to="/login" className="text-foreground hover:text-primary transition-colors">
              Reseller Login
            </Link>
          </div>

          {/* Policies */}
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Policies
            </span>
            <Link to="/terms" className="text-foreground hover:text-primary transition-colors">
              Terms &amp; Conditions
            </Link>
            <Link to="/terms" className="text-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-foreground hover:text-primary transition-colors">
              Refund Policy
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-6xl border-t border-border px-4 pt-6 sm:px-6">
          <p className="text-center text-xs text-muted-foreground">
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
