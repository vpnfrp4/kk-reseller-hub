import React from "react";
import { cn } from "@/lib/utils";

/* ─── Inline Rich Text (links + markdown links) ─── */

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
const URL_RE = /(https?:\/\/[^\s<>,;'")]+)/g;

function RichText({ children }: { children: string }) {
  // First pass: split by markdown links [text](url)
  const parts: React.ReactNode[] = [];
  let last = 0;
  const str = children;

  // Collect all markdown links
  const mdMatches: { index: number; length: number; label: string; url: string }[] = [];
  let m: RegExpExecArray | null;
  const mdRe = new RegExp(MARKDOWN_LINK_RE.source, "g");
  while ((m = mdRe.exec(str)) !== null) {
    mdMatches.push({ index: m.index, length: m[0].length, label: m[1], url: m[2] });
  }

  if (mdMatches.length === 0) {
    // No markdown links — just auto-link raw URLs
    return <>{autoLinkUrls(str)}</>;
  }

  for (const md of mdMatches) {
    if (md.index > last) {
      parts.push(...autoLinkUrls(str.slice(last, md.index)));
    }
    parts.push(
      <a
        key={`md-${md.index}`}
        href={md.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-primary/80 underline underline-offset-2 font-medium transition-colors"
      >
        {md.label}
      </a>
    );
    last = md.index + md.length;
  }
  if (last < str.length) {
    parts.push(...autoLinkUrls(str.slice(last)));
  }

  return <>{parts}</>;
}

function autoLinkUrls(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  const re = new RegExp(URL_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <a
        key={`url-${m.index}`}
        href={m[0]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-primary/80 underline underline-offset-2 break-all transition-colors"
      >
        {m[0]}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

interface ParsedSection {
  type: "OVERVIEW" | "FEATURES" | "DELIVERY" | "WARRANTY" | "COMPATIBILITY" | "RESELLER" | "IMPORTANT" | "SEO" | "HOW_IT_WORKS" | "TEXT";
  title: string;
  lines: string[];
}

const SECTION_MAP: Record<string, ParsedSection["type"]> = {
  "SERVICE OVERVIEW": "OVERVIEW",
  "KEY FEATURES": "FEATURES",
  "DELIVERY TIME": "DELIVERY",
  "WARRANTY / GUARANTEE": "WARRANTY",
  "WARRANTY/GUARANTEE": "WARRANTY",
  "WARRANTY": "WARRANTY",
  "COMPATIBILITY / REQUIREMENTS": "COMPATIBILITY",
  "COMPATIBILITY/REQUIREMENTS": "COMPATIBILITY",
  "COMPATIBILITY": "COMPATIBILITY",
  "REQUIREMENTS": "COMPATIBILITY",
  "RESELLER ADVANTAGE": "RESELLER",
  "IMPORTANT NOTES": "IMPORTANT",
  "IMPORTANT": "IMPORTANT",
  "SEO KEYWORDS": "SEO",
  "HOW IT WORKS": "HOW_IT_WORKS",
  // Legacy bracket markers
  "[SECTION:HOW_IT_WORKS]": "HOW_IT_WORKS",
  "[SECTION:IMPORTANT]": "IMPORTANT",
};

function parseDescription(raw: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let current: ParsedSection = { type: "TEXT", title: "", lines: [] };

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Strip any emojis that might have slipped through
    const cleaned = trimmed.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F000}-\u{1FFFF}]/gu, "").trim();

    // Check for section headers (UPPERCASE TEXT or bracket markers)
    const upperClean = cleaned.toUpperCase();
    const matchedKey = Object.keys(SECTION_MAP).find(
      (k) => upperClean === k || upperClean.startsWith(k)
    );

    if (matchedKey) {
      if (current.lines.length > 0 || current.type !== "TEXT") sections.push(current);
      current = { type: SECTION_MAP[matchedKey], title: matchedKey, lines: [] };
      continue;
    }

    // Clean bullet points — remove emojis from start
    const bulletCleaned = cleaned
      .replace(/^[\-•●▸▹►]\s*/, "")
      .replace(/^[\u{2705}\u{26A0}\u{2B50}\u{1F525}\u{1F4A1}\u{1F4E6}\u{1F512}\u{1F6E1}\u{26A1}\u{1F310}\u{1F4F1}\u{1F4BB}\u{1F3AC}\u{1F511}\u{1F4CB}\u{2728}\u{23F1}\u{1F4DD}\u{1F4BC}\u{1F50D}]\s*/gu, "")
      .trim();

    if (bulletCleaned) {
      current.lines.push(bulletCleaned);
    }
  }
  if (current.lines.length > 0) sections.push(current);
  return sections;
}

/* ─── Section Renderers ─── */

function OverviewBlock({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => (
        <p key={i} className="text-xs text-muted-foreground/90 leading-relaxed"><RichText>{line}</RichText></p>
      ))}
    </div>
  );
}

function FeaturesBlock({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-foreground/70">
        Key Features
      </p>
      <ul className="space-y-1.5">
        {lines.map((line, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60" />
            <span className="text-xs text-muted-foreground leading-relaxed">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeliveryBlock({ lines }: { lines: string[] }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-2.5">
      <div className="shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
        <span className="text-primary text-xs font-bold">DT</span>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-foreground/60 mb-0.5">Delivery Time</p>
        {lines.map((line, i) => (
          <p key={i} className="text-xs text-muted-foreground">{line}</p>
        ))}
      </div>
    </div>
  );
}

function WarrantyBlock({ lines }: { lines: string[] }) {
  return (
    <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.03] px-4 py-3 space-y-1.5">
      <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-emerald-600 dark:text-emerald-400">
        Warranty / Guarantee
      </p>
      {lines.map((line, i) => (
        <p key={i} className="text-xs text-muted-foreground leading-relaxed">{line}</p>
      ))}
    </div>
  );
}

function CompatibilityBlock({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-foreground/70">
        Compatibility / Requirements
      </p>
      <div className="grid gap-1.5">
        {lines.map((line, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="shrink-0 mt-1 w-4 h-[1px] bg-border" />
            <span className="text-xs text-muted-foreground leading-relaxed">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResellerBlock({ lines }: { lines: string[] }) {
  return (
    <div className="rounded-lg border border-primary/10 bg-primary/[0.02] px-4 py-3 space-y-2">
      <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-primary/80">
        Reseller Advantage
      </p>
      <ul className="space-y-1.5">
        {lines.map((line, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="shrink-0 mt-1 w-1 h-3 rounded-sm bg-primary/30" />
            <span className="text-xs text-muted-foreground leading-relaxed">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ImportantBlock({ lines }: { lines: string[] }) {
  return (
    <div className="relative rounded-lg border border-amber-500/20 bg-amber-500/[0.04] overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-[3px] bg-amber-500/60" />
      <div className="pl-4 pr-4 py-3 space-y-2">
        <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-amber-600 dark:text-amber-400">
          Important Notes
        </p>
        <ul className="space-y-1.5">
          {lines.map((line, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-amber-500/50" />
              <span className="text-xs text-muted-foreground leading-relaxed">{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function HowItWorksBlock({ lines }: { lines: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-foreground/70">
        How It Works
      </p>
      <ol className="space-y-2">
        {lines.map((line, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold tabular-nums mt-0.5">
              {i + 1}
            </span>
            <span className="text-xs text-muted-foreground leading-relaxed">{line}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TextBlock({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => (
        <p key={i} className="text-xs text-muted-foreground leading-relaxed">{line}</p>
      ))}
    </div>
  );
}

function SeoBlock({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-foreground/50">
        SEO Keywords
      </p>
      <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
        {lines.join(", ")}
      </p>
    </div>
  );
}

/* ─── Main Component ─── */

export default function StructuredDescription({ description }: { description: string }) {
  const sections = parseDescription(description);

  if (sections.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-6 space-y-4">
      <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">
        Description
      </p>
      <div className="space-y-4">
        {sections.map((section, i) => {
          switch (section.type) {
            case "OVERVIEW":
              return <OverviewBlock key={i} lines={section.lines} />;
            case "FEATURES":
              return <FeaturesBlock key={i} lines={section.lines} />;
            case "DELIVERY":
              return <DeliveryBlock key={i} lines={section.lines} />;
            case "WARRANTY":
              return <WarrantyBlock key={i} lines={section.lines} />;
            case "COMPATIBILITY":
              return <CompatibilityBlock key={i} lines={section.lines} />;
            case "RESELLER":
              return <ResellerBlock key={i} lines={section.lines} />;
            case "IMPORTANT":
              return <ImportantBlock key={i} lines={section.lines} />;
            case "HOW_IT_WORKS":
              return <HowItWorksBlock key={i} lines={section.lines} />;
            case "SEO":
              return <SeoBlock key={i} lines={section.lines} />;
            default:
              return <TextBlock key={i} lines={section.lines} />;
          }
        })}
      </div>
    </section>
  );
}
