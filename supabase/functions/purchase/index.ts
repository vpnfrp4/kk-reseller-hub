import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── In-memory rate limiter (per isolate) ──
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 purchases per minute per user

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
  // Use atomic DB function — no read-then-write race condition
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

  // Log refund
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

    // ── Rate limiting ──
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

    // ── Duplicate order prevention (5s window, same product + link) ──
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

    // Merge API-specific fields into custom_fields
    const mergedCustomFields = { ...(custom_fields || {}) };
    if (sanitizedLink) mergedCustomFields.__link = sanitizedLink;
    if (service_id) mergedCustomFields.__service_id = service_id;

    // For API products with a service_id, fetch service-level margin to override product margin
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

    // ── Fetch reseller tier discount and apply ──
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

    // ── Apply tier discount: refund the discount amount back to user ──
    if (discount > 0 && data.price > 0) {
      const discountAmount = Math.floor(data.price * (discount / 100));
      if (discountAmount > 0) {
        await serviceClient.rpc("atomic_balance_add", {
          p_user_id: userId,
          p_amount: discountAmount,
        });

        // Log discount as a wallet transaction
        await serviceClient.from("wallet_transactions").insert({
          user_id: userId,
          type: "discount",
          amount: discountAmount,
          status: "approved",
          description: `Tier discount (${discount}%) on ${data.product_name}`,
        });

        // Update order profit to reflect discount
        await serviceClient
          .from("orders")
          .update({
            profit_amount: Math.max(0, (data.profit || 0) - discountAmount),
            admin_notes: `Tier discount applied: ${discount}% (-${discountAmount} MMK)`,
          })
          .eq("id", data.order_id);

        // Include discount info in response
        data.discount_percent = discount;
        data.discount_amount = discountAmount;
        data.final_price = data.price - discountAmount;
      }
    }

    // ═══ API FULFILLMENT: Call provider API for api-type products ═══
    if (data.product_type === "api" && service_id) {
      try {
        const { data: product } = await serviceClient
          .from("products")
          .select("provider_id, api_service_id")
          .eq("id", product_id)
          .single();

        if (product?.provider_id) {
          const { data: provider } = await serviceClient
            .from("imei_providers")
            .select("api_url, api_key")
            .eq("id", product.provider_id)
            .single();

          if (provider?.api_url && provider?.api_key) {
            const apiUrl = new URL(provider.api_url);
            apiUrl.searchParams.set("key", provider.api_key);
            apiUrl.searchParams.set("action", "add");
            apiUrl.searchParams.set("service", service_id);
            apiUrl.searchParams.set("quantity", String(qty));
            if (sanitizedLink) apiUrl.searchParams.set("link", sanitizedLink);

            const startTime = Date.now();
            const apiRes = await fetch(apiUrl.toString(), {
              method: "POST",
              headers: { "Accept": "application/json" },
            });

            const apiBody = await apiRes.json();
            const duration = Date.now() - startTime;

            // Log the API call
            const logUrl = new URL(provider.api_url);
            logUrl.searchParams.set("action", "add");
            logUrl.searchParams.set("service", service_id);
            await serviceClient.from("api_logs").insert({
              order_id: data.order_id,
              user_id: userId,
              provider_id: product.provider_id,
              action: "add",
              service_id,
              request_url: logUrl.toString(),
              request_body: { service: service_id, quantity: qty, link: sanitizedLink },
              response_status: apiRes.status,
              response_body: apiBody,
              success: !!apiBody?.order,
              error_message: apiBody?.order ? null : (apiBody?.error || "No order ID returned"),
              duration_ms: duration,
              log_type: "api_call",
            });

            if (apiBody?.order) {
              await serviceClient
                .from("orders")
                .update({
                  external_order_id: String(apiBody.order),
                  status: "processing",
                  credentials: `Provider Order: ${apiBody.order}`,
                })
                .eq("id", data.order_id);

              return new Response(JSON.stringify({
                ...data,
                external_order_id: apiBody.order,
                status: "processing",
              }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            } else {
              // API failed: atomic refund
              const errorMsg = apiBody?.error || "Provider API returned no order ID";
              await atomicRefund(serviceClient, userId, data.price, data.order_id, data.product_name, `API Error: ${errorMsg}`, product.provider_id, service_id);

              return new Response(JSON.stringify({
                ...data,
                success: false,
                error: `Provider API failed: ${errorMsg}. Your balance has been refunded.`,
                refunded: true,
              }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
        }
      } catch (apiErr) {
        // Atomic refund on any API error
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

    // ═══ TELEGRAM NOTIFICATIONS ═══
    try {
      const { data: buyerProfile } = await serviceClient
        .from("profiles")
        .select("name, email, telegram_chat_id")
        .eq("user_id", userId)
        .maybeSingle();

      const { data: productInfo } = await serviceClient
        .from("products")
        .select("display_id")
        .eq("id", product_id)
        .maybeSingle();

      const telegramUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-telegram`;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const tgHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${anonKey}`,
      };

      // Fetch the order_code for the notification
      const { data: orderRow } = await serviceClient
        .from("orders")
        .select("order_code")
        .eq("id", data.order_id)
        .maybeSingle();

      // 1. Admin notification
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

      // 2. User notification (order placed) — only if user has Telegram linked
      if (buyerProfile?.telegram_chat_id) {
        await fetch(telegramUrl, {
          method: "POST",
          headers: tgHeaders,
          body: JSON.stringify({
            type: "order_placed",
            chat_id: buyerProfile.telegram_chat_id,
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
