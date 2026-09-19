import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

/**
 * Standard empty / loading / error / success state renderer
 * (barber-shop-product-spec.md §8 "States to design" — built alongside the
 * design system as Stage 2 of the dev plan requires).
 */
export function StateMessage({
  state,
  title,
  description,
  action,
  className,
}: {
  state: "empty" | "loading" | "error" | "success";
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const accent =
    state === "error"
      ? "text-error"
      : state === "success"
        ? "text-success"
        : "text-brass";

  const defaults: Record<typeof state, string> = {
    empty: "Nothing here yet",
    loading: "Loading…",
    error: "Something went wrong",
    success: "All set",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className
      )}
      role={state === "error" ? "alert" : "status"}
    >
      {state === "loading" ? (
        <Spinner className={cn("h-6 w-6", accent)} />
      ) : (
        <span className={cn("font-heading text-xl font-semibold", accent)}>
          {title ?? defaults[state]}
        </span>
      )}
      {description && (
        <p className="max-w-sm text-sm text-cream-muted">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
