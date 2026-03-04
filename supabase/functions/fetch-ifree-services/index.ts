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
      name: nameRaw || `Service ${idRaw}`,
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
    const rows = services.map((s) => ({
      id: String(s.id),
      name: s.name || "",
      price: s.price ?? null,
      description: s.description ?? null,
      cached_at: new Date().toISOString(),
    }));
    // Upsert all services; delete stale ones
    const { error } = await sb
      .from("ifree_services_cache")
      .upsert(rows, { onConflict: "id" });
    if (error) console.error("Cache write error:", error.message);
    else console.log(`Cached ${rows.length} services`);
  } catch (e) {
    console.error("Cache write exception:", e.message);
  }
}

async function readCache(): Promise<any[] | null> {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("ifree_services_cache")
      .select("id, name, price, description, cached_at")
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

        // HTML table inside JSON response field
        if (parsed.response && typeof parsed.response === "string" && parsed.response.includes("<t")) {
          const htmlServices = parseHtmlServiceTable(parsed.response);
          if (htmlServices.length > 0) return htmlServices;
        }

        // Standard JSON array
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

    // Try live API first
    const liveServices = await fetchFromApi(API_KEY);

    if (liveServices && liveServices.length > 0) {
      // Write to cache in background
      writeCache(liveServices);
      return new Response(
        JSON.stringify({ services: liveServices, source: "api", total: liveServices.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fallback to cached services
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
