import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const STATIC_ROUTES = [
  '/',
  '/login',
  '/pos',
  '/dashboard',
  '/dashboard/accounting',
  '/dashboard/audit',
  '/dashboard/billing',
  '/dashboard/cfo',
  '/dashboard/compliance',
  '/dashboard/customers',
  '/dashboard/dispensing',
  '/dashboard/inventory',
  '/dashboard/market-intelligence',
  '/dashboard/prescriptions',
  '/dashboard/pricing',
  '/dashboard/reports',
  '/dashboard/settings',
  '/dashboard/staff',
  '/dashboard/suppliers',
  '/dashboard/transactions',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return STATIC_ROUTES.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path.startsWith('/dashboard') ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : path === '/pos' ? 0.9 : 0.8,
  }));
}
