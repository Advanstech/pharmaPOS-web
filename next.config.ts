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

  // Anchor output file tracing to the monorepo root so Turbopack doesn't
  // walk past it and pick up ~/package-lock.json as the workspace root
  outputFileTracingRoot: path.resolve(__dirname, '../..'),

  experimental: {},

  /** Proxy GraphQL so the browser hits the Next origin (fixes LAN / phone dev vs localhost API). */
  async rewrites() {
    const target = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:4000';
    const base = target.replace(/\/$/, '');
    return [{ source: '/api/graphql', destination: `${base}/graphql` }];
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
        urlPattern: /^https?:\/\/.*\/graphql/,
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
