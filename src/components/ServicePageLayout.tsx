import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, ClipboardList, AlertTriangle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Feature {
  icon: LucideIcon;
  title: string;
  text: string;
}

interface Spec {
  label: string;
  value: string;
}

interface Faq {
  q: string;
  a: string;
}

interface ServicePageProps {
  icon: LucideIcon;
  h1: string;
  subtitle: string;
  features: Feature[];
  specs?: Spec[];
  notice?: string;
  seoContent: React.ReactNode;
  faqs: Faq[];
  ctaTitle: string;
  ctaText: string;
}

function FaqJsonLd({ faqs }: { faqs: Faq[] }) {
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

export default function ServicePageLayout({
  icon: Icon,
  h1,
  subtitle,
  features,
  specs,
  notice,
  seoContent,
  faqs,
  ctaTitle,
  ctaText,
}: ServicePageProps) {
  return (
    <>
      <FaqJsonLd faqs={faqs} />

      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="text-lg font-bold tracking-tight text-foreground">
            KK<span className="text-primary">Tech</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <Link to="/services/imei-unlock" className="hover:text-foreground transition-colors">IMEI Unlock</Link>
            <Link to="/services/vpn-keys" className="hover:text-foreground transition-colors">VPN Keys</Link>
            <Link to="/services/capcut-pro" className="hover:text-foreground transition-colors">CapCut Pro</Link>
            <Link to="/tools/imei-check" className="hover:text-foreground transition-colors">IMEI Checker</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Home</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/login">Register</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden bg-background py-16 sm:py-24">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px]" />
          </div>
          <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {h1}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{subtitle}</p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link to="/login">Start Reselling <ChevronRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/#services">All Services</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* SERVICE SPECIFICATION CARD */}
        {specs && specs.length > 0 && (
          <section className="bg-muted/30 py-16 sm:py-20">
            <div className="mx-auto max-w-2xl px-4 sm:px-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] sm:p-8">
                <div className="mb-6 flex items-center gap-2.5">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    Service Specification
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-[minmax(140px,auto)_1fr]">
                  {specs.map((s, i) => (
                    <div key={i} className="contents">
                      <div className="bg-muted/60 px-4 py-3 text-[13px] font-medium text-muted-foreground sm:border-b sm:border-border/30 last:border-b-0">
                        {s.label}
                      </div>
                      <div className="bg-card px-4 py-3 text-[13px] font-semibold text-foreground sm:border-b sm:border-border/30 last:border-b-0">
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* IMPORTANT NOTICE */}
              {notice && (
                <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/60 p-5 dark:border-amber-500/20 dark:bg-amber-950/20">
                  <div className="flex-shrink-0 border-l-[3px] border-amber-400 dark:border-amber-500" />
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-[13px] font-semibold text-amber-800 dark:text-amber-300">
                        Important Notice
                      </span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-amber-700 dark:text-amber-400/80">
                      {notice}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* FEATURES (sr-only for SEO — visually hidden, DOM preserved) */}
        <section className="sr-only" aria-hidden="false">
          <h2>What's Included</h2>
          {features.map((f) => (
            <article key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </section>

        {/* SEO CONTENT */}
        <section className="py-16 sm:py-20">
          <div className="prose prose-sm mx-auto max-w-3xl px-4 text-muted-foreground sm:px-6 [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground">
            {seoContent}
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-muted/30 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="mb-8 text-center text-xl font-bold tracking-tight text-foreground">
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="space-y-2">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="rounded-card border border-border bg-card px-5 shadow-luxury">
                  <AccordionTrigger className="text-left text-sm font-semibold text-foreground hover:no-underline">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{ctaTitle}</h2>
            <p className="mt-3 text-muted-foreground">{ctaText}</p>
            <Button size="lg" className="mt-6" asChild>
              <Link to="/login">Create Free Account <ChevronRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border bg-card py-8">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <Link to="/" className="text-sm font-bold text-foreground">KK<span className="text-primary">Tech</span></Link>
          <p className="mt-2 text-xs text-muted-foreground">Myanmar's wholesale GSM unlock server and digital accounts reseller platform.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <Link to="/services/imei-unlock" className="hover:text-foreground transition-colors">IMEI Unlock</Link>
            <Link to="/services/vpn-keys" className="hover:text-foreground transition-colors">VPN Keys</Link>
            <Link to="/services/capcut-pro" className="hover:text-foreground transition-colors">CapCut Pro</Link>
            <Link to="/tools/imei-check" className="hover:text-foreground transition-colors">IMEI Checker</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">© {new Date().getFullYear()} KKTech. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
