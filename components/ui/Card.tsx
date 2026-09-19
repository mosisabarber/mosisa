import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** `raised` lifts the surface (nav cards, booking summary, modals). */
  tone?: "base" | "raised";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, tone = "base", ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-line",
        tone === "raised" ? "bg-surface-raised" : "bg-surface",
        className
      )}
      {...props}
    />
  );
});
