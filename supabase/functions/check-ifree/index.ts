import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Try to extract a meaningful error from an iFreeiCloud response */
function extractProviderError(raw: string, status: number): string {
  const lower = raw.toLowerCase();

  // Common iFreeiCloud error patterns
  if (lower.includes("invalid api key") || lower.includes("invalid key") || lower.includes("authentication")) {
    return "Invalid API key. Please check your iFreeiCloud API key configuration.";
  }
  if (lower.includes("insufficient") || lower.includes("balance") || lower.includes("credit")) {
    return "Insufficient API balance. Please top up your iFreeiCloud account.";
  }
  if (lower.includes("service doesn") || lower.includes("service not found") || lower.includes("invalid service")) {
    return "Service doesn't exist or has been discontinued by the provider. Please refresh the service list.";
  }
  if (lower.includes("invalid imei") || lower.includes("wrong imei")) {
    return "Invalid IMEI number. Please verify and try again.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Rate limited by the provider. Please wait a moment and try again.";
  }
  if (lower.includes("maintenance") || lower.includes("unavailable")) {
    return "The iFreeiCloud service is temporarily unavailable. Please try again later.";
  }

  // HTML response = likely auth issue or server error
  if (raw.trim().startsWith("<!") || raw.includes("<html")) {
    return `Provider returned an HTML page instead of data (HTTP ${status}). This usually means the API key is invalid or the account session expired.`;
  }

  return `Provider error (HTTP ${status}): ${raw.substring(0, 200)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imei, serviceId, serviceName } = await req.json();
    const API_KEY = Deno.env.get("IFREE_API_KEY");

    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!imei || !serviceId) {
      return new Response(
        JSON.stringify({ error: "IMEI and Service ID are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean IMEI: strip whitespace and non-digit chars
    const cleanImei = imei.replace(/\D/g, "").trim();
    if (cleanImei.length !== 15) {
      return new Response(
        JSON.stringify({ error: "IMEI must be exactly 15 digits." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = new URLSearchParams({
      key: API_KEY,
      imei: cleanImei,
      service: String(serviceId).trim(),
    });

    console.log("check-ifree request:", { imei: cleanImei, serviceId: String(serviceId).trim() });

    const response = await fetch("https://api.ifreeicloud.co.uk", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const rawText = await response.text();
    console.log("check-ifree raw response (first 500):", rawText.substring(0, 500));

    // Try to parse as JSON
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      // Not valid JSON – extract a useful error message
      const specificError = extractProviderError(rawText, response.status);
      data = {
        error: specificError,
        error_code: "INVALID_RESPONSE",
        raw_preview: rawText.substring(0, 200),
      };
    }

    // Check for provider-level errors in the JSON response
    if (data.error) {
      // Enrich generic error messages
      const errorLower = String(data.error).toLowerCase();
      if (errorLower.includes("service doesn") || errorLower.includes("not exist")) {
        data.error = "This service no longer exists or its ID has changed. Please refresh the service list and try again.";
        data.error_code = "SERVICE_NOT_FOUND";
      } else if (errorLower.includes("insufficient") || errorLower.includes("balance") || errorLower.includes("credit")) {
        data.error = "Insufficient API balance. Please top up your iFreeiCloud account.";
        data.error_code = "INSUFFICIENT_BALANCE";
      } else if (errorLower.includes("invalid") && errorLower.includes("key")) {
        data.error = "Invalid API key. Please check your iFreeiCloud API key configuration.";
        data.error_code = "INVALID_API_KEY";
      }
    }

    // Log the check to database
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("ifree_checks").insert({
            user_id: user.id,
            imei: cleanImei,
            service_id: String(serviceId).trim(),
            service_name: serviceName || "",
            response_text: data.response || null,
            account_balance: data.account_balance != null ? String(data.account_balance) : null,
            error_message: data.error || null,
            success: !data.error && !data.error_code,
          });
        }
      }
    } catch (logErr) {
      console.error("Failed to log ifree check:", logErr);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
