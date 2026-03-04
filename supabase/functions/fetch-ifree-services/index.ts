import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Parse an HTML table response from iFreeiCloud into service objects.
 *  The API returns rows like: <tr><th>131</th><th>Activation Check</th><th>$0.02</th><th><small>description...</small></th></tr>
 *  Note: <th> tags can contain nested HTML like <small>, <b>, <span> etc.
 */
function parseHtmlServiceTable(html: string): any[] {
  const services: any[] = [];

  // More permissive regex: match <tr> containing 4 <th> cells, allowing any content inside cells
  const rowRegex = /<tr[^>]*>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<\/tr>/gi;
  let match;

  while ((match = rowRegex.exec(html)) !== null) {
    // Strip HTML tags from each cell
    const stripHtml = (s: string) => s.replace(/<[^>]+>/g, "").trim();
    
    const idRaw = stripHtml(match[1]);
    const nameRaw = stripHtml(match[2]);
    const priceRaw = stripHtml(match[3]).replace(/^\$/, "");
    const descRaw = stripHtml(match[4]);

    // Skip header row (ID, Name, Price, About)
    if (idRaw.toLowerCase() === "id" || nameRaw.toLowerCase() === "name") continue;
    
    // Validate ID is a number
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
    // Based on logs, `accountinfo=servicelist` works and returns JSON with HTML table
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
        const paramKey = Object.keys(params).filter(k => k !== 'key').join(',');
        console.log(`iFree attempt (${paramKey}) response length: ${text.length}, starts with: ${text.substring(0, 30)}`);

        // Skip if we got a dashboard HTML page (not an API response)
        if (text.includes("<title>iFreeiCloud API | Dashboard</title>") && !text.includes('"response"') && !text.includes('"success"')) {
          console.log("Got dashboard HTML page, skipping...");
          continue;
        }

        // Try JSON parse
        if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
          const parsed = JSON.parse(text);

          // Check for error response
          if (parsed.error || parsed.success === false) {
            console.log("Provider returned error:", parsed.error || parsed.message);
            continue;
          }

          // iFreeiCloud returns: { success: true, response: "<table>...</table>" }
          if (parsed.response && typeof parsed.response === "string" && parsed.response.includes("<t")) {
            console.log("Found HTML content in JSON response field, parsing HTML table...");
            const htmlServices = parseHtmlServiceTable(parsed.response);
            console.log(`Parsed ${htmlServices.length} services from HTML table`);
            
            if (htmlServices.length > 0) {
              return new Response(JSON.stringify({ 
                services: htmlServices, 
                source: "api",
                total: htmlServices.length,
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            } else {
              console.log("HTML table parse returned 0 services, trying raw HTML regex fallback...");
              // Fallback: try a simpler regex on the raw HTML
              const simpleServices: any[] = [];
              const simpleRegex = />(\d{1,4})<\/th>\s*<th[^>]*>([^<]+)</gi;
              let sm;
              const responseHtml = parsed.response;
              while ((sm = simpleRegex.exec(responseHtml)) !== null) {
                const sid = sm[1].trim();
                const sname = sm[2].trim();
                if (sid && sname && sname.toLowerCase() !== 'name') {
                  // Try to find price after this match
                  const priceMatch = responseHtml.substring(sm.index + sm[0].length).match(/<th[^>]*>\$?([\d.]+)/i);
                  simpleServices.push({
                    id: sid,
                    name: sname,
                    price: priceMatch ? priceMatch[1] : undefined,
                  });
                }
              }
              if (simpleServices.length > 0) {
                console.log(`Simple regex found ${simpleServices.length} services`);
                return new Response(JSON.stringify({ 
                  services: simpleServices, 
                  source: "api-simple-parse",
                  total: simpleServices.length,
                }), {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
              }
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
          } else if (typeof parsed === "object" && !parsed.error) {
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

            return new Response(JSON.stringify({ services: normalized, source: "api-json" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        // Maybe the response itself is an HTML table
        if (text.includes("<table") && text.includes("<tr>")) {
          const htmlServices = parseHtmlServiceTable(text);
          if (htmlServices.length > 0) {
            return new Response(JSON.stringify({ services: htmlServices, source: "html-direct" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch (e) {
        console.error(`Attempt failed (${Object.keys(params).filter(k => k !== 'key').join(',')})`, e.message);
        continue;
      }
    }

    // Fallback: return an error suggesting refresh
    console.log("All API attempts failed to parse services");
    return new Response(JSON.stringify({ 
      error: "Could not fetch live service list from provider. The API may be temporarily unavailable. Please try again in a few minutes.",
      services: [],
      source: "error",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
