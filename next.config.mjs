/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Up to 10 photos per upload at the new 50 MB-per-photo cap
    // means a single request can approach 500 MB — this has to
    // clear that with room to spare, or uploads would fail at the
    // platform level even though each individual file passes.
    proxyClientMaxBodySize: "550mb",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nfbcoawizzpvuzdzpszy.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Thumbnails for delivery videos hosted as YouTube links
        // instead of Supabase Storage files (see lib/youtube.ts).
        protocol: "https",
        hostname: "i.ytimg.com",
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
