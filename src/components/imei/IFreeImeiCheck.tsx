import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Smartphone,
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

const IFREE_SERVICES = [
  { id: "1", name: "iPhone - FMI OFF Check" },
  { id: "2", name: "iPhone - iCloud Status Check" },
  { id: "3", name: "iPhone - Carrier / SIM Lock Check" },
  { id: "4", name: "iPhone - Full Info (IMEI)" },
  { id: "5", name: "iPad - iCloud Status Check" },
  { id: "6", name: "Apple Watch - iCloud Check" },
  { id: "7", name: "MacBook - iCloud Check" },
  { id: "8", name: "Samsung - FRP Status Check" },
  { id: "9", name: "Samsung - Warranty / Info" },
  { id: "10", name: "IMEI Blacklist Check" },
];

interface IFreeResult {
  response?: string;
  account_balance?: string | number;
  error?: string;
  [key: string]: unknown;
}

export default function IFreeImeiCheck() {
  const [imei, setImei] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IFreeResult | null>(null);

  const handleCheck = async () => {
    if (!imei.trim()) {
      toast.error("Please enter an IMEI number");
      return;
    }
    if (!serviceId) {
      toast.error("Please select a service");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("check-ifree", {
        body: { imei: imei.trim(), serviceId },
      });

      if (error) throw new Error(error.message);
      setResult(data as IFreeResult);
    } catch (err: any) {
      toast.error(err.message || "Check failed");
      setResult({ error: err.message || "Check failed" });
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    if (result?.response) {
      navigator.clipboard.writeText(result.response);
      toast.success("Response copied!");
    }
  };

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Smartphone className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">iFreeICloud Check</h2>
          <p className="text-[10px] text-muted-foreground">IMEI lookup via ifreeicloud API</p>
        </div>
      </div>

      {/* Form */}
      <div className="px-5 py-5 space-y-4">
        {/* Service Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Service <span className="text-destructive">*</span>
          </label>
          <select
            value={serviceId}
            onChange={(e) => { setServiceId(e.target.value); setResult(null); }}
            className="w-full h-10 rounded-[var(--radius-input)] bg-secondary/50 border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
          >
            <option value="">Select a check service...</option>
            {IFREE_SERVICES.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* IMEI Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            IMEI Number <span className="text-destructive">*</span>
          </label>
          <Input
            type="text"
            value={imei}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 15);
              setImei(v);
              setResult(null);
            }}
            placeholder="Enter 15-digit IMEI number"
            className="bg-secondary/50 border-border font-mono text-sm rounded-[var(--radius-input)]"
            maxLength={15}
          />
          <p className="text-[10px] text-muted-foreground/50">
            {imei.length}/15 digits
          </p>
        </div>

        {/* Submit */}
        <Button
          onClick={handleCheck}
          disabled={loading || !imei.trim() || !serviceId}
          className={cn(
            "w-full h-11 font-bold text-sm gap-2 rounded-[var(--radius-btn)]",
            "bg-primary hover:bg-primary/90 text-primary-foreground",
            "shadow-[0_0_20px_hsl(var(--primary)/0.25)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)]",
            "transition-all duration-300"
          )}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Checking...</>
          ) : (
            <><Search className="w-4 h-4" /> Check IMEI</>
          )}
        </Button>
      </div>

      {/* Result */}
      {result && (
        <div className="border-t border-border px-5 py-5 space-y-4">
          {result.error ? (
            <div className="flex items-start gap-2.5 rounded-[var(--radius-btn)] bg-destructive/8 border border-destructive/15 p-4">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-destructive">Error</p>
                <p className="text-xs text-destructive/80 mt-0.5">{result.error}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Response Text */}
              {result.response && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Response</span>
                    </div>
                    <button
                      onClick={copyResult}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy response"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="rounded-[var(--radius-btn)] bg-secondary/50 border border-border p-4">
                    <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed">
                      {result.response}
                    </pre>
                  </div>
                </div>
              )}

              {/* Account Balance */}
              {result.account_balance !== undefined && (
                <div className="flex items-center gap-2 rounded-[var(--radius-btn)] bg-primary/5 border border-primary/15 px-4 py-3">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">API Balance:</span>
                  <span className="text-sm font-bold font-mono text-foreground">{result.account_balance}</span>
                </div>
              )}

              {/* Raw JSON for any extra fields */}
              {!result.response && !result.error && (
                <div className="rounded-[var(--radius-btn)] bg-secondary/50 border border-border p-4">
                  <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
