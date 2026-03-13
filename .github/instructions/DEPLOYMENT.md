# AIDebate Hosting Guide (Recommended: Vercel + Render)

This guide shows the exact setup to host your app so other people can access it.

## Relevance Check (March 2026)

This approach is still relevant for the current repository and codebase.

Why it is currently correct:
- Frontend is a Vite app and deploys cleanly to Vercel.
- Backend is an Express service and maps directly to Render Web Service.
- Current code uses VITE_API_BASE_URL, CORS_ORIGIN, ALLOW_SERVER_FALLBACK, GEMINI_API_KEY, and PORT exactly as described.

Limitations to be aware of:
- This guide is optimized for fast launch, not full production operations.
- Supabase, Stripe, and advanced production controls need additional setup in Phase 2.

## Phase Ownership

Phase 1 must include:
- Public deploy of frontend and backend
- Correct CORS lock-down
- End-to-end hosted smoke test

Phase 2 should add:
- Staging and production environment separation
- Monitoring/alerting and incident visibility
- Backup/recovery and runbooks
- Cost guardrails and usage anomaly alerts

If Supabase Auth/Database are introduced in Phase 1 or Phase 2, keep this hosting model and add Supabase project env variables to both frontend and backend deployment settings.

## What you are deploying

- Frontend: Vite + React app, hosted on Vercel
- Backend: Express API in server/index.js, hosted on Render
- AI billing: Google Gemini API (users can bring their own key)

## Cost expectations

- Vercel Hobby: usually free for personal/small projects
- Render Web Service:
  - Free: available, but may sleep and cold-start
  - Paid: always-on plans start around the low single-digit USD/month range and up
- Gemini API: separate cost from Google; this can become your main cost at scale

## Before you start

1. Push your latest branch to GitHub.
2. Confirm local run works:
   - npm install
   - npm run server
   - npm run dev
3. Confirm these production-safe changes are in place:
   - Backend reads process.env.PORT
   - Frontend uses VITE_API_BASE_URL
   - CORS is controlled by CORS_ORIGIN

## 1) Deploy backend on Render

1. Sign in to Render and create a New Web Service.
2. Connect your GitHub repo and pick your branch.
3. Configure service:
   - Runtime: Node
   - Build Command: npm install
   - Start Command: node server/index.js
4. Set environment variables:
   - NODE_ENV=production
   - CORS_ORIGIN=https://YOUR-FRONTEND-URL.vercel.app
   - ALLOW_SERVER_FALLBACK=false
   - GEMINI_API_KEY=OPTIONAL (only if you want server fallback)
   - SUPABASE_URL=https://YOUR-PROJECT.supabase.co (same as VITE_SUPABASE_URL)
   - SUPABASE_ANON_KEY=YOUR-ANON-KEY (same as VITE_SUPABASE_ANON_KEY, required for usage limits)
   - STRIPE_SECRET_KEY=sk_live_... (from Stripe dashboard → Developers → API keys)
   - STRIPE_PRICE_ID=price_... (from Stripe dashboard → Products → your Pro plan price ID)
5. Deploy.
6. Copy your backend URL, for example:
   - https://your-api.onrender.com

Notes:
- ALLOW_SERVER_FALLBACK=false is recommended so your server key cannot be abused.
- If you set GEMINI_API_KEY and fallback true, your server can be billed by traffic using fallback.

## 2) Deploy frontend on Vercel

1. Sign in to Vercel and import the same GitHub repo.
2. Framework preset: Vite.
3. Build settings:
   - Install Command: npm install
   - Build Command: npm run build
   - Output Directory: dist
4. Add environment variable:
   - VITE_API_BASE_URL=https://your-api.onrender.com
5. Deploy.
6. Copy your frontend URL, for example:
   - https://your-app.vercel.app

## 3) Lock CORS to your frontend

1. Go back to Render service environment variables.
2. Set CORS_ORIGIN to your exact Vercel frontend origin.
3. Redeploy the backend.

If you later add a custom domain, update CORS_ORIGIN to that custom domain and redeploy.

## 4) Verify everything works

1. Open your Vercel frontend URL.
2. Enter a personal Gemini API key in the app UI.
3. Start a debate and verify responses are generated.
4. Optional: test voice/image features.

Success checklist:
- Frontend loads publicly
- API calls return 200 from Render
- No CORS errors in browser console
- User key works from hosted frontend

## Local development after hosting

Hosting does not break local testing.

Use the same local commands:
- npm run server
- npm run dev

Local behavior:
- Frontend dev mode falls back to http://localhost:3001 when VITE_API_BASE_URL is not set
- Backend defaults to port 3001 when PORT is not set

## Optional: custom domain setup

1. Buy a domain from any registrar.
2. Add domain to Vercel project and follow DNS instructions.
3. (Optional) Add domain/subdomain to Render service.
4. Update CORS_ORIGIN in Render to your final frontend domain.
5. Redeploy backend.

## Troubleshooting

### CORS error in browser

- Cause: CORS_ORIGIN does not exactly match your frontend origin
- Fix: set exact origin in Render env and redeploy

### 400 Gemini API key missing

- Cause: user did not provide key and server fallback is disabled
- Fix: enter personal key in UI, or enable fallback intentionally

### 401/403 from Gemini

- Cause: invalid or restricted API key
- Fix: generate a new Gemini key and retry

### API calls still hitting localhost in production

- Cause: VITE_API_BASE_URL not set on Vercel
- Fix: set VITE_API_BASE_URL to your Render URL and redeploy frontend

### Backend deploy works but frontend cannot reach it

- Cause: wrong API URL or backend sleeping/free-tier cold start
- Fix: verify URL, wait for spin-up, check Render logs

## Security recommendations

1. Keep ALLOW_SERVER_FALLBACK=false in production.
2. Keep CORS_ORIGIN strict to your frontend domain only.
3. Use HTTPS only (Vercel and Render provide this by default).
4. Add Google billing alerts and budget caps.
5. If usage grows, add backend rate limiting.

## Quick copy/paste env vars

### Render (backend)

- NODE_ENV=production
- CORS_ORIGIN=https://your-app.vercel.app
- ALLOW_SERVER_FALLBACK=false
- GEMINI_API_KEY=
- SUPABASE_URL=
- SUPABASE_ANON_KEY=
- STRIPE_SECRET_KEY=
- STRIPE_PRICE_ID=

### Vercel (frontend)

- VITE_API_BASE_URL=https://your-api.onrender.com
