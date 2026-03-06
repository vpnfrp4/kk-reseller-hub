import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Check, ChevronDown, Copy, Wand2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ─── Preset Data ─── */
const BRAND_CARRIER_PRESETS = [
  // Carriers
  "AT&T", "T-Mobile", "Sprint", "Verizon", "Cricket", "MetroPCS",
  "Boost Mobile", "US Cellular", "Tracfone", "Xfinity Mobile",
  "EE", "Vodafone", "O2", "Three", "Rogers", "Bell", "Telus",
  "Softbank", "Docomo", "KDDI", "AU",
  // Brands
  "Apple", "Samsung", "Google", "Huawei", "Xiaomi", "OnePlus",
  "LG", "Motorola", "Sony", "Nokia", "Oppo", "Vivo", "Realme",
  "ZTE", "Alcatel", "HTC",
  // Digital
  "Netflix", "Spotify", "Canva", "CapCut", "ChatGPT", "Adobe",
  "Microsoft", "NordVPN", "ExpressVPN", "Surfshark", "YouTube",
];

const CORE_FUNCTIONS = [
  "Network Unlock", "SIM Unlock", "FRP Bypass", "iCloud Remove",
  "IMEI Check", "Blacklist Check", "Carrier Check",
  "Account Create", "Premium Account", "VPN Subscription",
  "License Key", "Activation",
  "Followers", "Likes", "Views", "Comments", "Members", "Subscribers",
];

const KEY_FEATURES = [
  "Permanent", "Global", "All Models", "All Versions", "Clean IMEI",
  "Basic Info", "Full Info", "Blacklist Status", "SIM-Lock Status",
  "IMEI Based", "Server Based", "Remote Service",
  "No 2FA", "2FA Enabled", "USA Region", "Worldwide",
  "1 Screen", "2 Screens", "4K", "HD", "Premium", "Pro",
];

const DELIVERY_METHODS = [
  "Instant Delivery", "Manual Delivery", "API Delivery",
  "1-30 Minutes", "1-6 Hours", "1-24 Hours",
  "1-3 Days", "3-7 Days", "Remote Service",
];

const WARRANTY_OPTIONS = [
  "No Warranty", "24H Warranty", "48H Warranty",
  "7 Days Warranty", "14 Days Warranty", "30 Days Warranty",
  "90 Days Warranty", "Lifetime Warranty",
];

interface ProductNameGeneratorProps {
  onApply: (name: string) => void;
  currentName?: string;
}

export default function ProductNameGenerator({ onApply, currentName }: ProductNameGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [brandCarrier, setBrandCarrier] = useState("");
  const [customBrandCarrier, setCustomBrandCarrier] = useState("");
  const [device, setDevice] = useState("");
  const [coreFunction, setCoreFunction] = useState("");
  const [customCoreFunction, setCustomCoreFunction] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [customFeature, setCustomFeature] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [warranty, setWarranty] = useState("");
  const [copied, setCopied] = useState(false);

  const effectiveBrand = brandCarrier === "__custom" ? customBrandCarrier : brandCarrier;
  const effectiveFunction = coreFunction === "__custom" ? customCoreFunction : coreFunction;

  const generatedName = useMemo(() => {
    const parts: string[] = [];

    // Primary: [Brand/Carrier] [Device] [Core Function]
    if (effectiveBrand) parts.push(effectiveBrand);
    if (device.trim()) parts.push(device.trim());
    if (effectiveFunction) parts.push(effectiveFunction);

    if (parts.length === 0) return "";

    const primary = parts.join(" ");

    // Suffix: - [Features], [Delivery], [Warranty]
    const suffixParts: string[] = [];
    if (features.length > 0) suffixParts.push(...features);
    if (deliveryMethod) suffixParts.push(deliveryMethod);
    if (warranty && warranty !== "No Warranty") suffixParts.push(warranty);

    if (suffixParts.length > 0) {
      return `${primary} - ${suffixParts.join(", ")}`;
    }

    return primary;
  }, [effectiveBrand, device, effectiveFunction, features, deliveryMethod, warranty]);

  const toggleFeature = useCallback((feat: string) => {
    setFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]
    );
  }, []);

  const addCustomFeature = () => {
    const trimmed = customFeature.trim();
    if (trimmed && !features.includes(trimmed)) {
      setFeatures((prev) => [...prev, trimmed]);
      setCustomFeature("");
    }
  };

  const handleApply = () => {
    if (!generatedName) {
      toast.error("Build a name first by selecting components");
      return;
    }
    onApply(generatedName);
    toast.success("Name applied to product");
  };

  const handleCopy = () => {
    if (!generatedName) return;
    navigator.clipboard.writeText(generatedName);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleReset = () => {
    setBrandCarrier("");
    setCustomBrandCarrier("");
    setDevice("");
    setCoreFunction("");
    setCustomCoreFunction("");
    setFeatures([]);
    setCustomFeature("");
    setDeliveryMethod("");
    setWarranty("");
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-all text-left",
            open
              ? "border-primary/30 bg-primary/5"
              : "border-border/50 bg-muted/20 hover:border-primary/20 hover:bg-muted/30"
          )}
        >
          <div className="flex items-center gap-2">
            <Wand2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">Product Name Generator</span>
            <span className="text-[9px] text-muted-foreground/60">Build standardized names</span>
          </div>
          <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2">
        <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-4">

          {/* ── Live Preview ── */}
          {generatedName && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[9px] font-semibold text-primary uppercase tracking-wider">Generated Name</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button" onClick={handleCopy}
                    className="p-1 rounded hover:bg-primary/10 text-primary transition-colors"
                    title="Copy"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <p className="text-sm font-semibold text-foreground break-words leading-relaxed">
                {generatedName}
              </p>
            </div>
          )}

          {/* ── Brand / Carrier ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-[10px]">Brand / Carrier</Label>
              <Select value={brandCarrier} onValueChange={setBrandCarrier}>
                <SelectTrigger className="bg-muted/50 border-border h-9 text-xs">
                  <SelectValue placeholder="Select or custom..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="__none">None</SelectItem>
                  <SelectItem value="__custom">Custom...</SelectItem>
                  {BRAND_CARRIER_PRESETS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {brandCarrier === "__custom" && (
                <Input
                  value={customBrandCarrier}
                  onChange={(e) => setCustomBrandCarrier(e.target.value)}
                  placeholder="Enter brand/carrier..."
                  className="bg-muted/50 border-border h-8 text-xs mt-1"
                />
              )}
            </div>

            {/* ── Device / Model ── */}
            <div className="space-y-1">
              <Label className="text-muted-foreground text-[10px]">Device / Model</Label>
              <Input
                value={device}
                onChange={(e) => setDevice(e.target.value)}
                placeholder="e.g. iPhone 15 Pro Max"
                className="bg-muted/50 border-border h-9 text-xs"
              />
            </div>
          </div>

          {/* ── Core Function ── */}
          <div className="space-y-1">
            <Label className="text-muted-foreground text-[10px]">Core Function</Label>
            <Select value={coreFunction} onValueChange={setCoreFunction}>
              <SelectTrigger className="bg-muted/50 border-border h-9 text-xs">
                <SelectValue placeholder="Select function..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="__none">None</SelectItem>
                <SelectItem value="__custom">Custom...</SelectItem>
                {CORE_FUNCTIONS.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {coreFunction === "__custom" && (
              <Input
                value={customCoreFunction}
                onChange={(e) => setCustomCoreFunction(e.target.value)}
                placeholder="Enter function..."
                className="bg-muted/50 border-border h-8 text-xs mt-1"
              />
            )}
          </div>

          {/* ── Key Features (multi-select tags) ── */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-[10px]">Key Features (click to toggle)</Label>
            <div className="flex flex-wrap gap-1.5">
              {KEY_FEATURES.map((feat) => {
                const active = features.includes(feat);
                return (
                  <button
                    key={feat}
                    type="button"
                    onClick={() => toggleFeature(feat)}
                    className={cn(
                      "text-[10px] px-2.5 py-1 rounded-full font-medium border transition-all",
                      active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/20 hover:text-foreground"
                    )}
                  >
                    {active && <Check className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />}
                    {feat}
                  </button>
                );
              })}
            </div>
            {/* Custom feature input */}
            <div className="flex items-center gap-1.5 mt-1">
              <Input
                value={customFeature}
                onChange={(e) => setCustomFeature(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomFeature(); } }}
                placeholder="Add custom feature..."
                className="bg-muted/50 border-border h-7 text-xs flex-1"
              />
              <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] px-2"
                onClick={addCustomFeature} disabled={!customFeature.trim()}>
                Add
              </Button>
            </div>
            {/* Custom features added */}
            {features.filter((f) => !KEY_FEATURES.includes(f)).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {features.filter((f) => !KEY_FEATURES.includes(f)).map((f) => (
                  <Badge key={f} variant="secondary" className="text-[9px] gap-1 pr-1">
                    {f}
                    <button type="button" onClick={() => toggleFeature(f)} className="hover:text-destructive">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* ── Delivery + Warranty ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-[10px]">Delivery Method</Label>
              <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
                <SelectTrigger className="bg-muted/50 border-border h-9 text-xs">
                  <SelectValue placeholder="Select delivery..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {DELIVERY_METHODS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-[10px]">Warranty</Label>
              <Select value={warranty} onValueChange={setWarranty}>
                <SelectTrigger className="bg-muted/50 border-border h-9 text-xs">
                  <SelectValue placeholder="Select warranty..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {WARRANTY_OPTIONS.map((w) => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center gap-2 pt-1 border-t border-border/30">
            <Button
              type="button"
              size="sm"
              className="flex-1 gap-1.5 text-xs h-9 font-semibold"
              onClick={handleApply}
              disabled={!generatedName}
            >
              <Check className="w-3.5 h-3.5" />
              Use This Name
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-xs px-3"
              onClick={handleReset}
            >
              Reset
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
