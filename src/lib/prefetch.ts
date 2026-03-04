/**
 * Route prefetch map — maps path prefixes to their dynamic import functions.
 * Calling the import function triggers Vite to load the chunk ahead of time.
 */
const routeImports: Record<string, () => Promise<unknown>> = {
  "/dashboard":            () => import("@/pages/DashboardHome"),
  "/dashboard/place-order":() => import("@/pages/PlaceOrderPage"),
  "/dashboard/orders":     () => import("@/pages/OrdersPage"),
  "/dashboard/wallet":     () => import("@/pages/WalletPage"),
  "/dashboard/settings":   () => import("@/pages/SettingsPage"),
  "/dashboard/products":   () => import("@/pages/ProductsPage"),
  "/dashboard/notifications": () => import("@/pages/NotificationsPage"),
  "/login":                () => import("@/pages/Login"),
  "/blog":                 () => import("@/pages/BlogListPage"),
  "/tools/imei-check":     () => import("@/pages/ImeiCheckPage"),
};

const prefetched = new Set<string>();

/**
 * Prefetch a route's JS chunk by path. Safe to call multiple times —
 * each path is only fetched once.
 */
export function prefetchRoute(path: string) {
  // Find best matching route (longest prefix match)
  const match = Object.keys(routeImports)
    .filter((key) => path === key || path.startsWith(key + "/"))
    .sort((a, b) => b.length - a.length)[0];

  const key = match || path;
  if (prefetched.has(key)) return;

  const loader = routeImports[key];
  if (loader) {
    prefetched.add(key);
    loader();
  }
}
