import { type ReactNode } from "react";
import { useFadeInOnScroll } from "./useFadeInOnScroll";
import { cn } from "@/lib/Utils";

interface FadeInSectionProps {
  children: ReactNode;
  delayMs?: number;
  className?: string;
  as?: "div" | "section" | "article";
}

/**
 * Wraps children in a div that fades + slides in when scrolled into view.
 * Pure CSS transition triggered by toggling Tailwind classes.
 */
export function FadeInSection({
  children,
  delayMs = 0,
  className,
  as: Tag = "div",
}: FadeInSectionProps) {
  const { ref, isVisible } = useFadeInOnScroll<HTMLDivElement>();

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={cn(
        "transition-all duration-700 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
