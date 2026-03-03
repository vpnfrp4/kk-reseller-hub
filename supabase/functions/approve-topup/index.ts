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

    // Create a client with the user's token to get their identity
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminId = user.id;

    // Verify admin role using service client
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
      // Get current balance
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

      // Credit user balance
      const { error: updateError } = await serviceClient
        .from("profiles")
        .update({ balance: profile.balance + tx.amount })
        .eq("user_id", tx.user_id);

      if (updateError) {
        return new Response(JSON.stringify({ error: "Failed to update balance" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update transaction status
    const newStatus = action === "approve" ? "approved" : "rejected";
    await serviceClient
      .from("wallet_transactions")
      .update({ status: newStatus })
      .eq("id", transaction_id);

    // Send notification to user
    const notifTitle = action === "approve"
      ? "Top-Up Approved! 🎉"
      : "Top-Up Request Rejected";
    const notifBody = action === "approve"
      ? `${Number(tx.amount).toLocaleString()} MMK has been credited to your wallet.`
      : `Your top-up request for ${Number(tx.amount).toLocaleString()} MMK was not approved. Please verify your payment details.`;

    await serviceClient.from("notifications").insert({
      user_id: tx.user_id,
      title: notifTitle,
      body: notifBody,
      type: action === "approve" ? "success" : "warning",
    });

    // Send Telegram notification to user if they have telegram_chat_id
    try {
      const { data: userProfile } = await serviceClient
        .from("profiles")
        .select("telegram_chat_id, name, email")
        .eq("user_id", tx.user_id)
        .maybeSingle();

      if (userProfile?.telegram_chat_id) {
        const emoji = action === "approve" ? "✅" : "❌";
        const tgMessage = [
          `${emoji} <b>Top-Up ${action === "approve" ? "Approved" : "Rejected"}!</b>`,
          "━━━━━━━━━━━━━━━━━━",
          `💰 <b>Amount:</b> ${Number(tx.amount).toLocaleString()} MMK`,
          `🏦 <b>Method:</b> ${tx.method || "N/A"}`,
          `📊 <b>Status:</b> ${newStatus.toUpperCase()}`,
          "━━━━━━━━━━━━━━━━━━",
          `🔗 <a href="https://kk-reseller-hub.lovable.app/dashboard/wallet">View Wallet</a>`,
        ].join("\n");

        const telegramUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-telegram`;
        await fetch(telegramUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            type: "custom",
            chat_id: userProfile.telegram_chat_id,
            message: tgMessage,
          }),
        });
      }
    } catch (tgErr) {
      console.error("Telegram user notification failed:", tgErr);
    }

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
