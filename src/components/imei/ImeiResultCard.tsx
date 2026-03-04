import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, Eye, EyeOff, Smartphone, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { parseIfreeResponse, cleanIfreeResponse, parseSickwBetaResult } from "@/lib/ifree-response-parser";
import { useNavigate } from "react-router-dom";
import { Money } from "@/components/shared";

interface ImeiResultCardProps {
  result: Record<string, unknown>;
  imei: string;
  serviceName: string;
  orderId?: string | null;
  charged?: number;
}

export default function ImeiResultCard({ result, imei, serviceName, orderId, charged }: ImeiResultCardProps) {
  const [revealed, setRevealed] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const navigate = useNavigate();

  const parsedResponse = useMemo(() => {
    if (!result.response && typeof result === "object") {
      const beta = parseSickwBetaResult(result);
      if (beta.length > 0) return beta;
    }
    if (!result.response) return [];
    return parseIfreeResponse(result.response as string);
  }, [result]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAll = () => {
    const text = result.response
      ? cleanIfreeResponse(result.response as string)
      : parsedResponse.map(p => p.key ? `${p.key}: ${p.value}` : p.value).join("\n");
    handleCopy(text, "copy-all");
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">
          IMEI Check Result
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

      {/* Main Card */}
      <div className="rounded-xl border border-border/30 bg-background/60 backdrop-blur-sm overflow-hidden transition-all hover:border-primary/20 hover:shadow-[0_0_20px_-6px_hsl(var(--primary)/0.1)]">
        {/* Card header */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2 gold-shimmer-bg">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-primary/20">
              <Smartphone className="w-3 h-3 text-primary" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider gold-shimmer">
              Check Completed
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
            onClick={copyAll}
          >
            {copiedField === "copy-all" ? (
              <CheckCircle2 className="w-3 h-3 text-success" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            Copy All
          </Button>
        </div>

        {/* Fields */}
        <div className="px-4 pb-3.5">
          {/* Static fields: IMEI & Service */}
          <FieldRow
            label="IMEI Number"
            value={imei}
            revealed={revealed}
            copiedField={copiedField}
            fieldKey="imei"
            onCopy={handleCopy}
          />
          <FieldRow
            label="Service"
            value={serviceName}
            revealed={revealed}
            copiedField={copiedField}
            fieldKey="service"
            onCopy={handleCopy}
          />

          {/* Dynamic parsed fields */}
          {parsedResponse.map((pair, i) => (
            <FieldRow
              key={i}
              label={pair.key || `Field ${i + 1}`}
              value={pair.value}
              revealed={revealed}
              copiedField={copiedField}
              fieldKey={`field-${i}`}
              onCopy={handleCopy}
            />
          ))}

          {/* Charged amount */}
          {charged && charged > 0 && (
            <div className="flex items-center justify-between gap-3 py-2 border-b border-border/10 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.1em] font-medium text-muted-foreground/70 mb-0.5">
                  Amount Charged
                </p>
                <p className="text-sm font-medium text-foreground">
                  <Money amount={charged} />
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View in Orders button */}
      {orderId && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={() => navigate(`/dashboard/orders/${orderId}`)}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View in Order History
        </Button>
      )}
    </div>
  );
}

/* ── Field Row ── */
function FieldRow({
  label,
  value,
  revealed,
  copiedField,
  fieldKey,
  onCopy,
}: {
  label: string;
  value: string;
  revealed: boolean;
  copiedField: string | null;
  fieldKey: string;
  onCopy: (text: string, key: string) => void;
}) {
  const displayValue = !revealed ? "•".repeat(Math.min(value.length, 16)) : value;

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/10 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.1em] font-medium text-muted-foreground/70 mb-0.5">
          {label}
        </p>
        <p className={cn(
          "text-sm font-medium text-foreground break-all",
          !revealed && "font-mono tracking-wider text-muted-foreground"
        )}>
          {displayValue}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 hover:bg-primary/10"
        onClick={() => onCopy(value, fieldKey)}
      >
        {copiedField === fieldKey ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
}
