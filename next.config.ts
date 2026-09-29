import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{
      // This generated filename identifies fixed content. Publish replacement
      // videos under a NEW filename; old installed kiosks still use this URL.
      source: "/gemini_generated_video_77009492.mp4",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.ichattiesburg.org" },
    ],
  },
};

export default nextConfig;
