import { ArrowLeft, ScrollText, ShieldCheck, Wallet, Package, AlertTriangle, FileText, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { t, useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LangContext";
import type { BiLabel } from "@/lib/i18n";

const sectionDefs: { icon: typeof ShieldCheck; title: BiLabel; paragraphs: BiLabel[] }[] = [
  { icon: ShieldCheck, title: t.terms.s1Title, paragraphs: [t.terms.s1p1] },
  { icon: ScrollText, title: t.terms.s2Title, paragraphs: [t.terms.s2p1] },
  { icon: Wallet, title: t.terms.s3Title, paragraphs: [t.terms.s3p1] },
  { icon: Package, title: t.terms.s4Title, paragraphs: [t.terms.s4p1] },
  { icon: AlertTriangle, title: t.terms.s5Title, paragraphs: [t.terms.s5p1] },
  { icon: FileText, title: t.terms.s6Title, paragraphs: [t.terms.s6p1] },
];

/** Bilingual paragraph: primary lang normal, secondary lang small */
function BiPara({ label }: { label: BiLabel }) {
  const { lang } = useLang();
  const primary = label[lang];
  const secondary = label[lang === "mm" ? "en" : "mm"];
  return (
    <div>
      <p className="text-sm text-muted-foreground leading-relaxed">{primary}</p>
      <p className="text-[10px] text-muted-foreground/50 leading-relaxed mt-0.5">{secondary}</p>
    </div>
  );
}

export default function TermsPage() {
  const navigate = useNavigate();
  const l = useT();
  const { lang } = useLang();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[150px] opacity-20"
          style={{ background: "radial-gradient(circle, hsl(43 76% 47% / 0.15), transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[130px] opacity-15"
          style={{ background: "radial-gradient(circle, var(--ambient-blob-2), transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-8 md:py-16">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-8 gap-2 text-muted-foreground hover:text-foreground btn-glass !bg-transparent"
        >
          <ArrowLeft className="w-4 h-4" /> {l(t.terms.back)}
        </Button>

        {/* Hero header */}
        <div className="text-center mb-12 animate-fade-in">
          <div
            className="w-[72px] h-[72px] rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{
              background: "var(--gradient-gold)",
              boxShadow: "0 0 40px hsl(43 76% 47% / 0.25)",
            }}
          >
            <Crown className="w-9 h-9 text-primary-foreground" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-display tracking-tight">
            <span className="gold-text">{l(t.terms.title1)}</span>{" "}
            <span className="text-foreground">{l(t.terms.titleAnd)}</span>{" "}
            <span className="gold-text">{l(t.terms.title2)}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-3">
            {l(t.terms.lastUpdated)}
          </p>
          <p className="text-[10px] text-muted-foreground/50">
            {lang === "mm" ? t.terms.lastUpdated.en : t.terms.lastUpdated.mm}
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-5">
          {sectionDefs.map((section, i) => (
            <section
              key={i}
              className="glass-card p-6 relative overflow-hidden opacity-0 animate-stagger-in hover-lift"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {/* Gold accent line */}
              <div
                className="absolute top-0 left-0 w-1 h-full rounded-r"
                style={{ background: "var(--gradient-gold)" }}
              />

              <div className="flex items-start gap-4 pl-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <section.icon className="w-[18px] h-[18px] text-primary" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-foreground mb-0.5">{l(section.title)}</h2>
                  <p className="text-[10px] text-muted-foreground/50 mb-2">
                    {section.title[lang === "mm" ? "en" : "mm"]}
                  </p>
                  <div className="space-y-2">
                    {section.paragraphs.map((para, j) => (
                      <BiPara key={j} label={para} />
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/60 mt-12 animate-fade-in" style={{ animationDelay: "0.5s" }}>
          &copy; {new Date().getFullYear()} KKTech. All rights reserved.
        </p>
      </div>
    </div>
  );
}
