import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCheck, Server } from "lucide-react";
import { cn } from "@/lib/utils";

interface Provider {
  id: string;
  name: string;
  logo_url: string | null;
  is_verified: boolean;
}

export default function ProviderLogosCarousel() {
  const { data: providers = [] } = useQuery({
    queryKey: ["landing-providers-carousel"],
    queryFn: async () => {
      const { data } = await supabase
        .from("imei_providers_public" as any)
        .select("id, name, logo_url, is_verified")
        .eq("status", "active")
        .order("sort_order");
      return (data || []) as unknown as Provider[];
    },
    staleTime: 120_000,
  });

  if (providers.length === 0) return null;

  // Double for seamless loop
  const doubled = [...providers, ...providers];

  return (
    <section className="border-t border-border bg-background py-10 sm:py-14">
      <div className="mx-auto max-w-4xl px-5 sm:px-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
          Trusted Providers
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          We partner with verified unlock service providers worldwide
        </p>
      </div>

      <div className="relative mt-8 overflow-hidden">
        {/* Edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-background to-transparent" />

        <div
          className="flex items-center gap-6 animate-ticker whitespace-nowrap px-4 hover:[animation-play-state:paused]"
          style={{ animationDuration: `${doubled.length * 5}s` }}
        >
          {doubled.map((p, i) => (
            <div
              key={`${p.id}-${i}`}
              className={cn(
                "inline-flex items-center gap-3 rounded-2xl border bg-card px-6 py-4 shadow-card shrink-0 transition-all hover:shadow-elevated",
                p.is_verified
                  ? "border-primary/20 hover:border-primary/40"
                  : "border-border"
              )}
            >
              {/* Logo or fallback icon */}
              {p.logo_url ? (
                <img
                  src={p.logo_url}
                  alt={`${p.name} logo`}
                  className="h-8 w-8 rounded-lg object-contain"
                />
              ) : (
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  p.is_verified ? "bg-primary/10" : "bg-muted"
                )}>
                  <Server className={cn(
                    "h-5 w-5",
                    p.is_verified ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
              )}

              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground">{p.name}</span>
                  {p.is_verified && (
                    <BadgeCheck className="h-4 w-4 text-primary" />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-medium uppercase tracking-wider",
                  p.is_verified ? "text-primary" : "text-muted-foreground"
                )}>
                  {p.is_verified ? "Verified Partner" : "Provider"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
