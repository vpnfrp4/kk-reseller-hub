import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { parseIfreeResponse, cleanIfreeResponse, parseSickwBetaResult } from "@/lib/ifree-response-parser";
import {
  Smartphone,
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Copy,
  RefreshCw,
  ChevronsUpDown,
  Check,
  RotateCcw,
  ListRestart,
} from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

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
  error_code?: string;
  charged?: number;
  charge_error?: string;
  required?: number;
  current_balance?: number;
  [key: string]: unknown;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export default function IFreeImeiCheck() {
  const queryClient = useQueryClient();
  const [imei, setImei] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IFreeResult | null>(null);
  const [services, setServices] = useState<IFreeService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesSource, setServicesSource] = useState<string>("");
  const [serviceOpen, setServiceOpen] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId]
  );

  const fetchServices = async () => {
    setServicesLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-ifree-services");
      if (error) throw new Error(error.message);

      let parsed: IFreeService[] = [];
      const source = data?.source || "unknown";
      setServicesSource(source);

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
        setLastSynced(new Date());
        if (source === "fallback" || source === "cache") {
          toast.info("Using cached service list. Live sync may be unavailable.", { duration: 4000 });
        } else {
          toast.success(`Loaded ${parsed.length} services from provider`, { duration: 2000 });
        }
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.error("No services returned from API. Please try refreshing.");
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

    const cleanImei = imei.replace(/\D/g, "").trim();
    if (cleanImei.length !== 15) {
      toast.error("IMEI must be exactly 15 digits");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Pass the sell price so the edge function can charge the user
      const sellPrice = selectedService?.price ? Number(selectedService.price) : 0;

      const { data, error } = await supabase.functions.invoke("check-ifree", {
        body: {
          imei: cleanImei,
          serviceId: String(serviceId).trim(),
          serviceName: selectedService?.name || "",
          servicePrice: sellPrice,
        },
      });
      if (error) throw new Error(error.message);

      const res = data as IFreeResult;
      setResult(res);

      // If balance was charged, refresh profile data instantly
      if (res.charged && res.charged > 0) {
        toast.success(`Charged ${res.charged.toLocaleString()} MMK for IMEI check`);
        // Invalidate all profile-related queries to refresh balance everywhere
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
      }

      if (res.charge_error) {
        toast.warning(res.charge_error);
      }
    } catch (err: any) {
      toast.error(err.message || "Check failed");
      setResult({ error: err.message || "Check failed" });
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    if (result?.response) {
      navigator.clipboard.writeText(cleanIfreeResponse(result.response));
      toast.success("Response copied!");
    }
  };

  const parsedResponse = useMemo(() => {
    if (!result) return [];
    if (!result.response && !result.error && typeof result === "object") {
      const beta = parseSickwBetaResult(result as Record<string, unknown>);
      if (beta.length > 0) return beta;
    }
    if (!result.response) return [];
    return parseIfreeResponse(result.response);
  }, [result]);

  const isServiceError = result?.error_code === "SERVICE_NOT_FOUND";
  const isBalanceError = result?.error_code === "INSUFFICIENT_BALANCE" || result?.error_code === "USER_INSUFFICIENT_BALANCE";
  const isApiKeyError = result?.error_code === "INVALID_API_KEY";

  const getErrorIcon = () => {
    if (isBalanceError) return <Wallet className="w-4 h-4 text-destructive shrink-0 mt-0.5" />;
    return <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />;
  };

  const getErrorTitle = () => {
    if (isServiceError) return "Service Not Found";
    if (isBalanceError) return "Insufficient Balance";
    if (isApiKeyError) return "API Key Error";
    return "Check Failed";
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
          <p className="text-[10px] text-muted-foreground">
            IMEI lookup via ifreeicloud API
            {servicesSource === "fallback" && (
              <span className="ml-1 text-warning">(cached list)</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchServices}
          disabled={servicesLoading}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh services from provider"
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
          <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
            <PopoverTrigger asChild>
              <button
                disabled={servicesLoading}
                className={cn(
                  "flex items-center justify-between w-full h-10 rounded-[var(--radius-input)] bg-secondary/50 border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 disabled:opacity-50 transition-colors",
                  selectedService ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <span className="truncate">
                  {servicesLoading
                    ? "Loading services..."
                    : selectedService
                    ? `${selectedService.name}${selectedService.price ? ` — $${selectedService.price}` : ""}`
                    : "Search & select a service..."}
                </span>
                <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 ml-2 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search services..." />
                <CommandList>
                  <CommandEmpty>No service found.</CommandEmpty>
                  <CommandGroup>
                    {services.map((s) => (
                      <CommandItem
                        key={s.id}
                        value={s.name}
                        onSelect={() => {
                          setServiceId(s.id);
                          setResult(null);
                          setServiceOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-3.5 w-3.5",
                            serviceId === s.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="flex-1 truncate">{s.name}</span>
                        {s.price && (
                          <span className="ml-2 text-xs text-muted-foreground font-mono">${s.price}</span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {services.length > 0 && (
            <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1 flex-wrap">
              <span>{services.length} services available</span>
              {servicesSource && servicesSource !== "unknown" && (
                <span>· {servicesSource === "cache" ? "cached" : "live"}</span>
              )}
              {lastSynced && (
                <span>· synced {formatTimeAgo(lastSynced)}</span>
              )}
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
          <p className={cn(
            "text-[10px]",
            imei.length === 15 ? "text-success" : "text-muted-foreground/50"
          )}>
            {imei.length}/15 digits
            {imei.length === 15 && " ✓"}
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

      {/* Loading Skeleton */}
      {loading && (
        <div className="border-t border-border px-5 py-5 space-y-4 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-primary/20" />
            <div className="h-3 w-20 rounded bg-muted-foreground/15" />
          </div>
          <div className="rounded-[var(--radius-btn)] bg-secondary/50 border border-border p-4 space-y-2.5">
            <div className="h-3 w-full rounded bg-muted-foreground/15" />
            <div className="h-3 w-4/5 rounded bg-muted-foreground/15" />
            <div className="h-3 w-3/5 rounded bg-muted-foreground/15" />
            <div className="h-3 w-2/3 rounded bg-muted-foreground/15" />
          </div>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="border-t border-border px-5 py-5 space-y-4">
          {/* Processing state: success but empty/pending */}
          {(result as any).status === "processing" ? (
            <>
              <div className="flex items-start gap-2.5 rounded-[var(--radius-btn)] bg-primary/5 border border-primary/15 p-4">
                <Loader2 className="w-4 h-4 text-primary shrink-0 mt-0.5 animate-spin" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-primary">Processing</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {result.response || "Your request is being processed by the provider. Please check back shortly."}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCheck}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-[var(--radius-btn)] border border-primary/30 bg-primary/5 hover:bg-primary/10 text-xs font-semibold text-primary transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Check Again
              </button>
            </>
          ) : (result.error || (result as any).status === "error" || result.response === "") ? (
            <>
              <div className="flex items-start gap-2.5 rounded-[var(--radius-btn)] bg-destructive/8 border border-destructive/15 p-4">
                {getErrorIcon()}
                <div className="flex-1">
                  <p className="text-xs font-bold text-destructive">{getErrorTitle()}</p>
                  <p className="text-xs text-destructive/80 mt-0.5">
                    {result.error || "The service returned an error. Please verify the IMEI and service selection, then try again."}
                  </p>
                  {result.error_code && (
                    <p className="text-[10px] text-destructive/50 mt-1 font-mono">Code: {result.error_code}</p>
                  )}
                </div>
              </div>

              {/* Contextual action buttons for specific errors */}
              <div className="flex gap-2">
                <button
                  onClick={handleCheck}
                  disabled={loading}
                  className="flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-[var(--radius-btn)] border border-border bg-secondary/50 hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry Check
                </button>

                {(isServiceError || result.error_code === "PROVIDER_ERROR") && (
                  <button
                    onClick={() => {
                      setServiceId("");
                      setResult(null);
                      fetchServices();
                    }}
                    className="flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-[var(--radius-btn)] border border-primary/30 bg-primary/5 hover:bg-primary/10 text-xs font-semibold text-primary transition-colors"
                  >
                    <ListRestart className="w-3.5 h-3.5" />
                    Refresh Services
                  </button>
                )}
              </div>
            </>
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
                  <div className="rounded-[var(--radius-btn)] bg-secondary/50 border border-border overflow-hidden">
                    {parsedResponse.length > 0 ? (
                      <div className="divide-y divide-border">
                        {parsedResponse.map((pair, i) =>
                          pair.key ? (
                            <div key={i} className="flex items-start px-4 py-2.5 gap-3">
                              <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap min-w-[100px]">
                                {pair.key}
                              </span>
                              <span className="text-xs font-mono text-foreground break-all">
                                {pair.value}
                              </span>
                            </div>
                          ) : (
                            <div key={i} className="px-4 py-2.5">
                              <span className="text-xs font-mono text-foreground break-all">
                                {pair.value}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed p-4">
                        {cleanIfreeResponse(result.response)}
                      </pre>
                    )}
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

              {!result.response && parsedResponse.length === 0 && !result.error && (result as any).status !== "error" && (
                <div className="rounded-[var(--radius-btn)] bg-secondary/50 border border-border p-4">
                  <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}

              {/* Re-check button for successful results */}
              <button
                onClick={handleCheck}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-[var(--radius-btn)] border border-border bg-secondary/50 hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Re-check IMEI
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
