import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Detect which custom fields an API service needs based on name/type/category */
function detectRequiredFields(
  name: string,
  category: string,
  type: string,
  min: number,
  max: number,
): Array<{
  field_name: string;
  field_type: string;
  required: boolean;
  min_length: number | null;
  max_length: number | null;
  linked_mode: string;
  sort_order: number;
  options: string[];
  placeholder: string;
  validation_rule: string;
}> {
  const text = `${name} ${category} ${type}`.toLowerCase();
  const fields: ReturnType<typeof detectRequiredFields> = [];
  let order = 0;

  // Link/URL detection
  const needsLink =
    /follow|like|view|share|react|retweet|repost|subscriber|watch|visit|traffic|comment|save|impression|reach|engagement|stream|play|pin|vote|poll|click|post|link/i.test(text) ||
    /default|custom comments/i.test(type);
  if (needsLink) {
    fields.push({
      field_name: "Link",
      field_type: "text",
      required: true,
      min_length: 5,
      max_length: 500,
      linked_mode: "api",
      sort_order: order++,
      options: [],
      placeholder: "https://example.com/post/123",
      validation_rule: "url",
    });
  }

  // Username detection
  const needsUsername =
    /username|mention|dm|direct message|power|member|add.*group/i.test(text) && !needsLink;
  if (needsUsername) {
    fields.push({
      field_name: "Username",
      field_type: "text",
      required: true,
      min_length: 1,
      max_length: 200,
      linked_mode: "api",
      sort_order: order++,
      options: [],
      placeholder: "@username",
      validation_rule: "",
    });
  }

  // Comments/text detection
  const needsComments = /comment|review|testimonial|custom comment/i.test(text);
  if (needsComments) {
    fields.push({
      field_name: "Comments",
      field_type: "textarea",
      required: true,
      min_length: 1,
      max_length: 5000,
      linked_mode: "api",
      sort_order: order++,
      options: [],
      placeholder: "Enter comments (one per line for multiple)",
      validation_rule: "",
    });
  }

  // Quantity — always added for API services
  const minQty = min || 1;
  const maxQty = max || 10000;
  fields.push({
    field_name: "Quantity",
    field_type: "number",
    required: true,
    min_length: minQty,
    max_length: maxQty,
    linked_mode: "api",
    sort_order: order++,
    options: [],
    placeholder: `Min ${minQty} — Max ${maxQty}`,
    validation_rule: "",
  });

  return fields;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth check
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all API products
    const { data: apiProducts, error: prodErr } = await supabase
      .from("products")
      .select("id, name, category, api_service_id, api_min_quantity, api_max_quantity, provider_id")
      .eq("product_type", "api")
      .not("api_service_id", "is", null);

    if (prodErr) throw prodErr;

    if (!apiProducts || apiProducts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No API products found", processed: 0, skipped: 0, generated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch all existing custom fields for these products
    const productIds = apiProducts.map((p) => p.id);
    const { data: existingFields } = await supabase
      .from("product_custom_fields")
      .select("product_id")
      .in("product_id", productIds);

    // Build set of product IDs that already have custom fields
    const hasFields = new Set((existingFields || []).map((f: any) => f.product_id));

    // Fetch linked api_services for type info
    const serviceIds = [...new Set(apiProducts.map((p) => p.api_service_id).filter(Boolean))];
    const { data: services } = await supabase
      .from("api_services")
      .select("provider_service_id, name, category, type, min, max")
      .in("provider_service_id", serviceIds.map((s) => parseInt(s)));

    const serviceMap = new Map<string, any>();
    for (const svc of services || []) {
      serviceMap.set(String(svc.provider_service_id), svc);
    }

    let generated = 0;
    let skipped = 0;
    const details: Array<{ product: string; fields: string[] }> = [];

    for (const product of apiProducts) {
      // Skip if product already has custom fields (don't override manual edits)
      if (hasFields.has(product.id)) {
        skipped++;
        continue;
      }

      // Get service metadata for better detection
      const svc = serviceMap.get(product.api_service_id);
      const serviceName = svc?.name || product.name;
      const serviceCategory = svc?.category || product.category;
      const serviceType = svc?.type || "";
      const minQty = svc?.min || product.api_min_quantity || 1;
      const maxQty = svc?.max || product.api_max_quantity || 10000;

      const detectedFields = detectRequiredFields(serviceName, serviceCategory, serviceType, minQty, maxQty);

      if (detectedFields.length > 0) {
        const rows = detectedFields.map((f) => ({
          product_id: product.id,
          field_name: f.field_name,
          field_type: f.field_type,
          required: f.required,
          min_length: f.min_length,
          max_length: f.max_length,
          linked_mode: f.linked_mode,
          sort_order: f.sort_order,
          options: f.options,
          placeholder: f.placeholder,
          validation_rule: f.validation_rule,
        }));

        const { error: insertErr } = await supabase.from("product_custom_fields").insert(rows);
        if (!insertErr) {
          generated++;
          details.push({
            product: product.name,
            fields: detectedFields.map((f) => f.field_name),
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backfill complete: ${generated} products updated, ${skipped} skipped (already have fields)`,
        total: apiProducts.length,
        generated,
        skipped,
        details: details.slice(0, 50), // limit response size
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
