import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

/** Monorepo root (pnpm-workspace.yaml) — avoids Turbopack picking a stray lockfile higher in the tree. */
const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // ── Performance Optimizations ──────────────────────────────────────────────
  
  // Turbopack configuration for maximum speed
  turbopack: {
    root: monorepoRoot,
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console logs in production for smaller bundles
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Server-side external packages (don't bundle these)
  serverExternalPackages: ['three', 'sharp'],
  
  // ── Image Optimization ─────────────────────────────────────────────────────
  
  images: {
    // Modern image formats for better performance
    formats: ['image/avif', 'image/webp'],
    
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    
    // Image sizes for different breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // Remote patterns for external images
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: 'drugs.com' },
      { protocol: 'https', hostname: 'drugbank.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.up.railway.app' },
    ],
    
    // Minimize layout shift with placeholder
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // ── Security Headers ───────────────────────────────────────────────────────
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
        ],
      },
      {
        // Cache static assets aggressively
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // ── API Proxy for GraphQL ──────────────────────────────────────────────────
  
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
  
  // ── Development Configuration ──────────────────────────────────────────────
  
  allowedDevOrigins: ['192.168.100.66'],
  
  // ── Experimental Features ──────────────────────────────────────────────────
  
  experimental: {
    // Enable optimized font loading
    optimizeServerReact: true,
    
    // Parallel route prefetching for faster navigation
    parallelServerCompiles: true,
    
    // Faster server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
    
    // Optimize package imports
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
    ],
  },
  
  // ── Production Optimizations ───────────────────────────────────────────────
  
  // Compress responses
  compress: true,
  
  // Generate ETags for caching
  generateEtags: true,
  
  // Power by header (disable for security)
  poweredByHeader: false,
  
  // Production source maps (disable for smaller bundles)
  productionBrowserSourceMaps: false,
};

export default nextConfig;
