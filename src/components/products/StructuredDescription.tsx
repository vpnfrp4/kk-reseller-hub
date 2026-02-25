import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface ParsedSection {
  type: "HOW_IT_WORKS" | "IMPORTANT" | "TEXT";
  lines: string[];
}

function parseDescription(raw: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let current: ParsedSection = { type: "TEXT", lines: [] };

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "[SECTION:HOW_IT_WORKS]") {
      if (current.lines.length > 0) sections.push(current);
      current = { type: "HOW_IT_WORKS", lines: [] };
    } else if (trimmed === "[SECTION:IMPORTANT]") {
      if (current.lines.length > 0) sections.push(current);
      current = { type: "IMPORTANT", lines: [] };
    } else if (trimmed) {
      current.lines.push(trimmed);
    }
  }
  if (current.lines.length > 0) sections.push(current);
  return sections;
}

function HowItWorksBlock({ lines }: { lines: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
      <p className="text-[10px] uppercase tracking-widest font-semibold text-primary">
        How It Works
      </p>
      <ol className="space-y-2.5">
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

function ImportantBlock({ lines }: { lines: string[] }) {
  return (
    <div className="relative rounded-xl border border-warning/20 bg-warning/[0.03] overflow-hidden">
      {/* Left accent bar */}
      <div className="absolute inset-y-0 left-0 w-1 bg-warning rounded-l-xl" />
      {/* Subtle glow */}
      <div className="absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-warning/[0.06] to-transparent pointer-events-none" />
      <div className="relative pl-5 pr-5 py-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
          <p className="text-[10px] uppercase tracking-widest font-semibold text-warning">
            Important
          </p>
        </div>
        <ul className="space-y-1.5">
          {lines.map((line, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-warning/50 mt-1.5 shrink-0" />
              <span className="text-xs text-muted-foreground leading-relaxed">{line}</span>
            </li>
          ))}
        </ul>
      </div>
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

export default function StructuredDescription({ description }: { description: string }) {
  const sections = parseDescription(description);

  if (sections.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-6 space-y-4">
      <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
        Description
      </p>
      {sections.map((section, i) => {
        switch (section.type) {
          case "HOW_IT_WORKS":
            return <HowItWorksBlock key={i} lines={section.lines} />;
          case "IMPORTANT":
            return <ImportantBlock key={i} lines={section.lines} />;
          default:
            return <TextBlock key={i} lines={section.lines} />;
        }
      })}
    </section>
  );
}
