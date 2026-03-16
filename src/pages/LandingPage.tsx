import { SITE_URL } from "@/lib/utils";
import { Link } from "react-router-dom";
import { ArrowRight, Gamepad2, Smartphone, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import kkLogo from "@/assets/kkremote-logo.png";

/* ───────── JSON-LD ───────── */
function OrgJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "KKTech",
    url: SITE_URL,
    logo: `${SITE_URL}/pwa-512x512.png`,
    description: "Premium digital services platform — Game top-up, Apple ID, IMEI unlock.",
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

/* ───────── SERVICES DATA ───────── */
const services = [
  {
    icon: Gamepad2,
    title: "Game Top-up",
    desc: "Instant credit for PUBG, MLBB, Free Fire & more. Bulk pricing available.",
  },
  {
    icon: Smartphone,
    title: "Apple ID",
    desc: "Professional Apple ID & iCloud services. Fast, secure, permanent.",
  },
  {
    icon: Fingerprint,
    title: "IMEI Unlock",
    desc: "Factory unlock for all carriers worldwide. 200+ networks supported.",
  },
];

/* ═══════════════════════════════════════════════════════
   LANDING PAGE — Minimal Fintech Style
   ═══════════════════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-background">
      <OrgJsonLd />

      {/* ─── NAV ─── */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <img src={kkLogo} alt="KKTech" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-extrabold tracking-tight text-foreground">
              KK<span className="text-primary">Tech</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="text-sm font-medium" asChild>
              <Link to="/login">Log In</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full">

        {/* ═══════════════════════════════════
            SECTION 1 — HERO
            ═══════════════════════════════════ */}
        <section className="relative overflow-hidden">
          {/* Ambient glow */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.07] blur-[160px]" />
          </div>

          <div className="relative mx-auto max-w-5xl px-5 pt-20 pb-16 sm:pt-28 sm:pb-24 lg:pt-36 lg:pb-32 text-center">
            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15]">
              <span className="text-foreground">KKTech – </span>
              <span className="bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] bg-clip-text text-transparent">
                Your Premium
              </span>
              <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] bg-clip-text text-transparent">
                {" "}Digital Service Partner
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              Fast, secure, and wholesale-priced digital services built for professionals.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                className="text-base px-10 h-14 font-semibold w-full sm:w-auto rounded-2xl shadow-[var(--shadow-glow)]"
                asChild
              >
                <Link to="/login?tab=signup">
                  Get Started
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-10 h-14 font-semibold w-full sm:w-auto rounded-2xl"
                asChild
              >
                <Link to="/login">Login</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════
            SECTION 2 — SERVICES GRID
            ═══════════════════════════════════ */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-5">
            <h2 className="text-center text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-10 sm:mb-14">
              What We Offer
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              {services.map((s) => (
                <Link
                  key={s.title}
                  to="/login"
                  className="group rounded-2xl border border-border/40 bg-card p-6 sm:p-8 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
                >
                  {/* Icon */}
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <s.icon className="h-6 w-6 text-primary" strokeWidth={1.8} />
                  </div>

                  <h3 className="text-base font-bold text-foreground mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════
            SECTION 3 — FOOTER
            ═══════════════════════════════════ */}
        <footer className="border-t border-border/40 py-8">
          <div className="mx-auto max-w-5xl px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <img src={kkLogo} alt="KKTech" className="h-5 w-5 rounded" />
              <span className="font-semibold text-foreground">KKTech</span>
            </div>
            <p>© {new Date().getFullYear()} KKTech. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
