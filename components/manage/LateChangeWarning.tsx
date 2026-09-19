/**
 * Soft warning banner for changes inside the 12-hour window (spec §6/§10).
 * Late changes are allowed — this only informs, it never blocks.
 */
export interface LateChangeWarningProps {
  message: string;
  tone?: "warning" | "info";
}

export function LateChangeWarning({
  message,
  tone = "warning",
}: LateChangeWarningProps) {
  if (!message) return null;

  const styles =
    tone === "warning"
      ? "border-warning/40 bg-warning/10 text-warning"
      : "border-line bg-surface text-cream-muted";

  return (
    <div
      role="status"
      className={`rounded-md border px-3 py-2.5 text-sm leading-6 ${styles}`}
    >
      <span className="mr-1.5 font-semibold" aria-hidden="true">
        ⚠
      </span>
      {message}
    </div>
  );
}