const SITE_URL = "https://kk-reseller-hub.lovable.app";

const pages = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/login", priority: "0.6", changefreq: "monthly" },
  { path: "/services/imei-unlock", priority: "0.9", changefreq: "weekly" },
  { path: "/services/vpn-keys", priority: "0.9", changefreq: "weekly" },
  { path: "/services/capcut-pro", priority: "0.9", changefreq: "weekly" },
  { path: "/tools/imei-check", priority: "0.8", changefreq: "monthly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
];

const today = new Date().toISOString().split("T")[0];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (p) => `  <url>
    <loc>${SITE_URL}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

console.log(xml);
