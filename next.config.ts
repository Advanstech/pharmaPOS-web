import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

/** Monorepo root (pnpm-workspace.yaml) — avoids Turbopack picking a stray lockfile higher in the tree. */
const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['three'],
  turbopack: {
    root: monorepoRoot,
  },
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
  experimental: {},

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

export default nextConfig;
