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
    const { product_id, quantity, fulfillment_mode, custom_fields, imei_number, link, service_id } = await req.json();

    if (!product_id) {
      return new Response(JSON.stringify({ success: false, error: "product_id is required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const qty = Math.max(1, Math.min(1000000, parseInt(quantity) || 1));
    const mode = fulfillment_mode || "instant";

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Merge API-specific fields into custom_fields
    const mergedCustomFields = { ...(custom_fields || {}) };
    if (link) mergedCustomFields.__link = link;
    if (service_id) mergedCustomFields.__service_id = service_id;

    const { data, error } = await serviceClient.rpc("process_purchase", {
      p_user_id: userId,
      p_product_id: product_id,
      p_quantity: qty,
      p_fulfillment_mode: mode,
      p_imei_number: imei_number || null,
      p_custom_fields: Object.keys(mergedCustomFields).length > 0 ? mergedCustomFields : null,
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

    // ═══ API FULFILLMENT: Call provider API for api-type products ═══
    if (data.product_type === "api" && service_id) {
      try {
        // Fetch product to get provider info
        const { data: product } = await serviceClient
          .from("products")
          .select("provider_id, api_service_id")
          .eq("id", product_id)
          .single();

        if (product?.provider_id) {
          // Fetch provider API details
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
            if (link) apiUrl.searchParams.set("link", link);

            const apiRes = await fetch(apiUrl.toString(), {
              method: "POST",
              headers: { "Accept": "application/json" },
            });

            const apiBody = await apiRes.json();

            if (apiBody?.order) {
              // Success: save external order ID and update status
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
              // API failed: auto-refund
              const errorMsg = apiBody?.error || "Provider API returned no order ID";
              console.error("API fulfillment failed:", errorMsg);

              // Refund balance
              await serviceClient.rpc("process_api_refund", {
                p_order_id: data.order_id,
                p_user_id: userId,
                p_amount: data.price,
                p_reason: `API Error: ${errorMsg}`,
              }).catch(async () => {
                // Fallback: manual refund if RPC doesn't exist
                await serviceClient
                  .from("profiles")
                  .update({ balance: serviceClient.rpc ? undefined : undefined })
                  .eq("user_id", userId);

                // Direct SQL refund
                const { data: profile } = await serviceClient
                  .from("profiles")
                  .select("balance, total_spent, total_orders")
                  .eq("user_id", userId)
                  .single();

                if (profile) {
                  await serviceClient
                    .from("profiles")
                    .update({
                      balance: profile.balance + data.price,
                      total_spent: Math.max(0, profile.total_spent - data.price),
                      total_orders: Math.max(0, profile.total_orders - 1),
                    })
                    .eq("user_id", userId);
                }

                // Update order to failed
                await serviceClient
                  .from("orders")
                  .update({
                    status: "failed",
                    admin_notes: `Auto-refunded. API Error: ${errorMsg}`,
                  })
                  .eq("id", data.order_id);

                // Refund wallet transaction
                await serviceClient
                  .from("wallet_transactions")
                  .insert({
                    user_id: userId,
                    type: "refund",
                    amount: data.price,
                    status: "approved",
                    description: `Auto-refund: ${data.product_name} (API failure)`,
                  });
              });

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
        console.error("API fulfillment error:", apiErr);
        // Auto-refund on any API error
        const { data: profile } = await serviceClient
          .from("profiles")
          .select("balance, total_spent, total_orders")
          .eq("user_id", userId)
          .single();

        if (profile) {
          await serviceClient
            .from("profiles")
            .update({
              balance: profile.balance + data.price,
              total_spent: Math.max(0, profile.total_spent - data.price),
              total_orders: Math.max(0, profile.total_orders - 1),
            })
            .eq("user_id", userId);
        }

        await serviceClient
          .from("orders")
          .update({
            status: "failed",
            admin_notes: `Auto-refunded. Error: ${apiErr instanceof Error ? apiErr.message : "Unknown"}`,
          })
          .eq("id", data.order_id);

        await serviceClient
          .from("wallet_transactions")
          .insert({
            user_id: userId,
            type: "refund",
            amount: data.price,
            status: "approved",
            description: `Auto-refund: ${data.product_name} (API error)`,
          });

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
