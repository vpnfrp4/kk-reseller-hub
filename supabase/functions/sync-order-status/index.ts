import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FINAL_STATUSES = ["completed", "partial", "failed", "cancelled", "rejected"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Fetch all processing orders with an external_order_id
    const { data: orders, error: fetchErr } = await supabase
      .from("orders")
      .select("id, external_order_id, product_id, user_id, price, product_name")
      .eq("status", "processing")
      .not("external_order_id", "is", null);

    if (fetchErr) {
      console.error("Failed to fetch orders:", fetchErr.message);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ synced: 0, message: "No processing orders" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group orders by product to batch provider lookups
    const productIds = [...new Set(orders.map((o) => o.product_id).filter(Boolean))];

    // Fetch products with their provider info
    const { data: products } = await supabase
      .from("products")
      .select("id, provider_id")
      .in("id", productIds);

    const providerIds = [...new Set((products || []).map((p) => p.provider_id).filter(Boolean))];

    // Fetch providers
    const { data: providers } = await supabase
      .from("imei_providers")
      .select("id, api_url, api_key")
      .in("id", providerIds);

    // Build lookup maps
    const productMap = new Map((products || []).map((p) => [p.id, p]));
    const providerMap = new Map((providers || []).map((p) => [p.id, p]));

    const processed = new Set<string>();
    let synced = 0;
    let errors = 0;

    for (const order of orders) {
      // Skip duplicates in same cycle
      if (processed.has(order.id)) continue;
      processed.add(order.id);

      try {
        const product = productMap.get(order.product_id);
        if (!product?.provider_id) {
          console.warn(`Order ${order.id}: no provider_id on product`);
          continue;
        }

        const provider = providerMap.get(product.provider_id);
        if (!provider?.api_url || !provider?.api_key) {
          console.warn(`Order ${order.id}: provider missing api_url/api_key`);
          continue;
        }

        // Call provider status API with timeout
        const statusUrl = new URL(provider.api_url);
        statusUrl.searchParams.set("key", provider.api_key);
        statusUrl.searchParams.set("action", "status");
        statusUrl.searchParams.set("order", order.external_order_id);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const startTime = Date.now();

        let apiRes: Response;
        try {
          apiRes = await fetch(statusUrl.toString(), {
            method: "POST",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          });
        } catch (fetchError: any) {
          clearTimeout(timeout);
          const msg = fetchError.name === "AbortError" ? "Timeout (10s)" : fetchError.message;
          console.error(`Order ${order.id}: provider fetch failed - ${msg}`);

          // Log failed API call
          await supabase.from("api_logs").insert({
            order_id: order.id,
            user_id: order.user_id,
            provider_id: product.provider_id,
            action: "status",
            success: false,
            error_message: msg,
            duration_ms: Date.now() - startTime,
            log_type: "status_check",
          });

          errors++;
          continue;
        }
        clearTimeout(timeout);
        const duration = Date.now() - startTime;

        const rawText = await apiRes.text();
        let apiBody: any;
        try {
          apiBody = JSON.parse(rawText);
        } catch {
          apiBody = { raw: rawText };
        }

        // Normalize provider status
        const providerStatus = (apiBody?.status || "").toLowerCase().trim();
        const isFinal = ["completed", "partial", "canceled", "cancelled", "refunded", "failed", "error"].includes(providerStatus);

        // Log status check
        const logUrl = new URL(provider.api_url);
        logUrl.searchParams.set("action", "status");
        logUrl.searchParams.set("order", order.external_order_id);
        await supabase.from("api_logs").insert({
          order_id: order.id,
          user_id: order.user_id,
          provider_id: product.provider_id,
          action: "status",
          service_id: order.external_order_id,
          request_url: logUrl.toString(),
          response_status: apiRes.status,
          response_body: apiBody,
          success: !["failed", "error"].includes(providerStatus),
          error_message: ["failed", "error"].includes(providerStatus) ? (apiBody?.error || providerStatus) : null,
          duration_ms: duration,
          log_type: "status_check",
        });

        const updatePayload: Record<string, unknown> = {
          provider_response: apiBody,
        };

        if (providerStatus === "completed") {
          updatePayload.status = "completed";
          updatePayload.completed_at = new Date().toISOString();
          if (apiBody?.charge) updatePayload.admin_notes = `Provider charge: ${apiBody.charge}`;
        } else if (providerStatus === "partial") {
          updatePayload.status = "partial";
          updatePayload.completed_at = new Date().toISOString();
          if (apiBody?.remains != null) {
            updatePayload.admin_notes = `Partial delivery. Remains: ${apiBody.remains}`;
          }
          // Refund for partial: calculate remaining amount
          if (apiBody?.remains != null && apiBody?.charge != null) {
            // Provider reports charge, so no extra refund needed here
            // Admin can handle partial refunds manually
          }
        } else if (
          providerStatus === "canceled" ||
          providerStatus === "cancelled" ||
          providerStatus === "refunded" ||
          providerStatus === "failed" ||
          providerStatus === "error"
        ) {
          updatePayload.status = "failed";
          updatePayload.completed_at = new Date().toISOString();

          // Auto-refund if provider didn't charge
          const charge = parseFloat(apiBody?.charge || "0");
          if (charge === 0 || providerStatus === "refunded" || providerStatus === "canceled" || providerStatus === "cancelled") {
            // Full refund
            const { data: profile } = await supabase
              .from("profiles")
              .select("balance, total_spent, total_orders")
              .eq("user_id", order.user_id)
              .single();

            if (profile) {
              await supabase
                .from("profiles")
                .update({
                  balance: profile.balance + order.price,
                  total_spent: Math.max(0, profile.total_spent - order.price),
                  total_orders: Math.max(0, profile.total_orders - 1),
                })
                .eq("user_id", order.user_id);

              await supabase.from("wallet_transactions").insert({
                user_id: order.user_id,
                type: "refund",
                amount: order.price,
                status: "approved",
                description: `Auto-refund: ${order.product_name} (provider: ${providerStatus})`,
              });

              updatePayload.admin_notes = `Auto-refunded ${order.price} MMK. Provider status: ${providerStatus}`;

              // Log refund
              await supabase.from("api_logs").insert({
                order_id: order.id,
                user_id: order.user_id,
                provider_id: product.provider_id,
                action: "refund",
                success: true,
                log_type: "refund",
                response_body: { reason: providerStatus, amount: order.price },
              });
            }

            // Notify user
            await supabase.from("notifications").insert({
              user_id: order.user_id,
              title: "🔄 Order Refunded",
              body: `Your order for ${order.product_name} was ${providerStatus} by provider. ${order.price} MMK has been refunded.`,
              type: "order",
              link: "/orders",
            });
          } else {
            updatePayload.admin_notes = `Provider failed but charged ${charge}. Manual review needed.`;
          }
        } else if (providerStatus === "in progress" || providerStatus === "pending" || providerStatus === "processing") {
          // Still processing, just store latest response
          // Don't change status
        } else {
          // Unknown status, log and skip
          console.warn(`Order ${order.id}: unknown provider status "${providerStatus}"`);
          // Still store the response
        }

        // Update order
        await supabase.from("orders").update(updatePayload).eq("id", order.id);

        // Send notification for completed orders
        if (updatePayload.status === "completed") {
          await supabase.from("notifications").insert({
            user_id: order.user_id,
            title: "✅ Order Completed",
            body: `Your order for ${order.product_name} has been completed.`,
            type: "order",
            link: "/orders",
          });
        }

        synced++;
      } catch (orderErr: any) {
        console.error(`Order ${order.id}: unexpected error - ${orderErr.message}`);
        errors++;
      }
    }

    console.log(`Sync complete: ${synced} synced, ${errors} errors, ${orders.length} total`);

    return new Response(
      JSON.stringify({ synced, errors, total: orders.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Sync job fatal error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
