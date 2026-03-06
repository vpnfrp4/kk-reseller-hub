import { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseIfreeResponse, cleanIfreeResponse, parseSickwBetaResult } from "@/lib/ifree-response-parser";
import { sanitizeName } from "@/lib/sanitize-name";
import ImeiResultCard from "./ImeiResultCard";
import {
  Smartphone,
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  RefreshCw,
  ChevronsUpDown,
  Check,
  RotateCcw,
  ListRestart,
  Wifi,
  WifiOff,
  Clock,
  Hash,
  Shield,
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
import { motion, AnimatePresence } from "framer-motion";

interface IFreeService {
  id: string;
  name: string;
  price?: string;
  selling_price?: number;
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
  order_id?: string;
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

export interface IFreeImeiCheckHandle {
  prefill: (imei: string, serviceId?: string) => void;
}

const IFreeImeiCheck = forwardRef<IFreeImeiCheckHandle>(function IFreeImeiCheck(_props, ref) {
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
          name: sanitizeName(s.name ?? ""),
          price: s.price ?? undefined,
          selling_price: s.selling_price ? Number(s.selling_price) : undefined,
          time: s.time ?? undefined,
          description: s.description ?? undefined,
        }));
      } else if (Array.isArray(data)) {
        parsed = data.map((s: any) => ({
          id: String(s.id ?? s.service_id ?? ""),
          name: sanitizeName(s.name ?? s.service_name ?? ""),
          price: s.price ?? s.credit ?? undefined,
          time: s.time ?? s.processing_time ?? undefined,
          description: s.description ?? undefined,
        }));
      } else if (data && typeof data === "object" && !data.error) {
        const entries = Object.values(data);
        if (entries.length > 0 && typeof entries[0] === "object") {
          parsed = (entries as any[]).map((s: any) => ({
            id: String(s.id ?? s.service_id ?? ""),
            name: sanitizeName(s.name ?? s.service_name ?? ""),
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
          toast.info("Using cached services. Reconnecting…", { duration: 3000 });
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
      const { data, error } = await supabase.functions.invoke("check-ifree", {
        body: {
          imei: cleanImei,
          serviceId: String(serviceId).trim(),
          serviceName: selectedService?.name || "",
        },
      });
      if (error) throw new Error(error.message);

      const res = data as IFreeResult;
      setResult(res);

      if (res.charged && res.charged > 0) {
        toast.success(`Charged ${res.charged.toLocaleString()} MMK for IMEI check`);
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["ifree-check-history"] });
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
  const isApiKeyError = result?.error_code === "INVALID_API_KEY" || result?.error_code === "NO_API_KEY";
  const isAuthError = result?.error_code === "AUTH_REQUIRED";

  const getErrorIcon = () => {
    if (isBalanceError) return <Wallet className="w-4 h-4 text-destructive shrink-0 mt-0.5" />;
    return <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />;
  };

  const getErrorTitle = () => {
    if (isServiceError) return "Service Not Found";
    if (isBalanceError) return "Insufficient Balance";
    if (isApiKeyError) return "API Configuration Error";
    if (isAuthError) return "Session Expired";
    return "Check Failed";
  };

  const imeiDigits = imei.replace(/\D/g, "");
  const isImeiComplete = imeiDigits.length === 15;

  return (
    <div className="space-y-6">
      {/* ═══ PAGE HEADER CARD ═══ */}
      <div className="page-header-card">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_20px_-4px_hsl(var(--primary)/0.3)]">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">IMEI Check</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Lookup device information using IMEI services</p>
          </div>
        </div>
      </div>

      {/* ═══ MAIN FORM CARD ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-[var(--radius-card)] border border-border/50 bg-card overflow-hidden transition-all duration-300 hover:border-border/80 hover:shadow-[0_0_40px_-12px_hsl(var(--primary)/0.08)]"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Card Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">IMEI Lookup</h2>
              <p className="text-[10px] text-muted-foreground/60">
                Select a service and enter an IMEI to check
              </p>
            </div>
          </div>
          <button
            onClick={fetchServices}
            disabled={servicesLoading}
            className="p-2 rounded-xl hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all duration-200 hover:shadow-sm"
            title="Refresh services from provider"
          >
            <RefreshCw className={cn("w-4 h-4", servicesLoading && "animate-spin")} />
          </button>
        </div>

        {/* Form Body */}
        <div className="px-5 sm:px-6 py-6 space-y-5">
          {/* ── Service Selection ── */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              Service <span className="text-destructive">*</span>
            </label>
            <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
              <PopoverTrigger asChild>
                <button
                  disabled={servicesLoading}
                  className={cn(
                    "flex items-center justify-between w-full min-h-[48px] sm:min-h-[44px] rounded-2xl bg-secondary/30 border border-border/50 px-4 text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40",
                    "disabled:opacity-50 transition-all duration-200",
                    "hover:bg-secondary/50 hover:border-border",
                    selectedService ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span className="truncate text-left">
                    {servicesLoading
                      ? "Loading services..."
                      : selectedService
                      ? `${selectedService.name}${selectedService.selling_price ? ` — ${selectedService.selling_price.toLocaleString()} MMK` : ""}`
                      : "Search & select a service..."}
                  </span>
                  <ChevronsUpDown className="w-4 h-4 shrink-0 ml-2 opacity-40" />
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
                          {s.selling_price && s.selling_price > 0 ? (
                            <span className="ml-2 text-xs text-muted-foreground font-mono">{s.selling_price.toLocaleString()} MMK</span>
                          ) : null}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Service status */}
            {services.length > 0 && (
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/8 text-[10px] font-semibold text-primary border border-primary/10">
                  {services.length} Services
                </span>
                {servicesSource && servicesSource !== "unknown" && (
                  <span className="relative group inline-flex items-center gap-1.5 text-[10px] text-muted-foreground/50 cursor-default">
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      servicesSource === "cache" || servicesSource === "fallback"
                        ? "bg-warning animate-pulse"
                        : "bg-success"
                    )} />
                    <span className="sr-only">
                      {servicesSource === "cache" || servicesSource === "fallback" ? "Cached data" : "Live data — updated in real-time"}
                    </span>
                    {/* Tooltip */}
                    <span className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block whitespace-nowrap px-2.5 py-1 rounded-lg bg-popover border border-border text-[10px] text-popover-foreground shadow-md z-50">
                      {servicesSource === "cache" || servicesSource === "fallback" ? "Cached data" : "Live data — updated in real-time"}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── IMEI Input ── */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              IMEI Number <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={imei}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 15);
                  setImei(v);
                  setResult(null);
                }}
                placeholder="Enter 15-digit IMEI number"
                className={cn(
                  "w-full min-h-[48px] sm:min-h-[44px] rounded-2xl bg-secondary/30 border border-border/50 px-4 pr-20",
                  "font-mono text-sm text-foreground placeholder:text-muted-foreground/40",
                  "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40",
                  "transition-all duration-200 hover:bg-secondary/50 hover:border-border",
                  isImeiComplete && "border-success/40 focus:ring-success/30"
                )}
                maxLength={15}
              />
              <div className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-mono font-bold tabular-nums transition-colors duration-200",
                isImeiComplete ? "text-success" : "text-muted-foreground/40"
              )}>
                {imeiDigits.length} / 15
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/50">
              Dial <span className="font-mono font-bold text-muted-foreground">*#06#</span> on any phone to find its IMEI
            </p>
          </div>

          {/* ── Submit Button ── */}
          <Button
            onClick={handleCheck}
            disabled={loading || !imei.trim() || !serviceId}
            className={cn(
              "w-full min-h-[48px] sm:min-h-[44px] font-bold text-sm gap-2.5 rounded-2xl",
              "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground",
              "shadow-[0_0_24px_-4px_hsl(var(--primary)/0.3)]",
              "hover:shadow-[0_0_36px_-4px_hsl(var(--primary)/0.5)] hover:brightness-110",
              "transition-all duration-300 active:scale-[0.98]"
            )}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Checking...</>
            ) : (
              <><Search className="w-4 h-4" /> Check IMEI</>
            )}
          </Button>
        </div>

        {/* ═══ Loading Skeleton ═══ */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-border/50 px-5 sm:px-6 py-6 space-y-4"
            >
              <div className="flex items-center gap-2 animate-pulse">
                <div className="w-4 h-4 rounded-full bg-primary/20" />
                <div className="h-3 w-24 rounded-lg bg-muted-foreground/15" />
              </div>
              <div className="rounded-2xl bg-secondary/30 border border-border/30 p-5 space-y-3 animate-pulse">
                <div className="h-3 w-full rounded-lg bg-muted-foreground/10" />
                <div className="h-3 w-4/5 rounded-lg bg-muted-foreground/10" />
                <div className="h-3 w-3/5 rounded-lg bg-muted-foreground/10" />
                <div className="h-3 w-2/3 rounded-lg bg-muted-foreground/10" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ Result ═══ */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="border-t border-border/50 px-5 sm:px-6 py-6 space-y-4"
            >
              {/* Processing state */}
              {(result as any).status === "processing" ? (
                <>
                  <div className="flex items-start gap-3 rounded-2xl bg-primary/5 border border-primary/15 p-4">
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
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-xs font-bold text-primary transition-all duration-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Check Again
                  </button>
                </>
              ) : (result.error || (result as any).status === "error" || result.response === "") ? (
                <>
                  <div className="flex items-start gap-3 rounded-2xl bg-destructive/8 border border-destructive/15 p-4">
                    {getErrorIcon()}
                    <div className="flex-1">
                      <p className="text-xs font-bold text-destructive">{getErrorTitle()}</p>
                      <p className="text-xs text-destructive/80 mt-0.5">
                        {result.error || "The service returned an error. Please verify the IMEI and service selection, then try again."}
                      </p>
                      {result.error_code && (
                        <p className="text-[10px] text-destructive/50 mt-1.5 font-mono">Code: {result.error_code}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleCheck}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 flex-1 py-3 rounded-2xl border border-border bg-secondary/50 hover:bg-secondary text-xs font-bold text-muted-foreground hover:text-foreground transition-all duration-200"
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
                        className="flex items-center justify-center gap-2 flex-1 py-3 rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-xs font-bold text-primary transition-all duration-200"
                      >
                        <ListRestart className="w-3.5 h-3.5" />
                        Refresh Services
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <ImeiResultCard
                    result={result as Record<string, unknown>}
                    imei={imei}
                    serviceName={selectedService?.name || "Unknown Service"}
                    orderId={result.order_id}
                    charged={result.charged}
                  />

                  {result.account_balance !== undefined && (
                    <div className="flex items-center gap-3 rounded-2xl bg-primary/5 border border-primary/15 px-4 py-3">
                      <Wallet className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">API Balance:</span>
                      <span className="text-sm font-bold font-mono text-foreground">{result.account_balance}</span>
                    </div>
                  )}

                  <button
                    onClick={handleCheck}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-border bg-secondary/50 hover:bg-secondary text-xs font-bold text-muted-foreground hover:text-foreground transition-all duration-200"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Re-check IMEI
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
