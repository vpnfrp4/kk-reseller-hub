/**
 * Preload a batch of image URLs into the browser cache.
 * Uses <link rel="preload"> for high-priority above-fold images,
 * falls back to Image() for broader support.
 */
export const preloaded = new Set<string>();

export function preloadImages(urls: (string | null | undefined)[], highPriority = false) {
  for (const url of urls) {
    if (!url || preloaded.has(url)) continue;
    preloaded.add(url);

    if (highPriority && typeof document !== "undefined") {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = url;
      link.setAttribute("fetchpriority", "high");
      document.head.appendChild(link);
    } else {
      const img = new Image();
      img.src = url;
    }
  }
}
