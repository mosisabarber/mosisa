import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "brass" | "forest" | "navy" | "warning" | "error" | "neutral";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  brass: "border-brass/40 bg-brass/10 text-brass-strong",
  forest: "border-forest-bright/50 bg-forest/25 text-forest-bright",
  navy: "border-navy-bright/60 bg-navy/40 text-cream",
  warning: "border-warning/40 bg-warning/10 text-warning",
  error: "border-error/40 bg-error/10 text-error",
  neutral: "border-line bg-surface-raised text-cream-muted",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
