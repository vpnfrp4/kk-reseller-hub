import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get("IFREE_API_KEY");
    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The ifreeicloud API service list endpoint
    // Documented at https://api.ifreeicloud.co.uk/services/1000
    const body = new URLSearchParams({
      key: API_KEY,
      services: "list",
    });

    const response = await fetch("https://api.ifreeicloud.co.uk", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const text = await response.text();
    console.log("iFree services raw response:", text.substring(0, 500));

    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Not JSON, try alternative endpoints
    }

    // If first attempt returned valid service data, use it
    if (parsed && !parsed.error) {
      // Handle various response shapes
      let services: any[] = [];

      if (Array.isArray(parsed)) {
        services = parsed;
      } else if (parsed.services && Array.isArray(parsed.services)) {
        services = parsed.services;
      } else if (parsed.response && Array.isArray(parsed.response)) {
        services = parsed.response;
      } else if (typeof parsed === "object" && !parsed.error) {
        // Could be an object keyed by service ID
        const values = Object.values(parsed);
        if (values.length > 0 && typeof values[0] === "object") {
          services = values as any[];
        }
      }

      if (services.length > 0) {
        const normalized = services.map((s: any) => ({
          id: String(s.id ?? s.service_id ?? s.ID ?? ""),
          name: s.name ?? s.service_name ?? s.Name ?? "",
          price: s.price ?? s.credit ?? s.Price ?? undefined,
          time: s.time ?? s.processing_time ?? s.Time ?? undefined,
          description: s.description ?? s.Description ?? undefined,
        }));

        return new Response(JSON.stringify({ services: normalized, source: "api" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Try alternative parameter combinations
    const altAttempts = [
      { key: API_KEY, accountinfo: "servicelist" },
      { key: API_KEY, action: "services" },
      { key: API_KEY, servicelist: "1" },
    ];

    for (const params of altAttempts) {
      try {
        const altBody = new URLSearchParams(params);
        const altResponse = await fetch("https://api.ifreeicloud.co.uk", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: altBody,
        });

        const altText = await altResponse.text();
        console.log("iFree alt attempt raw:", altText.substring(0, 300));

        if (altText.trim().startsWith("{") || altText.trim().startsWith("[")) {
          const altData = JSON.parse(altText);
          let altServices: any[] = [];

          if (Array.isArray(altData)) {
            altServices = altData;
          } else if (altData.services && Array.isArray(altData.services)) {
            altServices = altData.services;
          } else if (altData.response && Array.isArray(altData.response)) {
            altServices = altData.response;
          }

          if (altServices.length > 0) {
            const normalized = altServices.map((s: any) => ({
              id: String(s.id ?? s.service_id ?? ""),
              name: s.name ?? s.service_name ?? "",
              price: s.price ?? s.credit ?? undefined,
              time: s.time ?? s.processing_time ?? undefined,
              description: s.description ?? undefined,
            }));

            return new Response(JSON.stringify({ services: normalized, source: "api-alt" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch {
        continue;
      }
    }

    // Fallback: return hardcoded list from the ifreeicloud panel
    const fallbackServices = [
      { id: "0", name: "Apple - Model + Colour Check (IMEI)", price: "Free" },
      { id: "1", name: "iPhone - Carrier / SIM Lock Check", price: "0.06" },
      { id: "2", name: "iPhone - iCloud Status Check (FMI ON/OFF)", price: "0.10" },
      { id: "3", name: "iPhone - Full IMEI Info (Carrier + iCloud + Model)", price: "0.15" },
      { id: "4", name: "iPhone - FMI ON/OFF Check", price: "0.05" },
      { id: "5", name: "iPad - iCloud Status Check", price: "0.10" },
      { id: "6", name: "Apple Watch - iCloud Check", price: "0.10" },
      { id: "7", name: "MacBook - iCloud Check", price: "0.10" },
      { id: "8", name: "Samsung - Knox / FRP Status Check", price: "0.20" },
      { id: "9", name: "Samsung - Warranty / Info Check", price: "0.15" },
      { id: "10", name: "IMEI Blacklist Check (All Brands)", price: "0.10" },
    ];

    return new Response(JSON.stringify({ services: fallbackServices, source: "fallback" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
