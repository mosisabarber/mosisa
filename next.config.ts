import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Vercel Blob hosts barber photos (spec §14). Blob URLs look like:
    //   https://<store-id>.public.blob.vercel-storage.com/<path>
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
    // Next 16 lets you cap the generated AVIF/WebP quality set (smaller
    // variants on disk). Keep 2: default + one lower for thumbnails.
    qualities: [75, 90],
  },
};

export default nextConfig;
