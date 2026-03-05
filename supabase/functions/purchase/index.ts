import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── In-memory rate limiter (per isolate) ──
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 10;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  rateLimitMap.set(userId, recent);
  return false;
}

// ── Link sanitization ──
function sanitizeLink(raw: string | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim().slice(0, 2048);
  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

// ── Atomic refund helper ──
async function atomicRefund(serviceClient: any, userId: string, amount: number, orderId: string, productName: string, reason: string, providerId?: string, serviceId?: string) {
  await serviceClient.rpc("atomic_refund", {
    p_user_id: userId,
    p_amount: amount,
  });

  await serviceClient
    .from("orders")
    .update({
      status: "failed",
      admin_notes: `Auto-refunded. ${reason}`,
    })
    .eq("id", orderId);

  await serviceClient
    .from("wallet_transactions")
    .insert({
      user_id: userId,
      type: "refund",
      amount: amount,
      status: "approved",
      description: `Auto-refund: ${productName} (API failure)`,
    });

  await serviceClient.from("api_logs").insert({
    order_id: orderId,
    user_id: userId,
    provider_id: providerId || null,
    action: "refund",
    service_id: serviceId || null,
    success: true,
    log_type: "refund",
    response_body: { reason, amount },
  });
}

// ── Smart provider routing: try providers in priority order ──
interface ProviderMapping {
  provider_id: string;
  provider_service_id: string;
  provider_price: number;
  priority: number;
  api_url: string;
  api_key: string;
}

async function getProviderRoutes(serviceClient: any, productId: string, serviceId?: string): Promise<ProviderMapping[]> {
  // 1. Check service_provider_mappings for multi-provider routes
  const { data: mappings } = await serviceClient
    .from("service_provider_mappings")
    .select("provider_id, provider_service_id, provider_price, priority")
    .eq("product_id", productId)
    .eq("is_active", true)
    .order("priority", { ascending: true });

  if (mappings && mappings.length > 0) {
    // Fetch provider details for each mapping
    const providerIds = [...new Set(mappings.map((m: any) => m.provider_id))];
    const { data: providers } = await serviceClient
      .from("imei_providers")
      .select("id, api_url, api_key, status")
      .in("id", providerIds)
      .eq("status", "active");

    const providerMap = new Map((providers || []).map((p: any) => [p.id, p]));

    return mappings
      .filter((m: any) => providerMap.has(m.provider_id))
      .map((m: any) => {
        const p = providerMap.get(m.provider_id)!;
        return {
          provider_id: m.provider_id,
          provider_service_id: m.provider_service_id,
          provider_price: m.provider_price,
          priority: m.priority,
          api_url: p.api_url,
          api_key: p.api_key,
        };
      });
  }

  // 2. Fallback: use the product's directly linked provider
  const { data: product } = await serviceClient
    .from("products")
    .select("provider_id, api_service_id")
    .eq("id", productId)
    .single();

  if (product?.provider_id) {
    const { data: provider } = await serviceClient
      .from("imei_providers")
      .select("id, api_url, api_key, status")
      .eq("id", product.provider_id)
      .eq("status", "active")
      .single();

    if (provider?.api_url && provider?.api_key) {
      return [{
        provider_id: provider.id,
        provider_service_id: serviceId || product.api_service_id || "",
        provider_price: 0,
        priority: 0,
        api_url: provider.api_url,
        api_key: provider.api_key,
      }];
    }
  }

  return [];
}

async function callProviderApi(
  provider: ProviderMapping,
  serviceId: string,
  qty: number,
  link: string,
  serviceClient: any,
  orderId: string,
  userId: string,
): Promise<{ success: boolean; orderExternalId?: string; error?: string }> {
  const apiUrl = new URL(provider.api_url);
  apiUrl.searchParams.set("key", provider.api_key);
  apiUrl.searchParams.set("action", "add");
  apiUrl.searchParams.set("service", serviceId);
  apiUrl.searchParams.set("quantity", String(qty));
  if (link) apiUrl.searchParams.set("link", link);

  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const apiRes = await fetch(apiUrl.toString(), {
      method: "POST",
      headers: { "Accept": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const apiBody = await apiRes.json();
    const duration = Date.now() - startTime;

    // Log the API call (strip key from URL)
    const logUrl = new URL(provider.api_url);
    logUrl.searchParams.set("action", "add");
    logUrl.searchParams.set("service", serviceId);
    await serviceClient.from("api_logs").insert({
      order_id: orderId,
      user_id: userId,
      provider_id: provider.provider_id,
      action: "add",
      service_id: serviceId,
      request_url: logUrl.toString(),
      request_body: { service: serviceId, quantity: qty, link },
      response_status: apiRes.status,
      response_body: apiBody,
      success: !!apiBody?.order,
      error_message: apiBody?.order ? null : (apiBody?.error || "No order ID returned"),
      duration_ms: duration,
      log_type: "api_call",
    });

    if (apiBody?.order) {
      return { success: true, orderExternalId: String(apiBody.order) };
    }
    return { success: false, error: apiBody?.error || "No order ID returned" };
  } catch (e: any) {
    clearTimeout(timeout);
    const errorMsg = e.name === "AbortError" ? "Provider API timed out (30s)" : e.message;

    await serviceClient.from("api_logs").insert({
      order_id: orderId,
      user_id: userId,
      provider_id: provider.provider_id,
      action: "add",
      service_id: serviceId,
      request_url: provider.api_url,
      success: false,
      error_message: errorMsg,
      log_type: "api_call",
    });

    return { success: false, error: errorMsg };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    if (isRateLimited(userId)) {
      return new Response(JSON.stringify({ success: false, error: "Too many requests. Please wait a moment." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { product_id, quantity, fulfillment_mode, custom_fields, imei_number, link, service_id } = await req.json();

    if (!product_id) {
      return new Response(JSON.stringify({ success: false, error: "product_id is required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const qty = Math.max(1, Math.min(1000000, parseInt(quantity) || 1));
    const mode = fulfillment_mode || "instant";
    const sanitizedLink = sanitizeLink(link);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Validate quantity against product min/max for API products ──
    if (service_id) {
      const { data: productData } = await serviceClient
        .from("products")
        .select("api_min_quantity, api_max_quantity, product_type")
        .eq("id", product_id)
        .single();

      if (productData?.product_type === "api") {
        const minQty = productData.api_min_quantity || 1;
        const maxQty = productData.api_max_quantity || 1000000;
        if (qty < minQty) {
          return new Response(JSON.stringify({ success: false, error: `Minimum quantity is ${minQty}` }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (qty > maxQty) {
          return new Response(JSON.stringify({ success: false, error: `Maximum quantity is ${maxQty}` }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // ── Duplicate order prevention (5s window) ──
    if (service_id && sanitizedLink) {
      const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
      const { data: recentOrders } = await serviceClient
        .from("orders")
        .select("id")
        .eq("user_id", userId)
        .eq("product_id", product_id)
        .gte("created_at", fiveSecondsAgo)
        .limit(1);

      if (recentOrders && recentOrders.length > 0) {
        return new Response(JSON.stringify({ success: false, error: "Duplicate order detected. Please wait 5 seconds." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const mergedCustomFields = { ...(custom_fields || {}) };
    if (sanitizedLink) mergedCustomFields.__link = sanitizedLink;
    if (service_id) mergedCustomFields.__service_id = service_id;

    let serviceMargin: number | null = null;
    if (service_id) {
      const { data: svcData } = await serviceClient
        .from("api_services")
        .select("margin_percent")
        .eq("provider_service_id", parseInt(service_id))
        .maybeSingle();

      if (svcData?.margin_percent != null && svcData.margin_percent > 0) {
        serviceMargin = svcData.margin_percent;
      }
    }

    const { data: tierDiscount } = await serviceClient.rpc("get_user_tier_discount", {
      p_user_id: userId,
    });
    const discount = Number(tierDiscount) || 0;

    const { data, error } = await serviceClient.rpc("process_purchase", {
      p_user_id: userId,
      p_product_id: product_id,
      p_quantity: qty,
      p_fulfillment_mode: mode,
      p_imei_number: imei_number || null,
      p_custom_fields: Object.keys(mergedCustomFields).length > 0 ? mergedCustomFields : null,
      p_service_margin: serviceMargin,
    });

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!data?.success) {
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Apply tier discount ──
    if (discount > 0 && data.price > 0) {
      const discountAmount = Math.floor(data.price * (discount / 100));
      if (discountAmount > 0) {
        await serviceClient.rpc("atomic_balance_add", {
          p_user_id: userId,
          p_amount: discountAmount,
        });

        await serviceClient.from("wallet_transactions").insert({
          user_id: userId,
          type: "discount",
          amount: discountAmount,
          status: "approved",
          description: `Tier discount (${discount}%) on ${data.product_name}`,
        });

        await serviceClient
          .from("orders")
          .update({
            profit_amount: Math.max(0, (data.profit || 0) - discountAmount),
            admin_notes: `Tier discount applied: ${discount}% (-${discountAmount} MMK)`,
          })
          .eq("id", data.order_id);

        data.discount_percent = discount;
        data.discount_amount = discountAmount;
        data.final_price = data.price - discountAmount;
      }
    }

    // ═══ SMART API FULFILLMENT WITH MULTI-PROVIDER ROUTING ═══
    if (data.product_type === "api" && service_id) {
      try {
        const routes = await getProviderRoutes(serviceClient, product_id, service_id);

        if (routes.length === 0) {
          await atomicRefund(serviceClient, userId, data.price, data.order_id, data.product_name, "No active provider available");
          return new Response(JSON.stringify({
            ...data,
            success: false,
            error: "No active provider available for this service. Your balance has been refunded.",
            refunded: true,
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let lastError = "";
        for (const route of routes) {
          const effectiveServiceId = route.provider_service_id || service_id;
          const result = await callProviderApi(
            route, effectiveServiceId, qty, sanitizedLink,
            serviceClient, data.order_id, userId
          );

          if (result.success && result.orderExternalId) {
            // Success — update order with provider info
            await serviceClient
              .from("orders")
              .update({
                external_order_id: result.orderExternalId,
                status: "processing",
                credentials: `Provider Order: ${result.orderExternalId}`,
                admin_notes: routes.length > 1
                  ? `Routed to provider ${route.provider_id} (priority ${route.priority})`
                  : undefined,
              })
              .eq("id", data.order_id);

            // Send Telegram notifications
            await sendTelegramNotifications(serviceClient, userId, product_id, data);

            return new Response(JSON.stringify({
              ...data,
              external_order_id: result.orderExternalId,
              status: "processing",
            }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // Log fallback attempt
          lastError = result.error || "Unknown error";
          console.log(`Provider ${route.provider_id} failed: ${lastError}. Trying next...`);

          // Notify admin about fallback
          if (routes.length > 1) {
            await serviceClient.from("api_logs").insert({
              order_id: data.order_id,
              user_id: userId,
              provider_id: route.provider_id,
              action: "fallback",
              service_id: effectiveServiceId,
              success: false,
              error_message: `Fallback triggered: ${lastError}`,
              log_type: "routing",
            });
          }
        }

        // All providers failed — refund
        await atomicRefund(
          serviceClient, userId, data.price, data.order_id, data.product_name,
          `All providers failed. Last error: ${lastError}`,
          routes[routes.length - 1]?.provider_id, service_id
        );

        // Notify admin about total routing failure
        const adminIds = await serviceClient.from("user_roles").select("user_id").eq("role", "admin");
        for (const admin of (adminIds.data || [])) {
          await serviceClient.from("notifications").insert({
            user_id: admin.user_id,
            title: "Routing Failure",
            body: `All ${routes.length} provider(s) failed for ${data.product_name}. Order auto-refunded.`,
            type: "warning",
            link: `/admin/orders?order=${data.order_id}`,
          });
        }

        return new Response(JSON.stringify({
          ...data,
          success: false,
          error: `All providers failed: ${lastError}. Your balance has been refunded.`,
          refunded: true,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (apiErr) {
        await atomicRefund(serviceClient, userId, data.price, data.order_id, data.product_name, `Error: ${apiErr instanceof Error ? apiErr.message : "Unknown"}`);

        return new Response(JSON.stringify({
          ...data,
          success: false,
          error: "Provider API error. Your balance has been refunded.",
          refunded: true,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ═══ TELEGRAM NOTIFICATIONS (for non-API orders) ═══
    await sendTelegramNotifications(serviceClient, userId, product_id, data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Telegram notification helper ──
async function sendTelegramNotifications(serviceClient: any, userId: string, productId: string, data: any) {
  try {
    const { data: buyerProfile } = await serviceClient
      .from("profiles")
      .select("name, email")
      .eq("user_id", userId)
      .maybeSingle();

    // Resolve Telegram chat ID from telegram_connections first, then profiles
    let chatId: string | null = null;
    const { data: tgConn } = await serviceClient
      .from("telegram_connections")
      .select("telegram_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (tgConn?.telegram_id) {
      chatId = tgConn.telegram_id;
    } else {
      const { data: profileTg } = await serviceClient
        .from("profiles")
        .select("telegram_chat_id")
        .eq("user_id", userId)
        .maybeSingle();
      chatId = profileTg?.telegram_chat_id || null;
    }

    const { data: productInfo } = await serviceClient
      .from("products")
      .select("display_id")
      .eq("id", productId)
      .maybeSingle();

    const telegramUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-telegram`;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const tgHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${anonKey}`,
    };

    const { data: orderRow } = await serviceClient
      .from("orders")
      .select("order_code")
      .eq("id", data.order_id)
      .maybeSingle();

    // Admin notification
    await fetch(telegramUrl, {
      method: "POST",
      headers: tgHeaders,
      body: JSON.stringify({
        type: "order",
        order_id: data.order_id,
        order_code: orderRow?.order_code,
        product_name: `#${productInfo?.display_id || ''} ${data.product_name}`,
        price: data.price,
        user_email: buyerProfile?.email,
        user_name: buyerProfile?.name,
        product_type: data.product_type,
      }),
    });

    // User notification
    if (chatId) {
      await fetch(telegramUrl, {
        method: "POST",
        headers: tgHeaders,
        body: JSON.stringify({
          type: "order_placed",
          chat_id: chatId,
          order_code: orderRow?.order_code,
          product_name: data.product_name,
          price: data.price,
          product_type: data.product_type,
          status: data.product_type === "digital" ? "delivered" : "pending",
        }),
      });
    }
  } catch (tgErr) {
    console.error("Telegram notification failed:", tgErr);
  }
}
