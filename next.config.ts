import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Product imagery is served from /public as SVG, so no remote image hosts
  // need to be allow-listed.
  poweredByHeader: false,
};

export default nextConfig;
