import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/* ─── Markdown renderer for description lines ─── */

const LINK_CLASSES = "text-blue-400 hover:text-blue-300 no-underline hover:underline underline-offset-4 break-all transition-colors font-medium cursor-pointer";

function MarkdownLine({ children, className }: { children: string; className?: string }) {
  return (
    <ReactMarkdown
      components={{
        // Links open in new tab with blue styling
        a: ({ href, children: c }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASSES}>
            {c}
          </a>
        ),
        // Bold
        strong: ({ children: c }) => <strong className="font-semibold text-foreground/90">{c}</strong>,
        // Italic
        em: ({ children: c }) => <em className="italic">{c}</em>,
        // Inline code
        code: ({ children: c }) => (
          <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-foreground/80">{c}</code>
        ),
        // Render paragraphs inline (since each line is already wrapped)
        p: ({ children: c }) => <span className={className}>{c}</span>,
        // Flatten nested lists into the line
        ul: ({ children: c }) => <span>{c}</span>,
        ol: ({ children: c }) => <span>{c}</span>,
        li: ({ children: c }) => <span>{c}</span>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
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
        <div key={i} className="text-xs text-muted-foreground/90 leading-relaxed"><MarkdownLine>{line}</MarkdownLine></div>
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
            <span className="text-xs text-muted-foreground leading-relaxed"><MarkdownLine>{line}</MarkdownLine></span>
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
          <div key={i} className="text-xs text-muted-foreground"><MarkdownLine>{line}</MarkdownLine></div>
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
        <div key={i} className="text-xs text-muted-foreground leading-relaxed"><MarkdownLine>{line}</MarkdownLine></div>
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
            <span className="text-xs text-muted-foreground leading-relaxed"><MarkdownLine>{line}</MarkdownLine></span>
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
            <span className="text-xs text-muted-foreground leading-relaxed"><MarkdownLine>{line}</MarkdownLine></span>
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
              <span className="text-xs text-muted-foreground leading-relaxed"><MarkdownLine>{line}</MarkdownLine></span>
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
            <span className="text-xs text-muted-foreground leading-relaxed"><MarkdownLine>{line}</MarkdownLine></span>
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
        <div key={i} className="text-xs text-muted-foreground leading-relaxed"><MarkdownLine>{line}</MarkdownLine></div>
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
