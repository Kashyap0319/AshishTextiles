# 🚀 Vercel Deployment — CaratSense Frontend

## Quick deploy (5 minutes)

### Step 1 — Login to Vercel

Open a terminal in this folder and run:

```bash
cd "c:/Users/Shrey/OneDrive/Desktop/Surplus Stock/frontend"
vercel login
```

Choose **"Continue with GitHub"** (or email).
This opens browser → authorize → done.

### Step 2 — Deploy

```bash
vercel
```

Vercel CLI will ask:
1. **Set up and deploy?** → `Y`
2. **Which scope?** → choose your account
3. **Link to existing project?** → `N`
4. **Project name?** → `caratsense` (or whatever you like)
5. **In which directory is your code located?** → `./` (just hit enter)
6. **Want to modify settings?** → `N`

Wait ~60 seconds. You'll get a URL like `caratsense-xxxx.vercel.app` — **live!**

### Step 3 — Set environment variables

```bash
vercel env add NEXT_PUBLIC_API_URL
```

Paste backend URL when asked: `https://your-backend.up.railway.app/api/v1`
(Pick all environments: Production, Preview, Development)

OR in Vercel dashboard:
1. Go to https://vercel.com/dashboard
2. Open your project → Settings → Environment Variables
3. Add: `NEXT_PUBLIC_API_URL` = `https://your-backend-url/api/v1`

### Step 4 — Production deploy

```bash
vercel --prod
```

Now `caratsense.vercel.app` (or your custom domain) is **live in production**.

---

## Backend deployment (separate)

Frontend works **standalone** — has fallback to `real-data.json` when backend is down.
But for full features, deploy backend too:

### Option A — Railway (recommended, ₹500/month)

1. Go to https://railway.app → New Project → Deploy from GitHub
2. Push backend folder to GitHub first:
   ```bash
   cd "c:/Users/Shrey/OneDrive/Desktop/Surplus Stock/backend"
   git init && git add . && git commit -m "Initial backend"
   gh repo create caratsense-backend --private --source=. --push
   ```
3. Railway auto-detects FastAPI
4. Add environment variables:
   - `DATABASE_URL` = (Supabase PostgreSQL URL — already in your local .env)
   - `GEMINI_API_KEY` = your key
   - `SECRET_KEY` = (generate new random 64-char string)
5. Once deployed → copy the Railway URL → update Vercel's `NEXT_PUBLIC_API_URL`

### Option B — Render (free tier, sleeps after 15min)

1. https://render.com → New Web Service → Connect GitHub
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

## Custom domain (optional)

After deployment, in Vercel dashboard:
1. Project → Settings → Domains
2. Add your domain (e.g. `erp.tdmfabrics.com` or `caratsense.in`)
3. Update DNS records as Vercel instructs (CNAME or A record)
4. SSL auto-provisions in 5-10 min

---

## What works without backend

If you deploy ONLY the frontend, these features still work:
- ✅ Landing page
- ✅ Login UI (just the form, won't actually authenticate)
- ✅ Dashboard with real data from `real-data.json` (5,734 stocks, 742 buyers, etc.)
- ✅ All UI navigation, filters, animations
- ✅ Stock classification, color filters, warehouse SVG floor plans

What needs backend:
- ❌ Login auth + JWT
- ❌ AI Chat (Gemini)
- ❌ Real-time stock CRUD
- ❌ Sales approval workflow
- ❌ Inquiries & notifications
- ❌ WooCommerce sync

**For demo to Ashish:** Frontend-only deployment is fine — looks great with real data.

---

## Quick redeploy

After making code changes:

```bash
cd "c:/Users/Shrey/OneDrive/Desktop/Surplus Stock/frontend"
vercel --prod
```

That's it. ~60 seconds and updates are live.
