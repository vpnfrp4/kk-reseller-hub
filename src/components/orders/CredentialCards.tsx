import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════
   CREDENTIAL PARSER
   ═══════════════════════════════════════════════════════ */

interface ParsedAccount {
  fields: { label: string; value: string; sensitive: boolean }[];
  raw: string;
}

/** Detect if a value looks like a password / key */
function isSensitive(label: string, _value: string): boolean {
  const l = label.toLowerCase();
  return (
    l.includes("password") ||
    l.includes("pass") ||
    l.includes("pin") ||
    l.includes("key") ||
    l.includes("code") ||
    l.includes("secret") ||
    l.includes("token")
  );
}

/** Detect if a value looks like an email */
function looksLikeEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/** Detect if a value looks like a date */
function looksLikeDate(v: string): boolean {
  return /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/.test(v.trim());
}

/**
 * Parse raw credential text into structured accounts.
 *
 * Supports formats:
 *  - `email / password`  (slash-separated)
 *  - `email:password`    (colon-separated, if email detected)
 *  - `key=value, key=value`  (comma-separated key-value)
 *  - `Label: Value` lines
 *  - plain single value (treated as key/code)
 *
 * Multi-line = multiple accounts
 */
export function parseCredentials(raw: string): ParsedAccount[] {
  if (!raw || raw.trim() === "" || raw === "Pending manual fulfillment") {
    return [];
  }

  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  const accounts: ParsedAccount[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip IMEI prefix lines
    if (trimmed.startsWith("IMEI:")) {
      accounts.push({
        raw: trimmed,
        fields: [
          { label: "IMEI Number", value: trimmed.replace("IMEI:", "").trim(), sensitive: false },
        ],
      });
      continue;
    }

    // Try key=value comma-separated: `email=foo@bar.com, password=xyz, name=John`
    if (/\w+=\S/.test(trimmed) && trimmed.includes(",")) {
      const pairs = trimmed.split(",").map((p) => p.trim());
      const fields: ParsedAccount["fields"] = [];
      for (const pair of pairs) {
        const eqIdx = pair.indexOf("=");
        if (eqIdx > 0) {
          const label = pair.slice(0, eqIdx).trim();
          const value = pair.slice(eqIdx + 1).trim();
          fields.push({
            label: label.charAt(0).toUpperCase() + label.slice(1),
            value,
            sensitive: isSensitive(label, value),
          });
        }
      }
      if (fields.length > 0) {
        accounts.push({ raw: trimmed, fields });
        continue;
      }
    }

    // Try `Label: Value` pairs on a single line separated by commas
    if (/\w+:\s?\S/.test(trimmed) && trimmed.includes(",")) {
      const pairs = trimmed.split(",").map((p) => p.trim());
      const fields: ParsedAccount["fields"] = [];
      let allParsed = true;
      for (const pair of pairs) {
        const colonIdx = pair.indexOf(":");
        if (colonIdx > 0) {
          const label = pair.slice(0, colonIdx).trim();
          const value = pair.slice(colonIdx + 1).trim();
          fields.push({
            label: label.charAt(0).toUpperCase() + label.slice(1),
            value,
            sensitive: isSensitive(label, value),
          });
        } else {
          allParsed = false;
        }
      }
      if (allParsed && fields.length > 0) {
        accounts.push({ raw: trimmed, fields });
        continue;
      }
    }

    // Try slash-separated: `email / password`
    if (trimmed.includes(" / ")) {
      const parts = trimmed.split(" / ").map((p) => p.trim());
      const fields: ParsedAccount["fields"] = [];
      for (let i = 0; i < parts.length; i++) {
        const val = parts[i];
        if (i === 0 && looksLikeEmail(val)) {
          fields.push({ label: "Email", value: val, sensitive: false });
        } else if (i === 0) {
          fields.push({ label: "Username", value: val, sensitive: false });
        } else if (i === 1) {
          fields.push({ label: "Password", value: val, sensitive: true });
        } else if (looksLikeDate(val)) {
          fields.push({ label: "Date", value: val, sensitive: false });
        } else {
          fields.push({
            label: `Field ${i + 1}`,
            value: val,
            sensitive: isSensitive(`field${i}`, val),
          });
        }
      }
      accounts.push({ raw: trimmed, fields });
      continue;
    }

    // Try colon-separated `email:password` (only if first part looks like email)
    if (trimmed.includes(":") && !trimmed.includes("://")) {
      const colonIdx = trimmed.indexOf(":");
      const before = trimmed.slice(0, colonIdx).trim();
      const after = trimmed.slice(colonIdx + 1).trim();
      if (looksLikeEmail(before) && after.length > 0) {
        accounts.push({
          raw: trimmed,
          fields: [
            { label: "Email", value: before, sensitive: false },
            { label: "Password", value: after, sensitive: true },
          ],
        });
        continue;
      }
    }

    // Fallback: single value (API key, VPN code, license etc.)
    if (looksLikeEmail(trimmed)) {
      accounts.push({
        raw: trimmed,
        fields: [{ label: "Email", value: trimmed, sensitive: false }],
      });
    } else {
      accounts.push({
        raw: trimmed,
        fields: [
          {
            label: "Credential",
            value: trimmed,
            sensitive: trimmed.length > 8,
          },
        ],
      });
    }
  }

  return accounts;
}

/* ═══════════════════════════════════════════════════════
   CREDENTIAL CARD COMPONENT
   ═══════════════════════════════════════════════════════ */

function FieldRow({
  label,
  value,
  sensitive,
  revealed,
  copiedField,
  fieldKey,
  onCopy,
}: {
  label: string;
  value: string;
  sensitive: boolean;
  revealed: boolean;
  copiedField: string | null;
  fieldKey: string;
  onCopy: (text: string, key: string) => void;
}) {
  const displayValue = sensitive && !revealed ? "•".repeat(Math.min(value.length, 16)) : value;

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/10 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.1em] font-medium text-muted-foreground/70 mb-0.5">
          {label}
        </p>
        <p
          className={cn(
            "text-sm font-medium text-foreground truncate",
            sensitive && !revealed && "font-mono tracking-wider text-muted-foreground"
          )}
        >
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

function AccountCard({
  account,
  index,
  revealed,
  copiedField,
  onCopy,
}: {
  account: ParsedAccount;
  index: number;
  revealed: boolean;
  copiedField: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border/30 bg-background/60 backdrop-blur-sm overflow-hidden transition-all hover:border-primary/20 hover:shadow-[0_0_20px_-6px_hsl(var(--primary)/0.1)]">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
            <KeyRound className="w-3 h-3 text-primary" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {account.fields.length === 1 && account.fields[0].label === "Credential"
              ? "Credential"
              : `Account ${index + 1}`}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
          onClick={() => onCopy(account.raw, `card-all-${index}`)}
        >
          {copiedField === `card-all-${index}` ? (
            <CheckCircle2 className="w-3 h-3 text-success" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
          Copy All
        </Button>
      </div>

      {/* Fields */}
      <div className="px-4 pb-3.5">
        {account.fields.map((field, fi) => (
          <FieldRow
            key={fi}
            label={field.label}
            value={field.value}
            sensitive={field.sensitive}
            revealed={revealed}
            copiedField={copiedField}
            fieldKey={`acc-${index}-f-${fi}`}
            onCopy={onCopy}
          />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════ */

interface CredentialCardsProps {
  rawCredentials: string;
  isImei?: boolean;
  sectionTitle?: string;
}

export default function CredentialCards({
  rawCredentials,
  isImei,
  sectionTitle,
}: CredentialCardsProps) {
  const [revealed, setRevealed] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const accounts = useMemo(() => parseCredentials(rawCredentials), [rawCredentials]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (accounts.length === 0) return null;

  const hasSensitive = accounts.some((a) => a.fields.some((f) => f.sensitive));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[11px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">
          {sectionTitle || (isImei ? "IMEI Result" : "Order Credentials")}
        </h3>
        {hasSensitive && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5 -mt-2"
            onClick={() => setRevealed(!revealed)}
          >
            {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {revealed ? "Hide" : "Reveal"}
          </Button>
        )}
      </div>

      {/* Cards grid */}
      <div
        className={cn(
          "grid gap-3",
          accounts.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
        )}
      >
        {accounts.map((account, i) => (
          <AccountCard
            key={i}
            account={account}
            index={i}
            revealed={!hasSensitive || revealed}
            copiedField={copiedField}
            onCopy={handleCopy}
          />
        ))}
      </div>

      {/* Copy All button */}
      {accounts.length > 1 && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 btn-glass gap-1.5 text-xs w-full sm:w-auto"
          onClick={() => handleCopy(rawCredentials, "all-global")}
        >
          {copiedField === "all-global" ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          Copy All Credentials
        </Button>
      )}
    </div>
  );
}
