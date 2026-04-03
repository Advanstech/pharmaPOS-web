# PharmaPOS Web ↔ API team handoff

This document summarizes what the **Next.js web app** (`PharmaPOS-web`) expects from the **GraphQL API** (e.g. Railway) so both sides stay aligned. Share this with backend engineers.

**Official product API reference (GraphQL surfaces, auth, AI, errors):** see [DEVELOPER_API_REFERENCE.md](./DEVELOPER_API_REFERENCE.md), including **PharmaPOS Web (this repo) — alignment** for how illustrative examples map to `src/lib/graphql/` operations.

---

## 1. Environments, proxy, and CORS

| Item | Detail |
|------|--------|
| **Frontend** | Next.js on Vercel (e.g. `https://<project>.vercel.app`). App routes: `/login`, `/pos`, `/dashboard`, etc. |
| **API** | Same as local dev: backend base URL (e.g. `https://*.up.railway.app` or `http://127.0.0.1:4000`). The API owns **`/graphql`**, **`/health`**, **`/health/live`** on that host. |
| **Browser → GraphQL HTTP** | The SPA calls **same-origin** `https://<vercel>/api/graphql`. Next.js **rewrites** that to `{API_PROXY_TARGET}/graphql` (same idea as dev: browser → Next :3000 → API :4000). **No browser CORS** required for GraphQL POST. |

**Vercel env:** set **`API_PROXY_TARGET`** to the API base (no `/graphql`), e.g. `https://happy-happiness-production-fd76.up.railway.app`.

**Optional rewrites** (same `API_PROXY_TARGET`): `/api/health` → `/health`, `/api/health/live` → `/health/live` so the UI can probe health same-origin if needed.

**WebSocket (subscriptions):** Still a **direct** `wss://…/graphql` from the browser unless you add a WS proxy. Set **`NEXT_PUBLIC_WS_URL`** or **`NEXT_PUBLIC_API_URL`** (public base) for WS, and ensure the API allows that **Origin** for the upgrade if required.

---

## 2. Auth and role claims

The web app stores the logged-in user from `login` / `me` with:

- `id`, `name`, `email` (optional), **`role`**, **`branch_id`**

**Expected `role` values** (lowercase snake_case, stable across login responses):

`owner` · `se_admin` · `manager` · `head_pharmacist` · `pharmacist` · `technician` · `cashier` · `chemical_cashier`

The UI **normalizes** minor casing/whitespace variants, but the API should **emit** consistent lowercase snake_case in JWT claims and GraphQL user objects so RBAC stays predictable.

---

## 3. GraphQL operations the web app uses

### 3.1 `recentSales(limit: Float)`

- Used on **POS dashboard**, **Sales / transactions** page, and **cart** refetch.
- **Expectation:** Return recent **completed** sales for the **branch** (and visibility rules per role: e.g. cashiers see own sales; owner/manager see branch-wide).
- **Fields used:** `id`, `branchId`, `branchName`, `cashierId`, `cashierName`, `totalPesewas`, `vatPesewas`, `status`, `soldAt`, `createdAt`, line items with `productName`, `classification`, `supplierName`, `stockStatus`, quantities, etc.

**Note:** There is **no** server-side filter for date range or filters on this query today; the web app loads **up to 60** rows and filters **client-side** for the Transactions UI. If payloads grow, consider adding optional filters (date range, branch, cashier) on the API.

---

### 3.2 `sale(id: ID!)` (sale detail)

- Used for **transaction detail** and **reprint receipt**.
- Must return full line items and totals consistent with `recentSales`.

---

### 3.3 Reports dashboard (`reports.queries.ts`)

Query shape (names may match your schema):

- `revenueReport(periodStart, periodEnd)` → current and previous window aggregates.
- `topProducts(periodStart, periodEnd, limit)` → top products.

**Date semantics:** The web app sends **`periodStart` / `periodEnd` as `YYYY-MM-DD` strings in the Africa/Accra calendar** (not UTC midnight labels that drift from local business days).

**Expectation:** Revenue and top products for **that branch** (from JWT / context) for the **inclusive** Accra date range, or document if your API interprets them as UTC.

If `owner` / `manager` sees **zeros** while sales exist, verify:

- Resolver scopes by **branch** correctly.
- Role is allowed to read **`revenueReport`** / **`topProducts`**.
- Date boundaries match how sales are stored (Accra vs UTC).

---

### 3.4 Staff: `listStaff(branchId: ID)`

- The web app calls **`listStaff`** with **`branchId` set to the logged-in user’s `branch_id`** when present.
- **Expectation:** Return all staff for that branch (roles, duty flags, profile fields) for **owner, se_admin, manager** per your RBAC.

If the resolver ignores `branchId` or requires a different argument for org-wide admins, document it so the client can be adjusted.

---

### 3.5 Other staff mutations / queries

Used as implemented in `src/lib/graphql/dashboard.queries.ts` (invite, deactivate, reset password, session history, etc.). Ensure **role guards** match the product (e.g. only owner/manager can invite).

---

## 4. REST / health (optional)

- `GET /health` is **not** subject to browser CORS rules the same way as GraphQL POST; use it for ops checks only.

---

## 5. Suggested API backlog (optional improvements)

| Priority | Item |
|----------|------|
| Medium | Add **optional** `branchId`, `from`, `to`, `cashierId` on `recentSales` (or a dedicated `salesSearch`) to reduce payload size and support server-side filtering. |
| Medium | Confirm **reports** resolvers use the same **branch + Accra date** rules as finance. |
| Low | Document **JWT** payload fields (`sub`, `role`, `branch_id`, expiry) for the web app’s Apollo auth link. |

---

## 6. Contact

Frontend repo: **PharmaPOS-web** — GraphQL documents live under `src/lib/graphql/`.  
Update this file when the API contract changes so both teams stay in sync.
