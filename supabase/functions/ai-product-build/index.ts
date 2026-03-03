import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Exponential backoff wrapper for fetch calls */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      // Only retry on 429 (rate limit) or 5xx server errors
      if (response.status === 429 || response.status >= 500) {
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
          const jitter = Math.random() * 500;
          console.log(`Retry attempt ${attempt + 1} after ${delay + jitter}ms (status: ${response.status})`);
          await new Promise((r) => setTimeout(r, delay + jitter));
          continue;
        }
      }
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        const jitter = Math.random() * 500;
        console.log(`Network error, retry ${attempt + 1} after ${delay + jitter}ms`);
        await new Promise((r) => setTimeout(r, delay + jitter));
      }
    }
  }
  throw lastError || new Error("Max retries exceeded");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { service_name, mode, category, product_type, duration, processing_time } = await req.json();

    if (!service_name) {
      return new Response(JSON.stringify({ error: "service_name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const modeInstructions: Record<string, string> = {
      "ultra-short": `Generate a VERY SHORT product description (max 7 lines). Format:
Line 1: Clean product title (NO emojis)
Line 2: empty
Lines 3-7: Bullet points using plain dashes (e.g. "- Type:", "- Processing:", "- Key Feature:", "- Warranty:")
No headings, no paragraphs. Max 7 lines total. ABSOLUTELY NO EMOJIS anywhere in the output.`,

      "standard": `Generate a structured product description using PLAIN TEXT section headers (uppercase). DO NOT use any emojis.

SERVICE OVERVIEW (2-3 sentences)
KEY FEATURES (4-5 bullet points using plain dashes "-")
DELIVERY TIME (1 line)
WARRANTY / GUARANTEE (1-2 lines)
COMPATIBILITY / REQUIREMENTS (3-4 bullets)
RESELLER ADVANTAGE (3 bullets)
IMPORTANT NOTES (2 bullets)

Use uppercase section headers followed by content. Use plain dashes for bullets. Keep it professional and clean. ABSOLUTELY NO EMOJIS.`,

      "seo-full": `Generate a comprehensive SEO-optimized product description with PLAIN TEXT formatting. DO NOT use any emojis.

SERVICE OVERVIEW (3-4 sentences, keyword-rich)
KEY FEATURES (5-6 bullet points using plain dashes "-")
DELIVERY TIME (1-2 lines)
WARRANTY / GUARANTEE (2-3 lines)
COMPATIBILITY / REQUIREMENTS (4-5 bullets)
RESELLER ADVANTAGE (3-4 bullets)
IMPORTANT NOTES (2-3 bullets)
SEO KEYWORDS (comma-separated relevant keywords)

Use uppercase section headers. Use plain dashes for bullets. Professional tone. ABSOLUTELY NO EMOJIS.`,
    };

    const systemPrompt = `You are a product description writer for KKTech, a wholesale digital services marketplace for resellers in Myanmar. You write professional, informative descriptions for services including digital accounts, IMEI unlocks, VPN keys, API services, and software licenses.

CRITICAL RULES:
- ABSOLUTELY DO NOT USE ANY EMOJIS. No checkmarks, no warning signs, no sparkles, no icons of any kind.
- Use plain dashes "-" for bullet points
- Use UPPERCASE text for section headers (e.g. "SERVICE OVERVIEW", "KEY FEATURES")
- Write in English
- Be factual and professional — no hype or marketing fluff
- Focus on what the service IS and what the customer GETS
- Include practical details: delivery time, warranty, requirements
- Use the exact formatting specified
- Never invent specific technical claims you can't verify
- For IMEI services: mention "server-based unlock", "permanent", "warranty-safe"
- For digital accounts: mention "instant delivery", "credential-based"
- For API services: mention "automated processing", "real-time", "bulk support"
- Keep it concise and visually scannable with clear structure`;

    const userPrompt = `Service Name: "${service_name}"
Category: ${category || "Auto-detect"}
Product Type: ${product_type || "digital"}
Duration: ${duration || "Not specified"}
Processing Time: ${processing_time || "Not specified"}

${modeInstructions[mode] || modeInstructions["ultra-short"]}`;

    const response = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-product-build error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
