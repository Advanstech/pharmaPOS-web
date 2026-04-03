# PharmaPOS Pro — Web

Next.js 16 PWA frontend. Runs on port 3000.

## Quick Start

```bash
cp .env.example .env.local   # set API URLs
pnpm install
pnpm dev                     # http://localhost:3000
```

## Environment Variables

Create `.env.local` (never commit it):

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000/graphql
```

For production point these at your deployed API URL.

## Test Credentials

Same accounts as the API seed. Use these to log in at `/login`:

| Role | Email | Password |
|------|-------|----------|
| se_admin (ROOT) | root@advansis.io | AdvansisMaster#1 |
| owner | owner@azzaypharmacy.com | PharmaPOS@2025! |
| manager | manager@azzaypharmacy.com | PharmaPOS@2025! |
| head_pharmacist | head.pharmacist@azzaypharmacy.com | PharmaPOS@2025! |
| pharmacist | pharmacist@azzaypharmacy.com | PharmaPOS@2025! |
| technician | technician@azzaypharmacy.com | PharmaPOS@2025! |
| cashier | cashier@azzaypharmacy.com | PharmaPOS@2025! |
| chemical_cashier | chemical.cashier@azzaypharmacy.com | PharmaPOS@2025! |

> API must be running and seeded first — see `apps/api/README.md`

## Scripts

```bash
pnpm dev            # Turbopack dev server
pnpm build          # production build
pnpm start          # serve production build
pnpm lint           # ESLint
pnpm test           # Vitest unit tests (single run)
pnpm test:watch     # Vitest watch mode
pnpm test:coverage  # Vitest + coverage report
pnpm test:e2e       # Playwright E2E tests
```

## Page Map

| Route | Description | Min Role |
|-------|-------------|----------|
| `/` | Redirects to `/login` | — |
| `/login` | Email/password login | — |
| `/pos` | POS terminal (60/40 layout) | cashier |
| `/dashboard` | Main hub | manager |
| `/dashboard/inventory` | Stock levels, reorder | manager |
| `/dashboard/reports` | Report generation | manager |
| `/dashboard/staff` | User management | manager |
| `/dashboard/compliance` | Ghana FDA status | head_pharmacist |
| `/dashboard/audit` | Audit log viewer | owner |
| `/dashboard/cfo` | Financial intelligence | owner |
| `/dashboard/billing` | Subscription & billing | owner |

## Architecture Notes

- App Router only — no `pages/` directory
- Server Components by default; `'use client'` only where needed
- Apollo Client: HTTP for query/mutation, WebSocket for subscriptions
- Zustand stores: `auth.store.ts`, `cart.store.ts`
- Offline: Dexie (IndexedDB) for cart persistence + product catalogue cache
- Animations: Framer Motion (spring physics), GSAP (complex timelines), React Three Fiber (3D tilt on product cards)
- Smooth scroll: Lenis on all scrollable pages
- PWA: `@ducanh2912/next-pwa` with service worker, offline GraphQL cache

## Standalone Usage

This app is fully self-contained. Copy the `apps/web` folder to any machine:

```bash
pnpm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL
pnpm dev
```

No monorepo or other apps required.
