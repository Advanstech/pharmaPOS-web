# Local Development Setup Guide

## Quick Start

### 1. Environment Configuration

The web app needs to know where the GraphQL API is located. This is configured in `web/.env.local`.

**Default Configuration** (Production API):
```bash
API_PROXY_TARGET=https://happy-happiness-production-fd76.up.railway.app
NEXT_PUBLIC_API_URL=https://happy-happiness-production-fd76.up.railway.app/graphql
NEXT_PUBLIC_WS_URL=wss://happy-happiness-production-fd76.up.railway.app/graphql
```

This connects your local web app to the **live production API** on Railway.

---

## Development Scenarios

### Scenario 1: Frontend Development (Use Production API)

**When to use**: You're working on UI/UX and don't need to modify the API.

**Setup**: ✅ Already configured (default)

**Steps**:
```bash
cd web
npm run dev
```

Your web app will connect to the production API. No need to run the API locally.

---

### Scenario 2: Full Stack Development (Use Local API)

**When to use**: You're modifying both frontend and backend.

**Setup**:

1. **Edit `web/.env.local`**:
   ```bash
   # Comment out production API
   # API_PROXY_TARGET=https://happy-happiness-production-fd76.up.railway.app
   
   # Uncomment local API
   API_PROXY_TARGET=http://127.0.0.1:4000
   
   # Update public URLs
   NEXT_PUBLIC_API_URL=http://127.0.0.1:4000/graphql
   NEXT_PUBLIC_WS_URL=ws://127.0.0.1:4000/graphql
   ```

2. **Start the API server** (in a separate terminal):
   ```bash
   cd api
   npm run dev
   ```
   
   The API should start on `http://127.0.0.1:4000`

3. **Start the web app**:
   ```bash
   cd web
   npm run dev
   ```

---

## Troubleshooting

### Error: `ECONNREFUSED 127.0.0.1:4000`

**Problem**: The web app is trying to connect to a local API that isn't running.

**Solutions**:

1. **Use Production API** (Recommended for frontend work):
   - Edit `web/.env.local`
   - Set `API_PROXY_TARGET=https://happy-happiness-production-fd76.up.railway.app`
   - Restart Next.js: `npm run dev`

2. **Start Local API** (For full stack development):
   - Open a new terminal
   - `cd api`
   - `npm run dev`
   - Wait for "Server ready at http://127.0.0.1:4000/graphql"
   - Restart Next.js

### Error: GraphQL queries fail

**Check**:
1. Is the API server running? (Check terminal or visit http://127.0.0.1:4000/health)
2. Is `API_PROXY_TARGET` set correctly in `.env.local`?
3. Did you restart Next.js after changing `.env.local`?

### Error: CORS issues

**Solution**: The Next.js proxy should handle CORS automatically. If you see CORS errors:
- Make sure you're using `/api/graphql` (proxied) not the direct API URL
- Check that `next.config.ts` has the rewrite rules
- Restart Next.js

---

## Environment Variables Reference

### Server-Side Only (Not exposed to browser)

| Variable | Purpose | Example |
|----------|---------|---------|
| `API_PROXY_TARGET` | API base URL for Next.js rewrites | `https://happy-happiness-production-fd76.up.railway.app` |

### Client-Side (Exposed to browser)

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | GraphQL HTTP endpoint | `https://happy-happiness-production-fd76.up.railway.app/graphql` |
| `NEXT_PUBLIC_WS_URL` | GraphQL WebSocket endpoint | `wss://happy-happiness-production-fd76.up.railway.app/graphql` |

---

## How the Proxy Works

```
Browser Request:
  POST /api/graphql
    ↓
Next.js Server (localhost:3000):
  Rewrites to → ${API_PROXY_TARGET}/graphql
    ↓
API Server:
  Production: https://happy-happiness-production-fd76.up.railway.app/graphql
  Local: http://127.0.0.1:4000/graphql
```

**Benefits**:
- No CORS issues (same-origin requests)
- Can switch between local/production easily
- Secure (API keys stay on server)

---

## Recommended Workflow

### For Frontend Developers:
1. Use production API (default `.env.local`)
2. Focus on UI/UX
3. No need to run API locally

### For Backend Developers:
1. Run API locally
2. Update `.env.local` to point to `http://127.0.0.1:4000`
3. Test API changes with web UI

### For Full Stack Features:
1. Start API locally
2. Update `.env.local` to local API
3. Develop both frontend and backend
4. Test integration

---

## Quick Commands

```bash
# Start web app (production API)
cd web && npm run dev

# Start web app + local API (two terminals)
# Terminal 1:
cd api && npm run dev

# Terminal 2:
cd web && npm run dev

# Check API health
curl http://127.0.0.1:4000/health
# or
curl https://happy-happiness-production-fd76.up.railway.app/health
```

---

## Next Steps

After fixing the connection:
1. Visit http://localhost:3000
2. Login with your credentials
3. Test Phase 1 & 2 features:
   - Invoice OCR: `/dashboard/invoices/upload`
   - Staff Expenses: `/dashboard/expenses`

---

**Last Updated**: April 10, 2026
