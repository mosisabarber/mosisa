import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visual label — always render one; use `hideLabel` only when the
      placeholder + aria-label make the purpose unambiguous. */
  label?: string;
  hideLabel?: boolean;
  error?: string | null;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, hideLabel = false, error, id, ...props },
  ref
) {
  const inputId = id ?? props.name;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            "text-sm font-medium text-cream-muted",
            hideLabel && "sr-only"
          )}
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(
          "h-11 w-full rounded-md border border-line bg-charcoal px-3.5 text-sm text-cream",
          "placeholder:text-cream-muted",
          "focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-error focus:border-error focus:ring-error/40",
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
