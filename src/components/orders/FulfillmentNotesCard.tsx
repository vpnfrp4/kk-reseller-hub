import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, Eye, EyeOff, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FulfillmentNotesCardProps {
  notes: string;
}

export default function FulfillmentNotesCard({ notes }: FulfillmentNotesCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const lines = notes.split("\n").filter((l) => l.trim().length > 0);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (lines.length === 0) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[11px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">
          Fulfillment Notes
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground gap-1.5 -mt-2"
          onClick={() => setRevealed(!revealed)}
        >
          {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {revealed ? "Hide" : "Reveal"}
        </Button>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-border/30 bg-background/60 backdrop-blur-sm overflow-hidden transition-all hover:border-primary/20 hover:shadow-[0_0_20px_-6px_hsl(var(--primary)/0.1)]">
        {/* Card header */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <StickyNote className="w-3 h-3 text-primary" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
            onClick={() => handleCopy(notes, "copy-all")}
          >
            {copiedKey === "copy-all" ? (
              <CheckCircle2 className="w-3 h-3 text-success" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            Copy All
          </Button>
        </div>

        {/* Lines */}
        <div className="px-4 pb-3.5">
          {lines.map((line, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 py-2 border-b border-border/10 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.1em] font-medium text-muted-foreground/70 mb-0.5">
                  {lines.length > 1 ? `Line ${i + 1}` : "Note"}
                </p>
                <p
                  className={cn(
                    "text-sm font-medium text-foreground whitespace-pre-wrap break-words",
                    !revealed && "font-mono tracking-wider text-muted-foreground"
                  )}
                >
                  {revealed ? line : "•".repeat(Math.min(line.length, 24))}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 hover:bg-primary/10"
                onClick={() => handleCopy(line, `line-${i}`)}
              >
                {copiedKey === `line-${i}` ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
