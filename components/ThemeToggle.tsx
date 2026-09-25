"use client";

import { useCallback, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

/**
 * Light/dark theme toggle (client-side).
 *
 * Dark is the brand default; a stored explicit choice wins. The class is
 * applied to <html> so the CSS token overrides in globals.css (`html.light`)
 * take effect. The layouts run a pre-paint script that restores the class
 * before first render, so there is no theme flash on reload.
 *
 * State source of truth: the `light` class on <html>, NOT a useState mirror.
 * The pre-paint script sets that class before React hydrates, so a useState
 * copy can disagree with the DOM (it starts `false` and only catches up in an
 * effect) — which rendered the wrong glyph. useSyncExternalStore reads the DOM
 * directly and re-reads whenever the class changes, so icon and background can
 * never disagree.
 *
 * Presentation: a bordered chip (same treatment as the language switcher) so
 * the button stays visible in both themes. Colour comes from `text-*` on the
 * button plus `currentColor` on the glyph, so the icon always matches the
 * mode it represents. Light mode uses `bg-surface-raised` (#efebdf — a
 * definite off-white) rather than `bg-surface` (#ffffff), because a white chip
 * on the #f6f4ee paper header is nearly indistinguishable.
 *
 * `data-theme-state` is a debug hook: inspect the button in devtools to see
 * which theme state React believes it is in.
 */
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
};

const getSnapshot = () => document.documentElement.classList.contains("light");

/** Server render matches the dark default (see the layouts' pre-paint script). */
const getServerSnapshot = () => false;

export function ThemeToggle({ label }: { label: string }) {
  const light = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains("light");
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("mosisa_theme", next ? "light" : "dark");
    } catch {
      // Private mode / storage disabled — theme just won't persist.
    }
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-pressed={light}
      data-theme-state={light ? "light" : "dark"}
      className={cn(
        "rounded-md border p-2 transition-colors",
        light
          ? "border-line bg-surface-raised text-[#201f1b] hover:border-brass"
          : "border-line bg-surface text-cream hover:border-brass"
      )}
    >
      {light ? (
        /* moon — shown in light mode; click returns to dark.
           currentColor follows the button's light-mode ink (#201f1b).
           Radii are 8 (not 7.5): the arc's chord is 15.13 units, so the SVG
           spec demands r >= 7.57 — the old 7.5 was below the minimum and
           browsers degraded the crescent to an invisible, zero-area shape.
           +3.1e-5 offset stops exact-arc rounding issues at small sizes. */
        <svg
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M17.3 13.4A8 8 0 0 1 6.6 2.7A8 8 0 1 0 17.3 13.4Z" />
        </svg>
      ) : (
        /* sun — shown in dark mode; click switches to light */
        <svg
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="3.25" />
          <path
            d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M16 4l-1.4 1.4M5.4 14.6 4 16M16 16l-1.4-1.4M5.4 5.4 4 4"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
