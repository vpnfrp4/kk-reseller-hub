import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://kktech.shop";
const SITE_NAME = "KKTech";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

/* ------------------------------------------------------------------ */
/*  Static route metadata                                              */
/* ------------------------------------------------------------------ */
interface RouteMeta {
  title: string;
  description: string;
  image: string;
  type: string;
}

const STATIC_ROUTES: Record<string, RouteMeta> = {
  "/": {
    title:
      "KKTech – Digital Unlock Myanmar | IMEI Unlock & GSM Services",
    description:
      "KKTech is Myanmar's #1 digital unlock and GSM services platform. Instant IMEI unlock, GSM tools, and digital subscriptions for resellers. Fast delivery, best rates.",
    image: DEFAULT_IMAGE,
    type: "website",
  },
  "/services/imei-unlock": {
    title:
      "IMEI Unlock Services — Professional Reseller Infrastructure | KKTech",
    description:
      "Structured IMEI unlock services for professional resellers. iPhone carrier unlock, Samsung FRP removal, 200+ carrier coverage. Verified providers, transparent pricing.",
    image: `${SITE_URL}/og-imei-unlock.png`,
    type: "website",
  },
  "/services/vpn-keys": {
    title: "VPN Keys — Professional Reseller Distribution | KKTech",
    description:
      "VPN activation keys for professional resellers. ExpressVPN, LetsVPN, NordVPN, Surfshark. Instant delivery, transparent pricing, verified providers.",
    image: `${SITE_URL}/og-vpn-keys.png`,
    type: "website",
  },
  "/services/capcut-pro": {
    title:
      "CapCut Pro Accounts — Professional Reseller Distribution | KKTech",
    description:
      "CapCut Pro accounts for professional resellers. Instant delivery, verified credentials, transparent pricing. Canva Pro also available.",
    image: `${SITE_URL}/og-capcut-pro.png`,
    type: "website",
  },
  "/blog": {
    title: "Blog – IMEI Unlock, GSM & Digital Services | KKTech",
    description:
      "Tips, tutorials, and industry insights on IMEI unlocking, GSM services, and digital products in Myanmar.",
    image: DEFAULT_IMAGE,
    type: "website",
  },
};

/* ------------------------------------------------------------------ */
/*  Build a minimal HTML page with full OG / Twitter tags              */
/* ------------------------------------------------------------------ */
function buildHtml(meta: RouteMeta, canonicalUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${esc(meta.title)}</title>
  <meta name="description" content="${esc(meta.description)}"/>
  <link rel="canonical" href="${esc(canonicalUrl)}"/>

  <!-- Open Graph -->
  <meta property="og:type"        content="${meta.type}"/>
  <meta property="og:site_name"   content="${SITE_NAME}"/>
  <meta property="og:title"       content="${esc(meta.title)}"/>
  <meta property="og:description" content="${esc(meta.description)}"/>
  <meta property="og:url"         content="${esc(canonicalUrl)}"/>
  <meta property="og:image"       content="${esc(meta.image)}"/>

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image"/>
  <meta name="twitter:site"        content="@KKTechDeals"/>
  <meta name="twitter:title"       content="${esc(meta.title)}"/>
  <meta name="twitter:description" content="${esc(meta.description)}"/>
  <meta name="twitter:image"       content="${esc(meta.image)}"/>

  <!-- Redirect real visitors to the SPA -->
  <meta http-equiv="refresh" content="0;url=${esc(canonicalUrl)}"/>
  <script>window.location.replace("${esc(canonicalUrl)}");</script>
</head>
<body>
  <p>Redirecting to <a href="${esc(canonicalUrl)}">${esc(meta.title)}</a>…</p>
</body>
</html>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ------------------------------------------------------------------ */
/*  Fetch blog post metadata from DB for /blog/:slug                   */
/* ------------------------------------------------------------------ */
async function getBlogMeta(slug: string): Promise<RouteMeta | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  const { data } = await sb
    .from("blog_posts")
    .select(
      "title, excerpt, meta_title, meta_description, cover_image_url"
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!data) return null;

  return {
    title: data.meta_title || `${data.title} – KKTech`,
    description: data.meta_description || data.excerpt || data.title,
    image: data.cover_image_url || DEFAULT_IMAGE,
    type: "article",
  };
}

/* ------------------------------------------------------------------ */
/*  Handler                                                            */
/* ------------------------------------------------------------------ */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path")?.replace(/\/+$/, "") || "/";
  const canonicalUrl = `${SITE_URL}${path}`;

  let meta: RouteMeta | null = STATIC_ROUTES[path] || null;

  // Dynamic blog post route: /blog/:slug
  if (!meta && path.startsWith("/blog/")) {
    const slug = path.replace("/blog/", "");
    if (slug) meta = await getBlogMeta(slug);
  }

  // Fallback to homepage meta
  if (!meta) meta = STATIC_ROUTES["/"];

  const html = buildHtml(meta!, canonicalUrl);

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
});
