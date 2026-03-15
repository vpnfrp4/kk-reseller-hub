/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

declare module "react" {
  interface ImgHTMLAttributes<T> {
    fetchPriority?: "high" | "low" | "auto";
  }
}
