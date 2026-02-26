import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search,
  ArrowLeft,
  Smartphone,
  Filter,
  ArrowUpDown,
  Clock,
  ShieldCheck,
  Zap,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ThemeToggle from "@/components/ThemeToggle";
import Money from "@/components/shared/Money";
import ImeiOrderModal from "@/components/imei/ImeiOrderModal";

interface ImeiService {
  id: string;
  brand: string;
  service_name: string;
  carrier: string;
  country: string;
  processing_time: string;
  price: number;
  final_price: number;
  fulfillment_mode: string;
  status: string;
}

const BRAND_ICONS: Record<string, string> = {
  Apple: "🍎",
  Samsung: "📱",
  Xiaomi: "📲",
  Huawei: "📡",
  Google: "🔍",
  Motorola: "📞",
  LG: "📺",
};

type SpeedTier = "fast" | "medium" | "slow";

interface SpeedInfo {
  tier: SpeedTier;
  label: string;
  className: string;
}

const SPEED_TIERS: Record<SpeedTier, { filterLabel: string; dot: string }> = {
  fast: { filterLabel: "⚡ Fast", dot: "bg-emerald-400" },
  medium: { filterLabel: "⏳ Medium", dot: "bg-amber-400" },
  slow: { filterLabel: "🕐 Slow", dot: "bg-rose-400" },
};

/** Classify processing time into speed tiers for badge color coding */
function getSpeedTier(processingTime: string): SpeedInfo {
  const lower = processingTime.toLowerCase();
  if (lower.includes("instant") || lower.includes("minute")) {
    return { tier: "fast", label: processingTime, className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" };
  }
  if (lower.includes("hour") || lower.match(/1[\s-]*day/) || lower.match(/1-3\s*day/i)) {
    return { tier: "medium", label: processingTime, className: "bg-amber-500/15 text-amber-400 border-amber-500/25" };
  }
  return { tier: "slow", label: processingTime, className: "bg-rose-500/15 text-rose-400 border-rose-500/25" };
}

export default function ImeiMarketplacePage() {
  const { isAuthenticated, profile } = useAuth();
  const navigate = useNavigate();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [carrierFilter, setCarrierFilter] = useState("all");
  const [speedFilter, setSpeedFilter] = useState<SpeedTier | "all">("all");
  const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "name">("price_asc");

  // Order modal
  const [selectedService, setSelectedService] = useState<ImeiService | null>(null);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["imei-products-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("product_type", "imei")
        .order("sort_order");
      if (error) throw error;
      return (data || []).map((p: any) => ({
        id: p.id,
        brand: p.brand || "",
        service_name: p.name,
        carrier: p.carrier || "All",
        country: p.country || "All",
        processing_time: p.processing_time || "1-3 Days",
        price: p.wholesale_price,
        final_price: p.final_price || p.wholesale_price,
        fulfillment_mode: p.fulfillment_mode || "manual",
        status: "active",
      })) as ImeiService[];
    },
  });

  // Derived filter options
  const brands = useMemo(() => [...new Set(services.map((s) => s.brand))].sort(), [services]);
  const countries = useMemo(() => [...new Set(services.map((s) => s.country))].sort(), [services]);
  const carriers = useMemo(() => [...new Set(services.map((s) => s.carrier))].sort(), [services]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let result = services;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.service_name.toLowerCase().includes(q) ||
          s.brand.toLowerCase().includes(q) ||
          s.carrier.toLowerCase().includes(q) ||
          s.country.toLowerCase().includes(q)
      );
    }
    if (brandFilter !== "all") result = result.filter((s) => s.brand === brandFilter);
    if (countryFilter !== "all") result = result.filter((s) => s.country === countryFilter);
    if (carrierFilter !== "all") result = result.filter((s) => s.carrier === carrierFilter);
    if (speedFilter !== "all") result = result.filter((s) => getSpeedTier(s.processing_time).tier === speedFilter);

    if (sortBy === "price_asc") result = [...result].sort((a, b) => (a.final_price || a.price) - (b.final_price || b.price));
    else if (sortBy === "price_desc") result = [...result].sort((a, b) => (b.final_price || b.price) - (a.final_price || a.price));
    else result = [...result].sort((a, b) => a.service_name.localeCompare(b.service_name));

    return result;
  }, [services, searchQuery, brandFilter, countryFilter, carrierFilter, speedFilter, sortBy]);

  const handleOrder = (service: ImeiService) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setSelectedService(service);
  };

  return (
    <>
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold tracking-tight text-foreground">
              KK<span className="text-primary">Tech</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border">
                  <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-bold font-mono tabular-nums">
                    {(profile?.balance || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground">MMK</span>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/dashboard/imei-orders">My Orders</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Home
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/login">Reseller Login</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <Smartphone className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            IMEI Unlock Services
          </h1>
          <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
            Fast, secure, professional unlocking solutions. Browse services and place orders at wholesale prices.
          </p>
        </div>

        {/* Filters — Sticky */}
        <div className="sticky top-[57px] z-40 bg-background/95 backdrop-blur-sm border border-border rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={carrierFilter} onValueChange={setCarrierFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Carrier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Carriers</SelectItem>
                {carriers.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price_asc">Price: Low → High</SelectItem>
                <SelectItem value="price_desc">Price: High → Low</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Speed filter chips */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">Speed:</span>
            <button
              onClick={() => setSpeedFilter("all")}
              className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                speedFilter === "all"
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/30"
              }`}
            >
              All
            </button>
            {(Object.entries(SPEED_TIERS) as [SpeedTier, typeof SPEED_TIERS[SpeedTier]][]).map(([key, { filterLabel, dot }]) => (
              <button
                key={key}
                onClick={() => setSpeedFilter(speedFilter === key ? "all" : key)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  speedFilter === key
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/30"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                {filterLabel}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground">
              {filtered.length} service{filtered.length !== 1 ? "s" : ""} found
            </span>
          </div>
        </div>

        {/* Service Table — Desktop */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No services match your filters.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Brand</th>
                    <th>Carrier</th>
                    <th>Country</th>
                    <th>Processing</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((service, idx) => (
                    <tr
                      key={service.id}
                      className="animate-row-in"
                      style={{ animationDelay: `${idx * 20}ms` }}
                    >
                      <td className="p-default">
                        <span className="font-semibold text-foreground text-sm">
                          {service.service_name}
                        </span>
                      </td>
                      <td className="p-default">
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span>{BRAND_ICONS[service.brand] || "📱"}</span>
                          <span className="text-muted-foreground">{service.brand}</span>
                        </span>
                      </td>
                      <td className="p-default text-sm text-muted-foreground">
                        {service.carrier}
                      </td>
                      <td className="p-default text-sm text-muted-foreground">
                        {service.country}
                      </td>
                      <td className="p-default">
                        {(() => {
                          const tier = getSpeedTier(service.processing_time);
                          return (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${tier.className}`}>
                              <Clock className="w-3 h-3" />
                              {tier.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-default text-right">
                        <Money
                          amount={service.final_price || service.price}
                          className="text-lg font-bold text-primary drop-shadow-[0_0_4px_hsl(var(--primary)/0.3)]"
                        />
                      </td>
                      <td className="p-default text-right">
                        <Button size="sm" onClick={() => handleOrder(service)}>
                          <Zap className="w-3.5 h-3.5 mr-1" />
                          Order
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filtered.map((service) => (
                <div
                  key={service.id}
                  className="glass-card p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {service.service_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {BRAND_ICONS[service.brand] || "📱"} {service.brand} · {service.carrier} · {service.country}
                      </p>
                    </div>
                    <Money
                      amount={service.final_price || service.price}
                      className="text-base font-bold text-primary shrink-0"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    {(() => {
                      const tier = getSpeedTier(service.processing_time);
                      return (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${tier.className}`}>
                          <Clock className="w-3 h-3" />
                          {tier.label}
                        </span>
                      );
                    })()}
                    <Button size="sm" onClick={() => handleOrder(service)}>
                      <Zap className="w-3.5 h-3.5 mr-1" /> Order
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-border bg-card py-8">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <Link to="/" className="text-sm font-bold text-foreground">
            KK<span className="text-primary">Tech</span>
          </Link>
          <p className="mt-2 text-xs text-muted-foreground">
            Myanmar's wholesale GSM unlock server and digital accounts reseller platform.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} KKTech. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Order Modal */}
      {selectedService && (
        <ImeiOrderModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
        />
      )}
    </>
  );
}
