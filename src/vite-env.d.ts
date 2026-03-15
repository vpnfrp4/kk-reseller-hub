/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

declare namespace React {
  interface ImgHTMLAttributes<T> {
    fetchPriority?: "high" | "low" | "auto";
  }
}
