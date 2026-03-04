import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Parse an HTML table response from iFreeiCloud into service objects */
function parseHtmlServiceTable(html: string): any[] {
  const services: any[] = [];

  // Match each table row: <tr><th>ID</th><th>Name</th><th>Price</th><th>Description</th></tr>
  const rowRegex = /<tr>\s*<th>(\d+)<\/th>\s*<th>([^<]+)<\/th>\s*<th>([^<]*)<\/th>\s*<th>([\s\S]*?)<\/th>\s*<\/tr>/gi;
  let match;

  while ((match = rowRegex.exec(html)) !== null) {
    const id = match[1].trim();
    const name = match[2].trim();
    const priceRaw = match[3].trim().replace(/^\$/, "");
    // Strip HTML from description
    const description = match[4].replace(/<[^>]+>/g, "").trim();

    if (id && name) {
      services.push({
        id,
        name,
        price: priceRaw || undefined,
        description: description || undefined,
      });
    }
  }

  return services;
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try multiple parameter combinations to get the service list
    const attempts = [
      { key: API_KEY, services: "list" },
      { key: API_KEY, accountinfo: "servicelist" },
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
        console.log(`iFree attempt (${Object.keys(params).filter(k => k !== 'key').join(',')}) raw:`, text.substring(0, 300));

        // Skip if we got an HTML page (login/dashboard page, not API response)
        if (text.includes("<title>iFreeiCloud API | Dashboard</title>") && !text.includes('"response"')) {
          console.log("Got dashboard HTML page, skipping...");
          continue;
        }

        // Try JSON parse first
        if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
          const parsed = JSON.parse(text);

          // Check if the JSON response contains an HTML table in the "response" field
          if (parsed.response && typeof parsed.response === "string" && parsed.response.includes("<table")) {
            console.log("Found HTML table inside JSON response field, parsing...");
            const htmlServices = parseHtmlServiceTable(parsed.response);
            if (htmlServices.length > 0) {
              return new Response(JSON.stringify({ services: htmlServices, source: "api-html-table" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }

          // Standard JSON array/object response
          let services: any[] = [];
          if (Array.isArray(parsed)) {
            services = parsed;
          } else if (parsed.services && Array.isArray(parsed.services)) {
            services = parsed.services;
          } else if (parsed.response && Array.isArray(parsed.response)) {
            services = parsed.response;
          } else if (parsed.error) {
            console.log("Provider returned error:", parsed.error);
            continue;
          } else if (typeof parsed === "object") {
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

        // Maybe the response itself is an HTML table (not inside JSON)
        if (text.includes("<table") && text.includes("<tr>")) {
          const htmlServices = parseHtmlServiceTable(text);
          if (htmlServices.length > 0) {
            return new Response(JSON.stringify({ services: htmlServices, source: "html-table" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch (e) {
        console.error("Attempt failed:", e.message);
        continue;
      }
    }

    // Fallback: hardcoded list from known ifreeicloud services
    console.log("All API attempts failed, returning fallback service list");
    const fallbackServices = [
      { id: "131", name: "Activation Check", price: "0.02" },
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
