import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // This generated filename identifies fixed content. Publish replacement
        // videos under a NEW filename; old installed kiosks still use this URL.
        source: "/gemini_generated_video_77009492.mp4",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // Never let an uploaded file be interpreted as anything but its declared type.
        source: "/uploads/:path*",
        headers: [{ key: "X-Content-Type-Options", value: "nosniff" }],
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      // Photos uploaded after the last deploy aren't in /public yet — serve
      // them from storage until the next build includes them.
      fallback: [{ source: "/uploads/:name", destination: "/api/media/:name" }],
    };
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.ichattiesburg.org" },
    ],
  },
};

export default nextConfig;
