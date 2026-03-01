import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth check
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
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

    // Fetch provider details
    const { data: provider, error: provErr } = await supabase
      .from("api_providers")
      .select("*")
      .eq("id", provider_id)
      .single();

    if (provErr || !provider) {
      return new Response(JSON.stringify({ error: "Provider not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!provider.api_url || !provider.api_key) {
      return new Response(
        JSON.stringify({ success: false, message: "API URL or Key is empty" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call provider API with x-www-form-urlencoded body
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const body = new URLSearchParams();
    body.set("key", provider.api_key);
    body.set("action", "services");

    const res = await fetch(provider.api_url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await res.text();
    let services: any[];
    try {
      services = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid JSON response from provider", raw: text.substring(0, 500) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(services)) {
      return new Response(
        JSON.stringify({ success: false, message: "Expected array of services from provider", raw: JSON.stringify(services).substring(0, 500) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert services
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const svc of services) {
      const serviceId = parseInt(svc.service);
      if (isNaN(serviceId)) { errors++; continue; }

      const row = {
        provider_id,
        provider_service_id: serviceId,
        name: String(svc.name || "").substring(0, 1000),
        category: String(svc.category || "").substring(0, 500),
        rate: parseFloat(svc.rate) || 0,
        min: parseInt(svc.min) || 0,
        max: parseInt(svc.max) || 0,
        type: String(svc.type || "").substring(0, 50),
        is_active: true,
      };

      // Check if exists
      const { data: existing } = await supabase
        .from("api_services")
        .select("id")
        .eq("provider_id", provider_id)
        .eq("provider_service_id", serviceId)
        .maybeSingle();

      if (existing) {
        const { error: upErr } = await supabase
          .from("api_services")
          .update({
            name: row.name,
            category: row.category,
            rate: row.rate,
            min: row.min,
            max: row.max,
            type: row.type,
          })
          .eq("id", existing.id);
        if (upErr) { errors++; } else { updated++; }
      } else {
        const { error: insErr } = await supabase
          .from("api_services")
          .insert(row);
        if (insErr) { errors++; } else { inserted++; }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Services synced successfully",
        total: services.length,
        inserted,
        updated,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    const message = err.name === "AbortError" ? "Connection timed out (30s)" : err.message;
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
