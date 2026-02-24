import { useEffect, useRef, useState, CSSProperties } from "react";

interface UseScrollRevealOptions {
  /** Delay in ms before this element starts animating (for stagger) */
  delay?: number;
  /** IntersectionObserver threshold (0-1). Default 0.15 */
  threshold?: number;
  /** Root margin for triggering earlier/later. Default "0px 0px -40px 0px" */
  rootMargin?: string;
}

/**
 * Scroll-reveal hook: fade-in + translateY(20→0) on viewport entry.
 * Fires once per element. Returns a ref and a style object.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>({
  delay = 0,
  threshold = 0.15,
  rootMargin = "0px 0px -40px 0px",
}: UseScrollRevealOptions = {}) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const style: CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 0.5s ease-out ${delay}ms, transform 0.5s ease-out ${delay}ms`,
    willChange: "opacity, transform",
  };

  return { ref, style, visible };
}
