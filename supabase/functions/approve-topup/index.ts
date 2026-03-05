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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminId = user.id;

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

    // Fetch transaction — MUST be pending to proceed
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

    // ── Atomically update transaction status FIRST to prevent double-processing ──
    // Use a conditional update: only succeeds if status is still 'pending'
    const newStatus = action === "approve" ? "approved" : "rejected";
    const { data: updatedTx, error: statusError } = await serviceClient
      .from("wallet_transactions")
      .update({ status: newStatus })
      .eq("id", transaction_id)
      .eq("status", "pending") // Optimistic lock: only update if still pending
      .select("id")
      .single();

    if (statusError || !updatedTx) {
      // Another admin already processed this transaction
      return new Response(JSON.stringify({ error: "Transaction already processed by another admin" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      // ── ATOMIC balance credit — no read-then-write race condition ──
      const { error: updateError } = await serviceClient.rpc("atomic_balance_add", {
        p_user_id: tx.user_id,
        p_amount: tx.amount,
      });

      if (updateError) {
        // Rollback transaction status on failure
        await serviceClient
          .from("wallet_transactions")
          .update({ status: "pending" })
          .eq("id", transaction_id);

        return new Response(JSON.stringify({ error: "Failed to update balance: " + updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

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

    // Send Telegram notification to user
    try {
      // Check telegram_connections first, then profiles
      let chatId: string | null = null;
      const { data: tgConn } = await serviceClient
        .from("telegram_connections")
        .select("telegram_id")
        .eq("user_id", tx.user_id)
        .maybeSingle();

      if (tgConn?.telegram_id) {
        chatId = tgConn.telegram_id;
      } else {
        const { data: userProfile } = await serviceClient
          .from("profiles")
          .select("telegram_chat_id")
          .eq("user_id", tx.user_id)
          .maybeSingle();
        chatId = userProfile?.telegram_chat_id || null;
      }

      const { data: userProfile } = await serviceClient
        .from("profiles")
        .select("name, email, balance")
        .eq("user_id", tx.user_id)
        .maybeSingle();

      if (chatId && userProfile) {
        const newBalance = Number(userProfile.balance || 0);
        const tgMessage = action === "approve" ? [
          `${emoji} <b>Wallet Top-up Approved!</b>`,
          "━━━━━━━━━━━━━━━━━━",
          `💰 <b>Amount:</b> ${Number(tx.amount).toLocaleString()} MMK`,
          `💵 <b>New Balance:</b> ${newBalance.toLocaleString()} MMK`,
          `🏦 <b>Method:</b> ${tx.method || "N/A"}`,
          "━━━━━━━━━━━━━━━━━━",
          `🎉 Your funds are ready to use!`,
          `🔗 <a href="https://karkar4.store/dashboard/wallet">View Wallet</a>`,
        ].join("\n") : [
          `${emoji} <b>Top-Up Rejected</b>`,
          "━━━━━━━━━━━━━━━━━━",
          `💰 <b>Amount:</b> ${Number(tx.amount).toLocaleString()} MMK`,
          `🏦 <b>Method:</b> ${tx.method || "N/A"}`,
          "━━━━━━━━━━━━━━━━━━",
          `Please verify your payment details and try again.`,
          `🔗 <a href="https://karkar4.store/dashboard/wallet">View Wallet</a>`,
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
            chat_id: chatId,
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
