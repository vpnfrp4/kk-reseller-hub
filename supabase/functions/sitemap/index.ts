import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://kk-reseller-hub.lovable.app";

const staticPages = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/login", priority: "0.6", changefreq: "monthly" },
  { path: "/services/imei-unlock", priority: "0.9", changefreq: "weekly" },
  { path: "/services/vpn-keys", priority: "0.9", changefreq: "weekly" },
  { path: "/services/capcut-pro", priority: "0.9", changefreq: "weekly" },
  { path: "/tools/imei-check", priority: "0.8", changefreq: "monthly" },
  { path: "/dashboard/products", priority: "0.8", changefreq: "daily" },
  { path: "/blog", priority: "0.8", changefreq: "daily" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
];

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const today = new Date().toISOString().split("T")[0];

  // Fetch all products
  const { data: products } = await supabase
    .from("products")
    .select("id, category, created_at")
    .order("created_at", { ascending: false });

  // Build product detail URLs
  const productPages = (products || []).map((p: any) => ({
    path: `/dashboard/products/${p.id}`,
    priority: "0.7",
    changefreq: "weekly",
    lastmod: p.created_at?.split("T")[0] || today,
  }));

  // Unique categories
  const categories = [...new Set((products || []).map((p: any) => p.category).filter(Boolean))];
  const categoryPages = categories.map((cat) => ({
    path: `/dashboard/products?category=${encodeURIComponent(cat)}`,
    priority: "0.6",
    changefreq: "weekly",
  }));

  // Fetch published blog posts
  const { data: blogPosts } = await supabase
    .from("blog_posts")
    .select("slug, published_at, created_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  const blogPages = (blogPosts || []).map((p: any) => ({
    path: `/blog/${p.slug}`,
    priority: "0.7",
    changefreq: "weekly",
    lastmod: (p.published_at || p.created_at)?.split("T")[0] || today,
  }));

  const allPages = [
    ...staticPages.map((p) => ({ ...p, lastmod: today })),
    ...productPages,
    ...categoryPages.map((p) => ({ ...p, lastmod: today })),
    ...blogPages,
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
    .map(
      (p) => `  <url>
    <loc>${SITE_URL}${p.path}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
    )
    .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
