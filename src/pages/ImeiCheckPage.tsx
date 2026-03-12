import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Smartphone, Search, CheckCircle2, XCircle, ArrowLeft, Shield, Info, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/* ───────── LUHN CHECK ───────── */
function isValidLuhn(imei: string): boolean {
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = parseInt(imei[i], 10);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/* ───────── TAC DATABASE (common brands) ───────── */
const tacMap: Record<string, { brand: string; model: string }> = {
  "35332510": { brand: "Apple", model: "iPhone 15 Pro Max" },
  "35467011": { brand: "Apple", model: "iPhone 14" },
  "35407115": { brand: "Apple", model: "iPhone 13" },
  "35391110": { brand: "Apple", model: "iPhone 12" },
  "35344210": { brand: "Apple", model: "iPhone 11" },
  "35388710": { brand: "Samsung", model: "Galaxy S24 Ultra" },
  "35206510": { brand: "Samsung", model: "Galaxy S23" },
  "35260911": { brand: "Samsung", model: "Galaxy A54" },
  "35458207": { brand: "Samsung", model: "Galaxy S21" },
  "86388103": { brand: "Huawei", model: "P60 Pro" },
  "86776903": { brand: "Xiaomi", model: "Redmi Note 13" },
  "86513604": { brand: "OPPO", model: "Reno 11" },
  "35982510": { brand: "Google", model: "Pixel 8" },
  "35454010": { brand: "OnePlus", model: "12" },
};

function lookupTac(imei: string) {
  const tac8 = imei.substring(0, 8);
  if (tacMap[tac8]) return tacMap[tac8];
  // Try 6-digit prefix match
  for (const [key, val] of Object.entries(tacMap)) {
    if (key.startsWith(imei.substring(0, 6))) return val;
  }
  return null;
}

/* ───────── RESULT INTERFACE ───────── */
interface ImeiResult {
  valid: boolean;
  imei: string;
  tac: string;
  serialNumber: string;
  checkDigit: string;
  brand: string | null;
  model: string | null;
  luhnValid: boolean;
}

/* ───────── FAQ ───────── */
const faqs = [
  {
    q: "What is an IMEI number?",
    a: "IMEI (International Mobile Equipment Identity) is a unique 15-digit number that identifies every mobile phone. It's used by carriers to identify valid devices and can be used to block stolen phones.",
  },
  {
    q: "How do I find my IMEI number?",
    a: "Dial *#06# on your phone to see your IMEI. You can also find it in Settings > About Phone, or on the original box and SIM tray of your device.",
  },
  {
    q: "What information can an IMEI check reveal?",
    a: "An IMEI check can reveal the device brand, model, TAC (Type Allocation Code), serial number, and whether the IMEI format is valid. Professional IMEI services can also check carrier lock status, warranty, and blacklist status.",
  },
  {
    q: "Is this IMEI checker free?",
    a: "Yes, this basic IMEI validation and info tool is completely free. For advanced checks like carrier lock status, blacklist verification, and warranty information, you can use our premium IMEI services through the reseller dashboard.",
  },
  {
    q: "Can I unlock my phone using this tool?",
    a: "This tool checks IMEI validity and device info. For actual carrier unlocking, register as a reseller on KKTech to access our full range of GSM unlock services at wholesale prices.",
  },
];

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
   IMEI CHECKER PAGE
   ═══════════════════════════════════════════════════════ */
export default function ImeiCheckPage() {
  const [imei, setImei] = useState("");
  const [result, setResult] = useState<ImeiResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCheck = useCallback(() => {
    setResult(null);
    setError("");
    setCopied(false);

    const cleaned = imei.replace(/[\s\-]/g, "");

    if (!cleaned) {
      setError("Please enter an IMEI number.");
      return;
    }
    if (!/^\d{15}$/.test(cleaned)) {
      setError("IMEI must be exactly 15 digits.");
      return;
    }

    const luhnValid = isValidLuhn(cleaned);
    const tacInfo = lookupTac(cleaned);

    setResult({
      valid: luhnValid,
      imei: cleaned,
      tac: cleaned.substring(0, 8),
      serialNumber: cleaned.substring(8, 14),
      checkDigit: cleaned[14],
      brand: tacInfo?.brand ?? null,
      model: tacInfo?.model ?? null,
      luhnValid,
    });
  }, [imei]);

  const handleCopy = () => {
    if (result) {
      const text = [
        `IMEI: ${result.imei}`,
        `Valid: ${result.luhnValid ? "Yes" : "No"}`,
        result.brand ? `Brand: ${result.brand}` : null,
        result.model ? `Model: ${result.model}` : null,
        `TAC: ${result.tac}`,
        `Serial: ${result.serialNumber}`,
      ]
        .filter(Boolean)
        .join("\n");
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <FaqJsonLd />

      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="text-lg font-bold tracking-tight text-foreground">
            KK<span className="text-primary">Tech</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="mr-1 h-4 w-4" /> Home
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/login">Register</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-20">
        {/* HERO */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Smartphone className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Free IMEI Checker
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Validate any IMEI number instantly. Check device brand, model, TAC code, and Luhn
            validity — completely free, no registration required.
          </p>
        </div>

        {/* INPUT */}
        <div className="mx-auto mt-10 max-w-md">
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={17}
              placeholder="Enter 15-digit IMEI number"
              value={imei}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d\s\-]/g, "");
                if (v.replace(/[\s\-]/g, "").length <= 15) setImei(v);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleCheck()}
              className="flex-1"
            />
            <Button onClick={handleCheck}>
              <Search className="mr-1 h-4 w-4" /> Check
            </Button>
          </div>
          {error && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
              <XCircle className="h-4 w-4 shrink-0" /> {error}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Dial <span className="font-mono font-semibold">*#06#</span> on any phone to find its IMEI.
          </p>
        </div>

        {/* RESULT */}
        {result && (
          <div className="mx-auto mt-8 max-w-md animate-fade-in rounded-card border border-border bg-card p-6 shadow-luxury">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {result.luhnValid ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <span className="font-semibold text-foreground">
                  {result.luhnValid ? "Valid IMEI" : "Invalid IMEI"}
                </span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">IMEI</dt>
                <dd className="font-mono font-semibold text-foreground">{result.imei}</dd>
              </div>
              {result.brand && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Brand</dt>
                  <dd className="font-semibold text-foreground">{result.brand}</dd>
                </div>
              )}
              {result.model && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Model</dt>
                  <dd className="font-semibold text-foreground">{result.model}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">TAC (Type Allocation Code)</dt>
                <dd className="font-mono text-foreground">{result.tac}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Serial Number</dt>
                <dd className="font-mono text-foreground">{result.serialNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Check Digit</dt>
                <dd className="font-mono text-foreground">{result.checkDigit}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Luhn Validation</dt>
                <dd className={result.luhnValid ? "font-semibold text-success" : "font-semibold text-destructive"}>
                  {result.luhnValid ? "Pass" : "Fail"}
                </dd>
              </div>
            </dl>

            {!result.brand && (
              <p className="mt-4 flex items-start gap-1.5 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Device brand not in our local database. Use our premium IMEI services for full
                device details, carrier lock status, and warranty info.
              </p>
            )}

            <div className="mt-5 border-t border-border pt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Need carrier unlock, blacklist check, or warranty info?
              </p>
              <Button size="sm" className="mt-2" asChild>
                <Link to="/login">Access Premium IMEI Services →</Link>
              </Button>
            </div>
          </div>
        )}

        {/* SEO CONTENT */}
        <section className="mt-16">
          <div className="prose prose-sm mx-auto text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground">
            <h2 className="text-xl font-bold tracking-tight">
              What Is an IMEI Number &amp; Why Does It Matter?
            </h2>
            <p>
              Every mobile phone in the world has a unique <strong>IMEI number</strong>{" "}
              (International Mobile Equipment Identity) — a 15-digit code that acts as the
              device's fingerprint. Carriers, manufacturers, and law enforcement use IMEI numbers
              to identify devices, track stolen phones, and manage network access.
            </p>
            <p>
              For resellers in the <strong>GSM unlock</strong> industry, IMEI checking is the
              first step before performing any unlock service. Verifying the IMEI ensures the
              device is genuine, identifies the correct carrier and model, and determines which
              unlock method to use. Our free IMEI checker tool validates the format using the{" "}
              <strong>Luhn algorithm</strong> and extracts the TAC (Type Allocation Code) to
              identify the device manufacturer and model.
            </p>

            <h3>How IMEI Numbers Are Structured</h3>
            <p>
              An IMEI is composed of three parts: the <strong>TAC</strong> (first 8 digits)
              identifies the device model and manufacturer, the <strong>serial number</strong>{" "}
              (next 6 digits) is unique to each device, and the <strong>check digit</strong>{" "}
              (last digit) is calculated using the Luhn algorithm for validation. Understanding
              this structure is essential for anyone working in mobile device services.
            </p>

            <h3>For Myanmar Resellers</h3>
            <p>
              If you're a reseller in Myanmar looking for premium IMEI services — including
              carrier lock checks, blacklist verification, iCloud status, and official carrier
              unlocks — <Link to="/login" className="text-primary hover:underline">register on
              KKTech</Link> to access wholesale pricing on all GSM unlock services.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-16">
          <h2 className="mb-6 text-center text-xl font-bold tracking-tight text-foreground">
            IMEI Checker FAQ
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
        </section>

        {/* CTA */}
        <section className="mt-16 text-center">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Need Professional IMEI Services?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Join KKTech for wholesale access to carrier unlocks, FRP removal, and more.
          </p>
          <Button size="lg" className="mt-4" asChild>
            <Link to="/login">Register as Reseller →</Link>
          </Button>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="mt-12 border-t border-border bg-card py-8">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <Link to="/" className="text-sm font-bold text-foreground">
            KK<span className="text-primary">Tech</span>
          </Link>
          <p className="mt-2 text-xs text-muted-foreground">
            Myanmar's wholesale GSM unlock server and digital accounts reseller platform.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            © {new Date().getFullYear()} KKTech. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
