import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

function sanitizeName(raw: string): string {
  if (!raw) return raw;
  let cleaned = raw
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&[a-zA-Z0-9#]+;/g, "");
  cleaned = cleaned.replace(
    /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{1FA00}-\u{1FAFF}]/gu,
    ""
  );
  return cleaned.replace(/\s{2,}/g, " ").trim();
}

function parseHtmlServiceTable(html: string): any[] {
  const services: any[] = [];
  const rowRegex = /<tr[^>]*>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<\/tr>/gi;
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const idRaw = stripHtml(match[1]);
    const nameRaw = stripHtml(match[2]);
    const priceRaw = stripHtml(match[3]).replace(/^\$/, "");
    const descRaw = stripHtml(match[4]);
    if (idRaw.toLowerCase() === "id" || nameRaw.toLowerCase() === "name") continue;
    if (!idRaw || !/^\d+$/.test(idRaw)) continue;
    services.push({
      id: idRaw,
      name: sanitizeName(nameRaw) || `Service ${idRaw}`,
      price: priceRaw || undefined,
      description: descRaw || undefined,
    });
  }
  return services;
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function writeCache(services: any[]) {
  try {
    const sb = getSupabaseAdmin();

    // First, fetch existing markup_price and selling_price to preserve them
    const { data: existingRows } = await sb
      .from("ifree_services_cache")
      .select("id, markup_price, selling_price");

    const existingMap = new Map<string, { markup_price: number; selling_price: number }>();
    if (existingRows) {
      for (const row of existingRows) {
        existingMap.set(row.id, {
          markup_price: row.markup_price ?? 0,
          selling_price: row.selling_price ?? 0,
        });
      }
    }

    // Fetch USD rate for selling price calculation
    const { data: rateSetting } = await sb
      .from("system_settings")
      .select("value")
      .eq("key", "usd_mmk_rate")
      .single();
    const usdRate = rateSetting?.value?.rate ? Number(rateSetting.value.rate) : 4200;

    const rows = services.map((s) => {
      const existing = existingMap.get(String(s.id));
      const providerPriceUsd = s.price ? Number(s.price) : 0;
      const markupPriceUsd = existing?.markup_price ?? 0;

      // Selling price = (provider_price + markup_price) * usd_rate in MMK
      const sellingPriceMmk = markupPriceUsd > 0
        ? Math.ceil((providerPriceUsd + markupPriceUsd) * usdRate)
        : (existing?.selling_price ?? 0);

      return {
        id: String(s.id),
        name: s.name || "",
        price: s.price ?? null,
        description: s.description ?? null,
        cached_at: new Date().toISOString(),
        // Preserve existing markup — never overwrite
        markup_price: markupPriceUsd,
        // Recalculate selling price if markup is set
        selling_price: sellingPriceMmk,
      };
    });

    const { error } = await sb
      .from("ifree_services_cache")
      .upsert(rows, { onConflict: "id" });
    if (error) console.error("Cache write error:", error.message);
    else console.log(`Cached ${rows.length} services (markup preserved)`);
  } catch (e) {
    console.error("Cache write exception:", e.message);
  }
}

async function readCache(): Promise<any[] | null> {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("ifree_services_cache")
      .select("id, name, price, description, cached_at, selling_price, markup_price")
      .order("id");
    if (error || !data || data.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

async function fetchFromApi(API_KEY: string): Promise<any[] | null> {
  const attempts = [
    { key: API_KEY, accountinfo: "servicelist" },
    { key: API_KEY, services: "list" },
    { key: API_KEY, action: "services" },
    { key: API_KEY, servicelist: "1" },
  ];

  for (const params of attempts) {
    try {
      const body = new URLSearchParams(params);
      const response = await fetch("https://api.ifreeicloud.co.uk", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const text = await response.text();
      const paramKey = Object.keys(params).filter((k) => k !== "key").join(",");
      console.log(`iFree attempt (${paramKey}) len=${text.length}`);

      if (text.includes("<title>iFreeiCloud API | Dashboard</title>") && !text.includes('"response"')) continue;

      if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
        const parsed = JSON.parse(text);
        if (parsed.error || parsed.success === false) continue;

        if (parsed.response && typeof parsed.response === "string" && parsed.response.includes("<t")) {
          const htmlServices = parseHtmlServiceTable(parsed.response);
          if (htmlServices.length > 0) return htmlServices;
        }

        let services: any[] = [];
        if (Array.isArray(parsed)) services = parsed;
        else if (Array.isArray(parsed.services)) services = parsed.services;
        else if (Array.isArray(parsed.response)) services = parsed.response;

        if (services.length > 0) {
          return services.map((s: any) => ({
            id: String(s.id ?? s.service_id ?? s.ID ?? ""),
            name: s.name ?? s.service_name ?? s.Name ?? "",
            price: s.price ?? s.credit ?? s.Price ?? undefined,
            description: s.description ?? s.Description ?? undefined,
          }));
        }
      }

      if (text.includes("<table") && text.includes("<tr>")) {
        const htmlServices = parseHtmlServiceTable(text);
        if (htmlServices.length > 0) return htmlServices;
      }
    } catch (e) {
      console.error(`Attempt failed:`, e.message);
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get("IFREE_API_KEY");
    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const liveServices = await fetchFromApi(API_KEY);

    if (liveServices && liveServices.length > 0) {
      // Enrich live services with cached selling prices before returning
      const sb = getSupabaseAdmin();
      const { data: cachedRows } = await sb
        .from("ifree_services_cache")
        .select("id, selling_price, markup_price, is_enabled, custom_name");
      const cacheMap = new Map<string, any>();
      if (cachedRows) {
        for (const row of cachedRows) cacheMap.set(row.id, row);
      }

      const enriched = liveServices.map((s: any) => {
        const cached = cacheMap.get(String(s.id));
        return {
          ...s,
          selling_price: cached?.selling_price ?? 0,
          markup_price: cached?.markup_price ?? 0,
          is_enabled: cached?.is_enabled ?? true,
          custom_name: cached?.custom_name ?? null,
        };
      });

      // Write to cache in background (preserves markup)
      writeCache(liveServices);
      return new Response(
        JSON.stringify({ services: enriched, source: "api", total: enriched.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("API failed, trying cache...");
    const cached = await readCache();
    if (cached && cached.length > 0) {
      console.log(`Returning ${cached.length} cached services`);
      return new Response(
        JSON.stringify({ services: cached, source: "cache", total: cached.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        error: "Could not fetch services. API unavailable and no cached data.",
        services: [],
        source: "error",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
