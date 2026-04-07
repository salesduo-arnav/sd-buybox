import { useEffect, useRef, useState } from "react";

/**
 * Returns a ref to attach to an element and a boolean that flips to true
 * once the element enters the viewport. One-shot: disconnects after firing.
 *
 * Honors prefers-reduced-motion by starting in the visible state.
 */
export function useFadeInOnScroll<T extends HTMLElement = HTMLDivElement>(
  rootMargin = "0px 0px -50px 0px",
  threshold = 0.15,
) {
  const ref = useRef<T | null>(null);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [isVisible, setIsVisible] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [prefersReducedMotion, rootMargin, threshold]);

  return { ref, isVisible };
}
