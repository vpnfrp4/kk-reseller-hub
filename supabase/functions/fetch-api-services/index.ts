import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Category auto-mapping ── */
const CATEGORY_MAP: [RegExp, string][] = [
  [/tiktok/i, "TikTok"],
  [/telegram/i, "Telegram"],
  [/facebook|fb\b/i, "Facebook"],
  [/youtube|yt\b/i, "YouTube"],
  [/instagram|ig\b/i, "Instagram"],
  [/twitter|𝕏/i, "Twitter / X"],
  [/traffic|web.*visit/i, "Website Traffic"],
];

function detectCategory(name: string, rawCat: string): string {
  const text = `${name} ${rawCat}`;
  for (const [re, cat] of CATEGORY_MAP) {
    if (re.test(text)) return cat;
  }
  return "Uncategorized API";
}

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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { provider_id } = await req.json();
    if (!provider_id) {
      return new Response(JSON.stringify({ error: "provider_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!provider.api_url || !provider.api_key) {
      return new Response(
        JSON.stringify({ success: false, message: "API URL or Key is empty" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fetch exchange rate & margin config in parallel ──
    const [rateRes, marginRes] = await Promise.all([
      supabase.from("system_settings").select("value").eq("key", "usd_mmk_rate").single(),
      supabase.from("system_settings").select("value").eq("key", "margin_config").single(),
    ]);

    const exchangeRate = rateRes.data ? (rateRes.data.value as any)?.rate : null;
    const globalMargin = marginRes.data ? (marginRes.data.value as any)?.global_margin ?? 20 : 20;
    const categoryMargins = marginRes.data ? (marginRes.data.value as any)?.category_margins ?? {} : {};

    if (!exchangeRate || exchangeRate <= 0) {
      return new Response(
        JSON.stringify({ success: false, message: "USD exchange rate not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Call provider API ──
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
    try { services = JSON.parse(text); } catch {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid JSON from provider", raw: text.substring(0, 500) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(services)) {
      return new Response(
        JSON.stringify({ success: false, message: "Expected array of services", raw: JSON.stringify(services).substring(0, 500) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fetch existing api_services & products for this provider (bulk) ──
    const [existingSvcRes, existingProdRes] = await Promise.all([
      supabase.from("api_services").select("id, provider_service_id").eq("provider_id", provider_id),
      supabase.from("products").select("id, api_service_id, provider_id")
        .eq("provider_id", provider_id)
        .eq("product_type", "api")
        .not("api_service_id", "is", null),
    ]);

    const existingSvcMap = new Map<number, string>();
    for (const s of existingSvcRes.data || []) existingSvcMap.set(s.provider_service_id, s.id);

    const existingProdMap = new Map<string, string>();
    for (const p of existingProdRes.data || []) {
      if (p.api_service_id) existingProdMap.set(p.api_service_id, p.id);
    }

    // Track which service IDs we see from provider (for soft-disable)
    const seenServiceIds = new Set<number>();

    let svcInserted = 0, svcUpdated = 0, svcErrors = 0;
    let prodCreated = 0, prodUpdated = 0, prodErrors = 0;

    // ── Prepare bulk upsert arrays ──
    const svcUpsertRows: any[] = [];
    const prodUpsertRows: any[] = [];
    const prodUpdateRows: { id: string; data: any }[] = [];

    for (const svc of services) {
      const serviceId = parseInt(svc.service);
      if (isNaN(serviceId)) { svcErrors++; continue; }
      seenServiceIds.add(serviceId);

      const svcName = String(svc.name || "").substring(0, 1000);
      const svcCategory = String(svc.category || "").substring(0, 500);
      const svcRate = parseFloat(svc.rate) || 0;
      const svcMin = parseInt(svc.min) || 0;
      const svcMax = parseInt(svc.max) || 0;
      const svcType = String(svc.type || "").substring(0, 50);
      const serviceIdStr = String(serviceId);

      // ── api_services upsert ──
      svcUpsertRows.push({
        provider_id,
        provider_service_id: serviceId,
        name: svcName,
        category: svcCategory,
        rate: svcRate,
        min: svcMin,
        max: svcMax,
        type: svcType,
        is_active: true,
      });

      // ── Auto product creation/update ──
      const mappedCategory = detectCategory(svcName, svcCategory);
      const margin = categoryMargins[mappedCategory] ?? globalMargin;
      const costPer1000 = Math.ceil(svcRate * exchangeRate);
      const sellPer1000 = Math.ceil(costPer1000 * (1 + margin / 100));

      if (existingProdMap.has(serviceIdStr)) {
        // Update existing product
        prodUpdateRows.push({
          id: existingProdMap.get(serviceIdStr)!,
          data: {
            api_rate: svcRate,
            api_min_quantity: svcMin,
            api_max_quantity: svcMax,
            category: mappedCategory,
            base_price: svcRate,
            base_currency: "USD",
            margin_percent: margin,
            wholesale_price: sellPer1000,
            retail_price: sellPer1000,
          },
        });
      } else {
        // Create new product
        prodUpsertRows.push({
          name: svcName,
          description: `${svcCategory} — ${svcType}`,
          category: mappedCategory,
          product_type: "api",
          type: "manual", // hidden from catalog until admin enables
          api_service_id: serviceIdStr,
          api_provider: provider.name,
          api_rate: svcRate,
          api_min_quantity: svcMin,
          api_max_quantity: svcMax,
          api_refill: false,
          provider_id,
          base_price: svcRate,
          base_currency: "USD",
          margin_percent: margin,
          wholesale_price: sellPer1000,
          retail_price: sellPer1000,
          stock: 0,
          sort_order: 0,
          duration: "—",
          icon: "🤖",
          fulfillment_modes: ["api"],
          processing_time: "⏳ 0–30 Minutes",
        });
      }
    }

    // ── Bulk upsert api_services ──
    if (svcUpsertRows.length > 0) {
      // Process in batches of 500
      for (let i = 0; i < svcUpsertRows.length; i += 500) {
        const batch = svcUpsertRows.slice(i, i + 500);
        const { error, count } = await supabase
          .from("api_services")
          .upsert(batch, { onConflict: "provider_id,provider_service_id", count: "exact" });
        if (error) {
          svcErrors += batch.length;
        } else {
          // Rough split: existing = updated, new = inserted
          const batchExisting = batch.filter(r => existingSvcMap.has(r.provider_service_id)).length;
          svcUpdated += batchExisting;
          svcInserted += batch.length - batchExisting;
        }
      }
    }

    // ── Bulk insert new products ──
    if (prodUpsertRows.length > 0) {
      for (let i = 0; i < prodUpsertRows.length; i += 200) {
        const batch = prodUpsertRows.slice(i, i + 200);
        const { error, data: inserted } = await supabase.from("products").insert(batch).select("id");
        if (error) {
          prodErrors += batch.length;
        } else {
          prodCreated += inserted?.length ?? batch.length;
        }
      }
    }

    // ── Bulk update existing products ──
    for (const row of prodUpdateRows) {
      const { error } = await supabase.from("products").update(row.data).eq("id", row.id);
      if (error) prodErrors++; else prodUpdated++;
    }

    // ── Soft-disable services removed from provider ──
    const allExistingIds = Array.from(existingSvcMap.keys());
    const removedIds = allExistingIds.filter(id => !seenServiceIds.has(id));
    if (removedIds.length > 0) {
      await supabase
        .from("api_services")
        .update({ is_active: false })
        .eq("provider_id", provider_id)
        .in("provider_service_id", removedIds);
    }

    // ── Log sync ──
    await supabase.from("api_logs").insert({
      action: "auto_sync_services",
      log_type: "sync",
      provider_id,
      user_id: user.id,
      success: true,
      request_body: { provider_name: provider.name, total_services: services.length },
      response_body: {
        svc_inserted: svcInserted, svc_updated: svcUpdated, svc_errors: svcErrors,
        prod_created: prodCreated, prod_updated: prodUpdated, prod_errors: prodErrors,
        soft_disabled: removedIds.length,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Full Auto Sync completed",
        total: services.length,
        services: { inserted: svcInserted, updated: svcUpdated, errors: svcErrors },
        products: { created: prodCreated, updated: prodUpdated, errors: prodErrors },
        soft_disabled: removedIds.length,
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
