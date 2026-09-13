import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    proxyClientMaxBodySize: "110mb",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nfbcoawizzpvuzdzpszy.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Needed to run the brand logo SVGs (public/brand-logos) through
    // next/image — off by default since an SVG can carry a script,
    // but these are our own trusted static assets, not user uploads.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;