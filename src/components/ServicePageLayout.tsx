import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, type LucideIcon } from "lucide-react";
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

interface Faq {
  q: string;
  a: string;
}

interface ServicePageProps {
  icon: LucideIcon;
  h1: string;
  subtitle: string;
  features: Feature[];
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

        {/* FEATURES */}
        <section className="bg-muted/30 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-foreground">
              What's Included
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <article key={f.title} className="flex flex-col gap-3 rounded-card border border-border bg-card p-5 shadow-luxury hover-lift">
                  <f.icon className="h-8 w-8 text-primary" />
                  <h3 className="font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.text}</p>
                </article>
              ))}
            </div>
          </div>
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
