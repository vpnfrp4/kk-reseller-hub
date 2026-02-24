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
    const { product_id, quantity, fulfillment_mode, custom_fields } = await req.json();

    if (!product_id) {
      return new Response(JSON.stringify({ success: false, error: "product_id is required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const qty = Math.max(1, Math.min(100, parseInt(quantity) || 1));
    const mode = fulfillment_mode || "instant";

    // Call the atomic purchase function using service role for SECURITY DEFINER
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await serviceClient.rpc("process_purchase", {
      p_user_id: userId,
      p_product_id: product_id,
      p_quantity: qty,
    });

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = data as Record<string, unknown>;

    // If purchase succeeded, update the order with fulfillment metadata
    if (result.success && result.order_id) {
      // Determine order status based on fulfillment mode
      let orderStatus = "delivered";
      if (mode === "custom_username" || mode === "imei") {
        orderStatus = "pending_creation";
      } else if (mode === "manual") {
        orderStatus = "pending_review";
      }

      // For non-instant modes, don't auto-deduct stock (revert stock deduction)
      if (mode === "manual") {
        // Revert the stock deduction done by process_purchase
        await serviceClient
          .from("products")
          .update({ stock: undefined } as any)
          .eq("id", product_id);
        // Actually, better to just update using raw increment
        const { data: prod } = await serviceClient
          .from("products")
          .select("stock")
          .eq("id", product_id)
          .single();
        if (prod) {
          await serviceClient
            .from("products")
            .update({ stock: prod.stock + qty } as any)
            .eq("id", product_id);
        }
      }

      // Update order with fulfillment metadata and correct status
      await serviceClient
        .from("orders")
        .update({
          fulfillment_mode: mode,
          custom_fields_data: custom_fields || null,
          status: orderStatus,
        } as any)
        .eq("id", result.order_id);
    }

    return new Response(JSON.stringify(result), {
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
