import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static welcome page lives in public/welcome.html.
  async rewrites() {
    return [{ source: "/welcome", destination: "/welcome.html" }];
  },
};

export default nextConfig;
