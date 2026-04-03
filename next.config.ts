import type { NextConfig } from 'next';
import withPWA from '@ducanh2912/next-pwa';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  serverExternalPackages: ['three'],

  // Allow LAN dev access
  allowedDevOrigins: ['192.168.100.66'],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: 'drugs.com' },
      { protocol: 'https', hostname: 'drugbank.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.up.railway.app' },
    ],
  },

  turbopack: {},

  // Must be this app root on Vercel; `../..` resolves incorrectly and breaks the deploy step.
  // For a local monorepo layout, set NEXT_OUTPUT_FILE_TRACING_ROOT to the workspace root.
  outputFileTracingRoot: process.env.NEXT_OUTPUT_FILE_TRACING_ROOT
    ? path.resolve(process.env.NEXT_OUTPUT_FILE_TRACING_ROOT)
    : path.resolve(__dirname),

  experimental: {},

  /**
   * Proxy API routes (browser stays same-origin; avoids CORS on GraphQL).
   * Backend serves `/graphql`, `/health`, `/health/live` on `API_PROXY_TARGET`.
   */
  async rewrites() {
    const target =
      process.env.API_PROXY_TARGET?.trim() ||
      process.env.NEXT_PUBLIC_API_URL?.trim() ||
      'http://127.0.0.1:4000';
    const base = target.replace(/\/$/, '');
    return [
      { source: '/api/graphql', destination: `${base}/graphql` },
      { source: '/api/health', destination: `${base}/health` },
      { source: '/api/health/live', destination: `${base}/health/live` },
    ];
  },
};

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /\/api\/graphql$/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'graphql-cache',
          networkTimeoutSeconds: 10,
          expiration: { maxEntries: 50, maxAgeSeconds: 300 },
        },
      },
      {
        urlPattern: /\.(png|jpg|jpeg|webp|svg|gif)$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'product-images',
          expiration: { maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
    ],
  },
})(nextConfig);
