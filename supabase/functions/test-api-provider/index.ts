import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { provider_id } = await req.json();
    if (!provider_id) {
      return new Response(JSON.stringify({ error: "provider_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: provider, error: fetchErr } = await supabase
      .from("api_providers")
      .select("*")
      .eq("id", provider_id)
      .single();

    if (fetchErr || !provider) {
      return new Response(JSON.stringify({ error: "Provider not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!provider.api_url || !provider.api_key) {
      return new Response(JSON.stringify({ success: false, message: "API URL or Key is empty" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Test connection by calling the provider's balance/profile endpoint
    const testUrl = `${provider.api_url}?key=${provider.api_key}&action=balance`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(testUrl, { signal: controller.signal });
      clearTimeout(timeout);
      const text = await res.text();
      
      let parsed: any;
      try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

      if (res.ok && (parsed.balance !== undefined || parsed.currency || parsed.status)) {
        return new Response(JSON.stringify({
          success: true,
          message: "Connection successful",
          balance: parsed.balance,
          currency: parsed.currency,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({
        success: false,
        message: parsed.error || `HTTP ${res.status}`,
        details: parsed,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (e: any) {
      clearTimeout(timeout);
      return new Response(JSON.stringify({
        success: false,
        message: e.name === "AbortError" ? "Connection timed out (10s)" : e.message,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
