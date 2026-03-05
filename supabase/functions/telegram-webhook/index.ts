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
  "/products [category] — 🛒 Browse available services",
  "/status [OrderCode] — 🔍 Check a specific order",
  "/cancel [OrderCode] — 🚫 Request cancellation of a pending order",
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

// ── Helper: find linked user via telegram_connections table ──
async function findLinkedUser(supabase: any, telegramId: string) {
  const { data: conn } = await supabase
    .from("telegram_connections")
    .select("user_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (!conn) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, name, email, balance")
    .eq("user_id", conn.user_id)
    .maybeSingle();

  return profile;
}

// ── Handler: /start with user_id deep link ──
async function handleStart(supabase: any, botToken: string, chatId: number, text: string, fromUser?: { id: number; username?: string }) {
  const parts = text.split(" ");

  if (parts.length > 1) {
    const userId = parts[1].trim();

    // Check if this user_id exists in profiles
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("user_id, name, email")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !profile) {
      await sendMessage(botToken, chatId, [
        "❌ <b>Invalid or expired link.</b>",
        "",
        "Please generate a new connection link from your Settings page.",
      ].join("\n"));
      return;
    }

    // Check if already linked to a different telegram
    const telegramId = String(fromUser?.id || chatId);
    const { data: existing } = await supabase
      .from("telegram_connections")
      .select("id")
      .eq("user_id", profile.user_id)
      .maybeSingle();

    if (existing) {
      // Update existing connection
      await supabase
        .from("telegram_connections")
        .update({
          telegram_id: telegramId,
          telegram_username: fromUser?.username || null,
        })
        .eq("user_id", profile.user_id);
    } else {
      // Insert new connection
      await supabase
        .from("telegram_connections")
        .insert({
          user_id: profile.user_id,
          telegram_id: telegramId,
          telegram_username: fromUser?.username || null,
        });
    }

    // Also update profiles for backward compatibility
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
    return;
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
    "2. Click \"Connect Telegram\"",
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
}

// ── Handler: /balance ──
async function handleBalance(supabase: any, botToken: string, chatId: number, user: any) {
  const { data: rateSetting } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "usd_mmk_rate")
    .maybeSingle();

  const usdRate = rateSetting?.value?.rate || 0;
  const balanceMMK = Number(user.balance || 0);
  const balanceUSD = usdRate > 0 ? (balanceMMK / usdRate).toFixed(2) : "N/A";

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
}

// ── Handler: /orders ──
async function handleOrders(supabase: any, botToken: string, chatId: number, user: any) {
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
      `🔗 <a href="https://kk-reseller-hub.lovable.app/dashboard/place-order">Place Your First Order</a>`,
    ].join("\n"));
    return;
  }

  const lines = orders.map((o: any, i: number) => {
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
    `🔗 <a href="https://kk-reseller-hub.lovable.app/dashboard/orders">View All Orders</a>`,
  ].join("\n"));
}

// ── Handler: /status ──
async function handleStatus(supabase: any, botToken: string, chatId: number, text: string, user: any) {
  const parts = text.split(" ");
  if (parts.length < 2) {
    await sendMessage(botToken, chatId, [
      "ℹ️ <b>Usage:</b> /status [OrderCode]",
      "",
      "Example: <code>/status ORD-2603-AB12-0001</code>",
      "",
      "💡 You can also use partial codes!",
    ].join("\n"));
    return;
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
    return;
  }

  const emoji = STATUS_EMOJI[order.status] || "📋";
  const date = new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const typeLabel = (order.product_type || "digital").toUpperCase();

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
}

// ── Handler: /products ──
async function handleProducts(supabase: any, botToken: string, chatId: number, text: string) {
  const parts = text.split(" ");
  const categoryFilter = parts.length > 1 ? parts.slice(1).join(" ").trim().toLowerCase() : null;

  let query = supabase
    .from("products")
    .select("display_id, name, category, wholesale_price, product_type, processing_time, stock")
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true })
    .limit(50);

  const { data: products, error } = await query;

  if (error || !products || products.length === 0) {
    await sendMessage(botToken, chatId, "📦 No services available at the moment.");
    return;
  }

  // Get unique categories
  const allCategories = [...new Set(products.map((p: any) => p.category))];

  // Filter by category if specified
  const filtered = categoryFilter
    ? products.filter((p: any) => p.category.toLowerCase().includes(categoryFilter))
    : products;

  if (filtered.length === 0) {
    await sendMessage(botToken, chatId, [
      `❌ No services found in category "<b>${escapeHtml(categoryFilter!)}</b>".`,
      "",
      "📂 <b>Available categories:</b>",
      ...allCategories.map((c: string) => `• ${escapeHtml(c)}`),
      "",
      "💡 Usage: <code>/products IMEI Unlock</code>",
    ].join("\n"));
    return;
  }

  // Group by category
  const grouped: Record<string, any[]> = {};
  for (const p of filtered) {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  }

  const lines: string[] = [
    "🛒 <b>Available Services</b>",
    "━━━━━━━━━━━━━━━━━━",
  ];

  let count = 0;
  for (const [category, items] of Object.entries(grouped)) {
    if (count > 0) lines.push("");
    lines.push(`📂 <b>${escapeHtml(category)}</b> (${items.length})`);

    for (const p of items.slice(0, 10)) {
      const typeIcon = p.product_type === "imei" ? "🔓" : p.product_type === "api" ? "🤖" : "📦";
      const price = Number(p.wholesale_price).toLocaleString();
      const time = p.processing_time || "Instant";
      const stockInfo = p.product_type === "digital" ? ` | 📦 ${p.stock}` : "";
      lines.push(`  ${typeIcon} #${p.display_id} ${escapeHtml(p.name)}`);
      lines.push(`     💰 ${price} MMK | ⏱ ${time}${stockInfo}`);
    }

    if (items.length > 10) {
      lines.push(`  ... and ${items.length - 10} more`);
    }
    count++;
  }

  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━━━");

  if (!categoryFilter) {
    lines.push("💡 Filter: <code>/products IMEI Unlock</code>");
  }

  lines.push(`🔗 <a href="https://kk-reseller-hub.lovable.app/dashboard/place-order">Order in Dashboard</a>`);

  await sendMessage(botToken, chatId, lines.join("\n"));
}

// ── Handler: /cancel ──
const CANCELLABLE_STATUSES = ["pending", "pending_review", "pending_creation", "api_pending"];

async function handleCancel(supabase: any, botToken: string, chatId: number, text: string, user: any) {
  const parts = text.split(" ");
  if (parts.length < 2) {
    await sendMessage(botToken, chatId, [
      "ℹ️ <b>Usage:</b> /cancel [OrderCode]",
      "",
      "Example: <code>/cancel ORD-2603-AB12-0001</code>",
      "",
      "💡 Only pending orders can be cancelled.",
    ].join("\n"));
    return;
  }

  const query = parts.slice(1).join(" ").trim().replace("#", "");

  // Find order by exact or partial code
  let order: any = null;
  const { data: orderByCode } = await supabase
    .from("orders")
    .select("id, order_code, product_name, status, price, product_type")
    .eq("user_id", user.user_id)
    .eq("order_code", query)
    .maybeSingle();

  if (orderByCode) {
    order = orderByCode;
  } else {
    const { data: orderByPartial } = await supabase
      .from("orders")
      .select("id, order_code, product_name, status, price, product_type")
      .eq("user_id", user.user_id)
      .ilike("order_code", `%${query}%`)
      .limit(1)
      .maybeSingle();
    order = orderByPartial;
  }

  if (!order) {
    await sendMessage(botToken, chatId, `❌ No order found matching "<b>${escapeHtml(query)}</b>".\n\n💡 Try /orders to see your recent orders.`);
    return;
  }

  // Check if order is cancellable
  if (!CANCELLABLE_STATUSES.includes(order.status)) {
    const statusEmoji = STATUS_EMOJI[order.status] || "📋";
    await sendMessage(botToken, chatId, [
      `⚠️ <b>Cannot Cancel This Order</b>`,
      "━━━━━━━━━━━━━━━━━━",
      `📦 <b>Service:</b> ${escapeHtml(order.product_name)}`,
      `🆔 <b>Order:</b> <code>${order.order_code}</code>`,
      `${statusEmoji} <b>Status:</b> ${order.status.toUpperCase()}`,
      "",
      "Only pending orders can be cancelled.",
      "Please contact support for assistance.",
    ].join("\n"));
    return;
  }

  // Perform cancellation: update order + refund balance
  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      admin_notes: "Cancelled by user via Telegram bot",
      completed_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .eq("user_id", user.user_id);

  if (updateErr) {
    await sendMessage(botToken, chatId, "❌ Failed to cancel order. Please try again or contact support.");
    return;
  }

  // Refund balance
  await supabase.rpc("atomic_refund", {
    p_user_id: user.user_id,
    p_amount: order.price,
  });

  // Log refund transaction
  await supabase.from("wallet_transactions").insert({
    user_id: user.user_id,
    type: "refund",
    amount: order.price,
    status: "approved",
    description: `Cancelled: ${order.product_name}`,
  });

  // Notify admins
  const { data: admins } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  if (admins) {
    for (const admin of admins) {
      await supabase.from("notifications").insert({
        user_id: admin.user_id,
        title: "🚫 Order Cancelled by User",
        body: `${user.name || user.email} cancelled order ${order.order_code} (${order.product_name}). ${Number(order.price).toLocaleString()} MMK refunded.`,
        type: "order",
        link: `/admin/orders?order=${order.id}`,
      });
    }
  }

  // Get updated balance
  const { data: updatedProfile } = await supabase
    .from("profiles")
    .select("balance")
    .eq("user_id", user.user_id)
    .maybeSingle();

  const newBalance = Number(updatedProfile?.balance || 0);

  await sendMessage(botToken, chatId, [
    "🚫 <b>Order Cancelled Successfully</b>",
    "━━━━━━━━━━━━━━━━━━",
    `📦 <b>Service:</b> ${escapeHtml(order.product_name)}`,
    `🆔 <b>Order:</b> <code>${order.order_code}</code>`,
    `💰 <b>Refunded:</b> ${Number(order.price).toLocaleString()} MMK`,
    `💵 <b>New Balance:</b> ${newBalance.toLocaleString()} MMK`,
    "━━━━━━━━━━━━━━━━━━",
    "Your balance has been restored.",
    `🔗 <a href="https://kk-reseller-hub.lovable.app/dashboard/wallet">View Wallet</a>`,
  ].join("\n"));
}

// ── Handler: /unlink ──
async function handleUnlink(supabase: any, botToken: string, chatId: number, telegramId: string, user: any) {
  // Remove from telegram_connections
  await supabase
    .from("telegram_connections")
    .delete()
    .eq("telegram_id", telegramId);

  // Clear from profiles for backward compatibility
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
}

const NOT_LINKED_MSG = [
  "🔗 <b>Account Not Linked</b>",
  "",
  "Please connect your Telegram account from your KKTech dashboard.",
  "",
  "📱 Visit: https://kk-reseller-hub.lovable.app/dashboard/settings",
  "",
  "Need help? Send /help for more info.",
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
    const fromUser = message.from;
    const telegramId = String(fromUser?.id || chatId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── /start ──
    if (text.startsWith("/start")) {
      await handleStart(supabase, botToken, chatId, text, fromUser);
      return new Response("OK");
    }

    // ── /help ──
    if (text === "/help") {
      await sendMessage(botToken, chatId, HELP_TEXT);
      return new Response("OK");
    }

    // ── Find linked user via telegram_connections ──
    const user = await findLinkedUser(supabase, telegramId);

    if (!user) {
      await sendMessage(botToken, chatId, NOT_LINKED_MSG);
      return new Response("OK");
    }

    // ── /balance ──
    if (text === "/balance") {
      await handleBalance(supabase, botToken, chatId, user);
      return new Response("OK");
    }

    // ── /orders ──
    if (text === "/orders") {
      await handleOrders(supabase, botToken, chatId, user);
      return new Response("OK");
    }

    // ── /products ──
    if (text === "/products" || text.startsWith("/products ")) {
      await handleProducts(supabase, botToken, chatId, text);
      return new Response("OK");
    }

    // ── /status [OrderID] ──
    if (text.startsWith("/status")) {
      await handleStatus(supabase, botToken, chatId, text, user);
      return new Response("OK");
    }

    // ── /cancel ──
    if (text.startsWith("/cancel")) {
      await handleCancel(supabase, botToken, chatId, text, user);
      return new Response("OK");
    }

    // ── /unlink ──
    if (text === "/unlink") {
      await handleUnlink(supabase, botToken, chatId, telegramId, user);
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
