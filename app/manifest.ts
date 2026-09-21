import type { MetadataRoute } from "next";

/**
 * PWA web manifest (spec §14 / Stage 10). No custom icons exist yet (public/
 * holds only the starter SVGs), so `icons` is intentionally omitted rather
 * than pointing at files that do not exist — add them at launch (Stage 11).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mosisa Barber Shop",
    short_name: "Mosisa",
    description:
      "Classic cuts, honest craft. Book your next appointment at Mosisa Barber Shop — Harar.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0c0b",
    theme_color: "#0b0c0b",
  };
}
