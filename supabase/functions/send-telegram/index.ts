import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TelegramPayload {
  type: "order" | "topup" | "status_update" | "test" | "custom";
  chat_id?: string;
  // order fields
  order_id?: string;
  order_code?: string;
  product_name?: string;
  price?: number;
  user_email?: string;
  user_name?: string;
  product_type?: string;
  // topup fields
  amount?: number;
  method?: string;
  screenshot_url?: string;
  transaction_id?: string;
  // status update fields
  status?: string;
  // custom
  message?: string;
}

function buildOrderMessage(p: TelegramPayload): string {
  return [
    `🚀 <b>New Order Alert!</b>`,
    `━━━━━━━━━━━━━━━━━━`,
    `👤 <b>Customer:</b> ${p.user_name || p.user_email || "Unknown"}`,
    `📦 <b>Product:</b> ${p.product_name || "N/A"}`,
    `💰 <b>Amount:</b> ${Number(p.price || 0).toLocaleString()} MMK`,
    `🆔 <b>Order ID:</b> #${p.order_code || p.order_id?.slice(0, 8) || "N/A"}`,
    `📋 <b>Type:</b> ${(p.product_type || "digital").toUpperCase()}`,
    `━━━━━━━━━━━━━━━━━━`,
    `🔗 <a href="https://kk-reseller-hub.lovable.app/admin/orders">Manage Order</a>`,
  ].join("\n");
}

function buildTopupMessage(p: TelegramPayload): string {
  const lines = [
    `💳 <b>New Top-Up Request!</b>`,
    `━━━━━━━━━━━━━━━━━━`,
    `👤 <b>User:</b> ${p.user_name || p.user_email || "Unknown"}`,
    `💰 <b>Amount:</b> ${Number(p.amount || 0).toLocaleString()} MMK`,
    `🏦 <b>Method:</b> ${p.method || "N/A"}`,
    `🆔 <b>TX ID:</b> ${p.transaction_id?.slice(0, 8) || "N/A"}`,
  ];
  if (p.screenshot_url) {
    lines.push(`📸 <b>Screenshot:</b> <a href="${p.screenshot_url}">View</a>`);
  }
  lines.push(`━━━━━━━━━━━━━━━━━━`);
  lines.push(`🔗 <a href="https://kk-reseller-hub.lovable.app/admin/topups">Review Top-Ups</a>`);
  return lines.join("\n");
}

function buildStatusMessage(p: TelegramPayload): string {
  const emoji = p.status === "completed" || p.status === "delivered" ? "✅" : "⏳";
  return [
    `${emoji} <b>Order Status Updated</b>`,
    `━━━━━━━━━━━━━━━━━━`,
    `📦 <b>Product:</b> ${p.product_name || "N/A"}`,
    `🆔 <b>Order:</b> #${p.order_code || p.order_id?.slice(0, 8) || "N/A"}`,
    `📊 <b>Status:</b> ${(p.status || "").toUpperCase()}`,
    `━━━━━━━━━━━━━━━━━━`,
    `🔗 <a href="https://kk-reseller-hub.lovable.app/orders">View Orders</a>`,
  ].join("\n");
}

function buildTestMessage(): string {
  return [
    `🤖 <b>Telegram Bot Connected!</b>`,
    `━━━━━━━━━━━━━━━━━━`,
    `✅ Your KKREMOTER Telegram notifications are working correctly.`,
    `📅 <b>Time:</b> ${new Date().toISOString()}`,
    `━━━━━━━━━━━━━━━━━━`,
  ].join("\n");
}

async function sendTelegram(botToken: string, chatId: string, text: string) {
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
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.description || "Telegram API error");
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const adminChatId = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");

    if (!botToken || !adminChatId) {
      return new Response(
        JSON.stringify({ success: false, error: "Telegram credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: TelegramPayload = await req.json();
    let message = "";
    let targetChatId = adminChatId;

    switch (payload.type) {
      case "order":
        message = buildOrderMessage(payload);
        break;
      case "topup":
        message = buildTopupMessage(payload);
        break;
      case "status_update":
        targetChatId = payload.chat_id || adminChatId;
        message = buildStatusMessage(payload);
        break;
      case "test":
        message = buildTestMessage();
        break;
      case "custom":
        message = payload.message || "No message provided";
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: "Invalid notification type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    await sendTelegram(botToken, targetChatId, message);

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
