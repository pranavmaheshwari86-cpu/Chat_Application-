import withPWAInit from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  output: "standalone",
  turbopack: {},
  transpilePackages: ['@chat/shared'],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
    ],
  },
  async headers() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://server-production-373b.up.railway.app/api';
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || apiUrl.replace('http', 'ws');
    
    // Extract base origins for CSP
    const apiOrigin = new URL(apiUrl).origin;
    const socketOrigin = new URL(socketUrl).origin;

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data: https://res.cloudinary.com https://lh3.googleusercontent.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ${apiOrigin} ${socketOrigin} https://res.cloudinary.com;`,
          },
        ],
      },
    ];
  },
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

export default process.env.NODE_ENV === "development" ? nextConfig : withPWA(nextConfig as any);
