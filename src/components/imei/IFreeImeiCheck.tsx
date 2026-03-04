import { useState, useEffect } from "react";
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
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface IFreeService {
  id: string;
  name: string;
  price?: string;
  time?: string;
  description?: string;
}

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
  const [services, setServices] = useState<IFreeService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  const fetchServices = async () => {
    setServicesLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-ifree-services");
      if (error) throw new Error(error.message);

      let parsed: IFreeService[] = [];
      if (data?.services && Array.isArray(data.services)) {
        parsed = data.services.map((s: any) => ({
          id: String(s.id ?? ""),
          name: s.name ?? "",
          price: s.price ?? undefined,
          time: s.time ?? undefined,
          description: s.description ?? undefined,
        }));
      } else if (Array.isArray(data)) {
        parsed = data.map((s: any) => ({
          id: String(s.id ?? s.service_id ?? ""),
          name: s.name ?? s.service_name ?? "",
          price: s.price ?? s.credit ?? undefined,
          time: s.time ?? s.processing_time ?? undefined,
          description: s.description ?? undefined,
        }));
      } else if (data && typeof data === "object" && !data.error) {
        const entries = Object.values(data);
        if (entries.length > 0 && typeof entries[0] === "object") {
          parsed = (entries as any[]).map((s: any) => ({
            id: String(s.id ?? s.service_id ?? ""),
            name: s.name ?? s.service_name ?? "",
            price: s.price ?? s.credit ?? undefined,
            time: s.time ?? undefined,
            description: s.description ?? undefined,
          }));
        }
      }

      if (parsed.length > 0) {
        setServices(parsed);
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.error("No services returned from API");
      }
    } catch (err: any) {
      toast.error("Failed to load services: " + (err.message || "Unknown error"));
    } finally {
      setServicesLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

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
        <div className="flex-1">
          <h2 className="text-sm font-bold text-foreground">iFreeICloud Check</h2>
          <p className="text-[10px] text-muted-foreground">IMEI lookup via ifreeicloud API</p>
        </div>
        <button
          onClick={fetchServices}
          disabled={servicesLoading}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh services"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", servicesLoading && "animate-spin")} />
        </button>
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
            disabled={servicesLoading}
            className="w-full h-10 rounded-[var(--radius-input)] bg-secondary/50 border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 disabled:opacity-50"
          >
            <option value="">
              {servicesLoading ? "Loading services..." : "Select a check service..."}
            </option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.price ? ` — $${s.price}` : ""}
              </option>
            ))}
          </select>
          {services.length > 0 && (
            <p className="text-[10px] text-muted-foreground/50">
              {services.length} services available
            </p>
          )}
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
          <p className="text-[10px] text-muted-foreground/50">{imei.length}/15 digits</p>
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

              {result.account_balance !== undefined && (
                <div className="flex items-center gap-2 rounded-[var(--radius-btn)] bg-primary/5 border border-primary/15 px-4 py-3">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">API Balance:</span>
                  <span className="text-sm font-bold font-mono text-foreground">{result.account_balance}</span>
                </div>
              )}

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
