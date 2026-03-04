import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    from?: { id: number; first_name?: string; username?: string };
    text?: string;
  };
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendMessage(botToken: string, chatId: number | string, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  return res.json();
}

const STATUS_EMOJI: Record<string, string> = {
  delivered: "✅",
  completed: "✅",
  pending: "⏳",
  pending_review: "⏳",
  pending_creation: "⏳",
  processing: "🔄",
  api_pending: "🔄",
  rejected: "❌",
  cancelled: "🚫",
  failed: "💥",
};

const HELP_TEXT = [
  "🤖 <b>KKTech Reseller Hub — Telegram Bot</b>",
  "━━━━━━━━━━━━━━━━━━",
  "",
  "📋 <b>Available Commands:</b>",
  "",
  "/start — Link your account",
  "/balance — 💰 Check wallet balance (MMK & USD)",
  "/orders — 📦 View your last 5 orders",
  "/status [OrderCode] — 🔍 Check a specific order",
  "/help — ℹ️ Show this help message",
  "/unlink — 🔓 Disconnect Telegram from your account",
  "",
  "━━━━━━━━━━━━━━━━━━",
  "💡 <b>Tips:</b>",
  "• You'll receive automatic notifications for order updates",
  "• Top-up approvals and balance changes are sent instantly",
  "• Use /status with partial order codes too",
  "",
  "🌐 <b>Dashboard:</b> https://kk-reseller-hub.lovable.app",
].join("\n");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response("Bot token not configured", { status: 500 });
    }

    const update: TelegramUpdate = await req.json();
    const message = update.message;
    if (!message?.text) {
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── /start with linking token ──
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      if (parts.length > 1) {
        const token = parts[1].trim();

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id, user_id, name, email, telegram_chat_id")
          .eq("telegram_link_token", token)
          .maybeSingle();

        if (error || !profile) {
          await sendMessage(botToken, chatId, [
            "❌ <b>Invalid or expired link token.</b>",
            "",
            "Please generate a new link from your Settings page.",
          ].join("\n"));
          return new Response("OK");
        }

        // Link the chat ID and clear the token
        await supabase
          .from("profiles")
          .update({
            telegram_chat_id: String(chatId),
            telegram_link_token: null,
          } as any)
          .eq("user_id", profile.user_id);

        await sendMessage(botToken, chatId, [
          "✅ <b>Telegram Linked Successfully!</b>",
          "━━━━━━━━━━━━━━━━━━",
          `👤 <b>Account:</b> ${escapeHtml(profile.name || profile.email)}`,
          "",
          "You'll now receive real-time notifications for:",
          "• 📦 Order status updates",
          "• 💰 Wallet top-up approvals",
          "• ⚠️ Important account alerts",
          "",
          "📋 <b>Commands:</b>",
          "/balance — Check wallet balance",
          "/orders — View recent orders",
          "/status [ID] — Check order status",
          "/help — All available commands",
          "/unlink — Disconnect Telegram",
        ].join("\n"));
        return new Response("OK");
      }

      // Plain /start without token
      await sendMessage(botToken, chatId, [
        "🤖 <b>Welcome to KKTech Reseller Hub!</b>",
        "━━━━━━━━━━━━━━━━━━",
        "",
        "Your professional IMEI unlock & digital service platform.",
        "",
        "🔗 <b>To get started:</b>",
        "1. Go to your Dashboard → Settings",
        "2. Click \"Generate Connection Link\"",
        "3. Open the link to connect your account",
        "",
        "📋 <b>Commands (after linking):</b>",
        "/balance — Check wallet balance",
        "/orders — View recent orders",
        "/status [ID] — Check order status",
        "/help — Show all commands",
        "/unlink — Disconnect Telegram",
        "",
        "🌐 https://kk-reseller-hub.lovable.app",
      ].join("\n"));
      return new Response("OK");
    }

    // ── /help ──
    if (text === "/help") {
      await sendMessage(botToken, chatId, HELP_TEXT);
      return new Response("OK");
    }

    // ── Find linked user ──
    const { data: user } = await supabase
      .from("profiles")
      .select("user_id, name, email, balance")
      .eq("telegram_chat_id", String(chatId))
      .maybeSingle();

    if (!user) {
      await sendMessage(botToken, chatId, [
        "🔗 <b>Account Not Linked</b>",
        "",
        "Please link your Telegram from your Settings page first.",
        "",
        "📱 Visit: https://kk-reseller-hub.lovable.app/dashboard/settings",
        "",
        "Need help? Send /help for more info.",
      ].join("\n"));
      return new Response("OK");
    }

    // ── /balance ──
    if (text === "/balance") {
      const { data: rateSetting } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "usd_mmk_rate")
        .maybeSingle();

      const usdRate = rateSetting?.value?.rate || 0;
      const balanceMMK = Number(user.balance || 0);
      const balanceUSD = usdRate > 0 ? (balanceMMK / usdRate).toFixed(2) : "N/A";

      // Get recent transaction
      const { data: recentTx } = await supabase
        .from("wallet_transactions")
        .select("type, amount, status, created_at")
        .eq("user_id", user.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lines = [
        "💰 <b>Wallet Balance</b>",
        "━━━━━━━━━━━━━━━━━━",
        `💵 <b>MMK:</b> ${balanceMMK.toLocaleString()} MMK`,
        `💲 <b>USD:</b> $${balanceUSD}`,
        "━━━━━━━━━━━━━━━━━━",
        `👤 ${escapeHtml(user.name || user.email)}`,
      ];

      if (recentTx) {
        const txDate = new Date(recentTx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const txEmoji = recentTx.type === "topup" ? "📥" : "📤";
        lines.push("");
        lines.push(`${txEmoji} <b>Last Transaction:</b> ${recentTx.type.toUpperCase()} — ${Number(recentTx.amount).toLocaleString()} MMK (${txDate})`);
      }

      lines.push("");
      lines.push(`🔗 <a href="https://kk-reseller-hub.lovable.app/dashboard/wallet">Top Up Wallet</a>`);

      await sendMessage(botToken, chatId, lines.join("\n"));
      return new Response("OK");
    }

    // ── /orders ──
    if (text === "/orders") {
      const { data: orders } = await supabase
        .from("orders")
        .select("order_code, product_name, status, price, created_at, product_type")
        .eq("user_id", user.user_id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!orders || orders.length === 0) {
        await sendMessage(botToken, chatId, [
          "📦 <b>No Orders Yet</b>",
          "",
          "You haven't placed any orders.",
          "🔗 <a href=\"https://kk-reseller-hub.lovable.app/dashboard/place-order\">Place Your First Order</a>",
        ].join("\n"));
        return new Response("OK");
      }

      const lines = orders.map((o, i) => {
        const emoji = STATUS_EMOJI[o.status] || "📋";
        const date = new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const typeLabel = (o.product_type || "digital").toUpperCase();
        return `${i + 1}. ${emoji} <b>${escapeHtml(o.product_name)}</b>\n   💰 ${Number(o.price).toLocaleString()} MMK | ${typeLabel}\n   📊 ${o.status.toUpperCase()} | 📅 ${date}\n   🆔 <code>${o.order_code}</code>`;
      });

      await sendMessage(botToken, chatId, [
        "📦 <b>Your Recent Orders</b>",
        "━━━━━━━━━━━━━━━━━━",
        ...lines,
        "━━━━━━━━━━━━━━━━━━",
        "💡 Use /status [OrderCode] for full details",
        "🔗 <a href=\"https://kk-reseller-hub.lovable.app/dashboard/orders\">View All Orders</a>",
      ].join("\n"));
      return new Response("OK");
    }

    // ── /status [OrderID] ──
    if (text.startsWith("/status")) {
      const parts = text.split(" ");
      if (parts.length < 2) {
        await sendMessage(botToken, chatId, [
          "ℹ️ <b>Usage:</b> /status [OrderCode]",
          "",
          "Example: <code>/status ORD-2603-AB12-0001</code>",
          "",
          "💡 You can also use partial codes!",
        ].join("\n"));
        return new Response("OK");
      }

      const query = parts.slice(1).join(" ").trim().replace("#", "");

      let order: any = null;
      const { data: orderByCode } = await supabase
        .from("orders")
        .select("order_code, product_name, status, price, created_at, credentials, result, product_type, imei_number, fulfillment_mode, completed_at")
        .eq("user_id", user.user_id)
        .eq("order_code", query)
        .maybeSingle();

      if (orderByCode) {
        order = orderByCode;
      } else {
        const { data: orderByPartial } = await supabase
          .from("orders")
          .select("order_code, product_name, status, price, created_at, credentials, result, product_type, imei_number, fulfillment_mode, completed_at")
          .eq("user_id", user.user_id)
          .ilike("order_code", `%${query}%`)
          .limit(1)
          .maybeSingle();
        order = orderByPartial;
      }

      if (!order) {
        await sendMessage(botToken, chatId, `❌ No order found matching "<b>${escapeHtml(query)}</b>".\n\n💡 Try /orders to see your recent orders.`);
        return new Response("OK");
      }

      const emoji = STATUS_EMOJI[order.status] || "📋";
      const date = new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const typeLabel = (order.product_type || "digital").toUpperCase();

      // Estimate processing time based on fulfillment mode
      const etaMap: Record<string, string> = {
        instant: "⚡ Instant",
        manual: "⏳ 1–24 Hours",
        api: "⚡ 1–5 Minutes",
        imei: "⏳ 5–30 Minutes",
      };
      const eta = etaMap[order.fulfillment_mode] || "⏳ Varies";

      const lines = [
        `${emoji} <b>Order Details</b>`,
        "━━━━━━━━━━━━━━━━━━",
        `📦 <b>Service:</b> ${escapeHtml(order.product_name)}`,
        `🆔 <b>Order ID:</b> <code>${order.order_code}</code>`,
        `📋 <b>Type:</b> ${typeLabel}`,
        `📊 <b>Status:</b> ${order.status.toUpperCase()}`,
        `💰 <b>Price:</b> ${Number(order.price).toLocaleString()} MMK`,
        `📅 <b>Date:</b> ${date}`,
        `⏱ <b>Est. Time:</b> ${eta}`,
      ];

      if (order.imei_number) {
        lines.push(`📱 <b>IMEI:</b> <code>${order.imei_number}</code>`);
      }

      if (order.result) {
        lines.push("");
        lines.push(`📋 <b>Result:</b>`);
        lines.push(`<code>${escapeHtml(order.result.slice(0, 500))}</code>`);
      }

      if (order.completed_at) {
        const completedDate = new Date(order.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
        lines.push(`✅ <b>Completed:</b> ${completedDate}`);
      }

      lines.push("━━━━━━━━━━━━━━━━━━");
      lines.push(`🔗 <a href="https://kk-reseller-hub.lovable.app/dashboard/orders">View in Dashboard</a>`);

      await sendMessage(botToken, chatId, lines.join("\n"));
      return new Response("OK");
    }

    // ── /unlink ──
    if (text === "/unlink") {
      await supabase
        .from("profiles")
        .update({ telegram_chat_id: null } as any)
        .eq("user_id", user.user_id);

      await sendMessage(botToken, chatId, [
        "🔓 <b>Telegram Disconnected</b>",
        "━━━━━━━━━━━━━━━━━━",
        "Your Telegram has been unlinked from your KKTech account.",
        "",
        "❌ You won't receive order or wallet notifications anymore.",
        "",
        "To reconnect, visit your Settings page:",
        "🔗 https://kk-reseller-hub.lovable.app/dashboard/settings",
      ].join("\n"));
      return new Response("OK");
    }

    // ── Unknown command ──
    await sendMessage(botToken, chatId, [
      "🤖 I didn't recognize that command.",
      "",
      "Send /help to see all available commands.",
    ].join("\n"));

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("OK", { status: 200 });
  }
});
