import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify admin role
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub as string;

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { provider_id } = await req.json();
    if (!provider_id) {
      return new Response(JSON.stringify({ error: "provider_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch provider details using service role to access api_key
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check both imei_providers and api_providers tables
    let providerApiUrl: string | null = null;
    let providerApiKey: string | null = null;
    let providerName = "";

    const { data: imeiProv } = await adminClient
      .from("imei_providers")
      .select("api_url, api_key, name")
      .eq("id", provider_id)
      .single();

    if (imeiProv?.api_url && imeiProv?.api_key) {
      providerApiUrl = imeiProv.api_url;
      providerApiKey = imeiProv.api_key;
      providerName = imeiProv.name;
    } else {
      const { data: apiProv } = await adminClient
        .from("api_providers")
        .select("api_url, api_key, name")
        .eq("id", provider_id)
        .single();

      if (apiProv?.api_url && apiProv?.api_key) {
        providerApiUrl = apiProv.api_url;
        providerApiKey = apiProv.api_key;
        providerName = apiProv.name;
      }
    }

    if (!providerApiUrl || !providerApiKey) {
      return new Response(
        JSON.stringify({ error: "Provider not found or API URL/Key not configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call SMM Panel standard API to fetch services
    const apiUrl = new URL(providerApiUrl);
    apiUrl.searchParams.set("key", providerApiKey);
    apiUrl.searchParams.set("action", "services");

    const apiResponse = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    if (!apiResponse.ok) {
      const body = await apiResponse.text();
      return new Response(
        JSON.stringify({
          error: `API returned ${apiResponse.status}`,
          details: body.slice(0, 500),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const services = await apiResponse.json();

    // SMM panel API returns array of services with fields:
    // service, name, type, rate, min, max, category, refill, cancel, description
    // Normalize to a consistent format
    const normalized = Array.isArray(services)
      ? services.map((s: any) => ({
          service_id: String(s.service),
          name: s.name || "",
          category: s.category || "",
          rate: parseFloat(s.rate) || 0,
          min: parseInt(s.min) || 1,
          max: parseInt(s.max) || 1,
          type: s.type || "",
          refill: s.refill === true || s.refill === "true",
          cancel: s.cancel === true || s.cancel === "true",
          description: s.description || s.desc || "",
        }))
      : [];

    return new Response(
      JSON.stringify({ success: true, services: normalized, provider_name: providerName }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("fetch-provider-services error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
