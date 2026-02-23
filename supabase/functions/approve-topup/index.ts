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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminId = claimsData.claims.sub;

    // Verify admin role
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: isAdmin } = await serviceClient.rpc("has_role", {
      _user_id: adminId,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { transaction_id, action } = await req.json();

    if (!transaction_id || !["approve", "reject"].includes(action)) {
      return new Response(JSON.stringify({ error: "transaction_id and action (approve/reject) required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch transaction
    const { data: tx, error: txError } = await serviceClient
      .from("wallet_transactions")
      .select("*")
      .eq("id", transaction_id)
      .eq("status", "pending")
      .single();

    if (txError || !tx) {
      return new Response(JSON.stringify({ error: "Transaction not found or already processed" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      // Credit user balance
      const { error: profileError } = await serviceClient
        .from("profiles")
        .update({ balance: serviceClient.rpc ? undefined : undefined })
        .eq("user_id", tx.user_id);

      // Use raw SQL via RPC for atomic increment
      // Actually, let's do it step by step
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("balance")
        .eq("user_id", tx.user_id)
        .single();

      if (!profile) {
        return new Response(JSON.stringify({ error: "User profile not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await serviceClient
        .from("profiles")
        .update({ balance: profile.balance + tx.amount })
        .eq("user_id", tx.user_id);
    }

    // Update transaction status
    await serviceClient
      .from("wallet_transactions")
      .update({ status: action === "approve" ? "approved" : "rejected" })
      .eq("id", transaction_id);

    return new Response(
      JSON.stringify({ success: true, action, transaction_id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
