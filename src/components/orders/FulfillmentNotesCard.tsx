import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, Eye, EyeOff, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function NoteLineRow({
  label, value, revealed, copiedField, fieldKey, onCopy,
}: {
  label: string; value: string; revealed: boolean;
  copiedField: string | null; fieldKey: string; onCopy: (text: string, key: string) => void;
}) {
  const displayValue = !revealed ? "•".repeat(Math.min(value.length, 24)) : value;

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border/20 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.1em] font-medium text-muted-foreground mb-0.5">{label}</p>
        <p className={cn(
          "text-sm font-medium text-foreground whitespace-pre-wrap break-words",
          !revealed && "font-mono tracking-wider text-muted-foreground",
        )}>
          {displayValue}
        </p>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 hover:bg-primary/10" onClick={() => onCopy(value, fieldKey)}>
        {copiedField === fieldKey ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
      </Button>
    </div>
  );
}

interface FulfillmentNotesCardProps {
  notes: string;
  completed?: boolean;
}

export default function FulfillmentNotesCard({ notes, completed }: FulfillmentNotesCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const lines = notes.split("\n").filter((l) => l.trim().length > 0);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (lines.length === 0) return null;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">
          Fulfillment Notes
        </h3>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1.5 -mt-1" onClick={() => setRevealed(!revealed)}>
          {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {revealed ? "Hide" : "Reveal"}
        </Button>
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-secondary/20 overflow-hidden transition-all hover:border-primary/20">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <div className="flex items-center gap-2">
            <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", completed ? "bg-primary/15" : "bg-primary/10")}>
              <ScrollText className="w-3 h-3 text-primary" />
            </div>
            <span className={cn("text-[11px] font-semibold uppercase tracking-wider", completed ? "text-primary" : "text-muted-foreground")}>
              Order Fulfilled
            </span>
          </div>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1" onClick={() => handleCopy(notes, "copy-all")}>
            {copiedField === "copy-all" ? <CheckCircle2 className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            Copy All
          </Button>
        </div>

        <div className="px-4 pb-3.5">
          {lines.map((line, i) => (
            <NoteLineRow
              key={i}
              label={lines.length > 1 ? `Note ${i + 1}` : "Note"}
              value={line.trim()}
              revealed={revealed}
              copiedField={copiedField}
              fieldKey={`note-${i}`}
              onCopy={handleCopy}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
