import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_STATUSES = [
  "pending",
  "pending_review",
  "pending_creation",
  "processing",
  "completed",
  "delivered",
  "rejected",
  "cancelled",
  "api_pending",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user identity via getClaims
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await userClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // Check admin role
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, error: "Only admin users can update order status" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { order_id, status, credentials, result, admin_notes } = body;

    // Validate order_id
    if (!order_id || typeof order_id !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Missing or invalid order_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate status
    if (!status || !VALID_STATUSES.includes(status)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid status. Accepted: ${VALID_STATUSES.join(", ")}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify order exists
    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .select("id, user_id, product_name, product_type, status")
      .eq("id", order_id)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ success: false, error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = { status };
    if (credentials !== undefined && credentials !== null) {
      updatePayload.credentials = credentials;
    }
    if (result !== undefined && result !== null) {
      updatePayload.result = result;
    }
    if (admin_notes !== undefined && admin_notes !== null) {
      updatePayload.admin_notes = admin_notes;
    }
    if (status === "completed" || status === "delivered") {
      updatePayload.completed_at = new Date().toISOString();
    }

    // Perform update
    const { error: updateError } = await serviceClient
      .from("orders")
      .update(updatePayload)
      .eq("id", order_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send notification to reseller for terminal statuses
    const isTerminal = ["completed", "delivered", "rejected", "cancelled"].includes(status);
    if (isTerminal) {
      const isImei = order.product_type === "imei";
      let notifTitle = "";
      let notifBody = "";

      if (status === "completed" || status === "delivered") {
        notifTitle = isImei ? "✅ IMEI Order Completed" : "✅ Order Delivered";
        notifBody = `Your order for ${order.product_name} has been fulfilled. Check your order for credentials.`;
      } else if (status === "rejected") {
        notifTitle = "❌ Order Rejected";
        notifBody = `Your order for ${order.product_name} has been rejected. Please contact support.`;
      } else if (status === "cancelled") {
        notifTitle = "🚫 Order Cancelled";
        notifBody = `Your order for ${order.product_name} has been cancelled.`;
      }

      if (notifTitle) {
        await serviceClient.from("notifications").insert({
          user_id: order.user_id,
          title: notifTitle,
          body: notifBody,
          type: "order",
          link: "/orders",
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
