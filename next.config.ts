import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The static welcome page (public/welcome.html) is the entry point at "/".
  // The map workspace, including all staff tools, lives at /explore.
  async rewrites() {
    return [{ source: "/", destination: "/welcome.html" }];
  },
  async redirects() {
    return [
      { source: "/welcome", destination: "/", permanent: false },
      { source: "/staff", destination: "/explore?signin=1", permanent: false },
    ];
  },
};

export default nextConfig;
