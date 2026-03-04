import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function tryFetchServices(apiKey: string): Promise<{ data: any; success: boolean }> {
  // Try multiple known parameter combinations for the service list endpoint
  const attempts = [
    { key: apiKey, accountinfo: "servicelist" },
    { key: apiKey, action: "services" },
    { key: apiKey, servicelist: "1" },
    { key: apiKey, list: "services" },
  ];

  for (const params of attempts) {
    try {
      const formData = new FormData();
      for (const [k, v] of Object.entries(params)) {
        formData.append(k, v);
      }

      const response = await fetch("https://api.ifreeicloud.co.uk", {
        method: "POST",
        body: formData,
      });

      const text = await response.text();
      
      // Only accept JSON responses
      if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
        const data = JSON.parse(text);
        // Check if it looks like a service list (not just an error or balance)
        if (Array.isArray(data) || (data.success && data.response) || data.services) {
          return { data, success: true };
        }
      }
    } catch {
      // Continue to next attempt
    }
  }

  return { data: null, success: false };
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

    const result = await tryFetchServices(API_KEY);

    if (result.success) {
      return new Response(JSON.stringify(result.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no endpoint worked, return the hardcoded fallback list
    // These are the known instant services from the ifreeicloud panel
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
