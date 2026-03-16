import { SITE_URL } from "@/lib/utils";
import { Link } from "react-router-dom";
import { ArrowRight, Gamepad2, Smartphone, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import kkLogo from "@/assets/kkremote-logo.png";
import landingBanner from "@/assets/landing-banner.png";

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
          <ThemeToggle />
        </div>
      </header>

      <main className="w-full">

        {/* ═══════════════════════════════════
            SECTION 1 — HERO
            ═══════════════════════════════════ */}
        <section className="relative overflow-hidden bg-[hsl(220,14%,6%)]">
          {/* Ambient glows matching banner palette */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-primary/[0.08] blur-[180px]" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[300px] rounded-full bg-[hsl(220,60%,30%)]/[0.1] blur-[120px]" />
          </div>

          <div className="relative mx-auto max-w-5xl px-5 pt-14 pb-10 sm:pt-20 sm:pb-16 lg:pt-24 lg:pb-20">
            {/* Text content */}
            <div className="text-center mb-10 sm:mb-14">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15]">
                <span className="text-[hsl(0,0%,95%)]">KKTech – </span>
                <span className="bg-gradient-to-r from-[hsl(24,95%,50%)] to-[hsl(40,100%,55%)] bg-clip-text text-transparent">
                  Your Premium
                </span>
                <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-[hsl(24,95%,50%)] to-[hsl(40,100%,55%)] bg-clip-text text-transparent">
                  {" "}Digital Service Partner
                </span>
              </h1>

              <p className="mt-5 text-base sm:text-lg text-[hsl(220,10%,60%)] max-w-md mx-auto leading-relaxed">
                Fast, secure, and wholesale-priced digital services built for professionals.
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  size="lg"
                  className="text-base px-10 h-14 font-semibold w-full sm:w-auto rounded-2xl shadow-[0_0_30px_hsl(24,95%,50%/0.3)]"
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
                  className="text-base px-10 h-14 font-semibold w-full sm:w-auto rounded-2xl border-[hsl(220,10%,25%)] text-[hsl(0,0%,90%)] hover:bg-[hsl(220,12%,15%)]"
                  asChild
                >
                  <Link to="/login">Login</Link>
                </Button>
              </div>
            </div>

            {/* Banner image */}
            <div className="relative mx-auto max-w-4xl">
              {/* Glow behind banner */}
              <div className="absolute -inset-4 sm:-inset-6 rounded-3xl bg-gradient-to-br from-primary/[0.12] via-[hsl(220,60%,40%)]/[0.06] to-transparent blur-2xl pointer-events-none" />

              <div className="relative rounded-2xl overflow-hidden border border-[hsl(220,12%,18%)] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]">
                <img
                  src={landingBanner}
                  alt="KarKar4 Store — Premium Digital Services: VPN, Netflix, Spotify, CapCut"
                  className="w-full block"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>

              {/* Bottom fade to blend with next section */}
              <div className="absolute inset-x-0 -bottom-1 h-16 sm:h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
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
