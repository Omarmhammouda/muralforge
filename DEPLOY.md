# Putting MuralForge on your own URL — the 15-minute path

Four steps: GitHub → Vercel → two keys → your domain. No terminal needed.

## 1. Put the code on GitHub (5 min)

1. Sign in at github.com → **New repository** → name it `muralforge`, keep it **Private** → Create.
2. On the empty repo page, click **"uploading an existing file"**.
3. Drag ALL the files/folders from this project folder into the upload box
   (`app`, `lib`, `package.json`, `next.config.mjs`, `jsconfig.json`, `.gitignore`,
   `.env.example`, `README.md`, `DEPLOY.md`) → **Commit changes**.

## 2. Deploy on Vercel (3 min)

1. Sign in at vercel.com **with your GitHub account** → **Add New → Project**.
2. Pick the `muralforge` repo → framework auto-detects as Next.js → **Deploy**.
3. First deploy will build and give you `muralforge-xxxx.vercel.app`. It won't
   generate yet — it needs the two keys.

## 3. Add the two keys (4 min)

In the Vercel project → **Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `GEMINI_API_KEY` | From **aistudio.google.com** → sign in with any Google account → **Get API key** → Create API key → copy. (Google bills ~4¢ per generated mockup; new accounts include free credit.) |
| `APP_SECRET` | Any long random string — e.g. from **generate-secret.vercel.app/32** |
| `INVITE_CODES` | Optional — `code:allowance` pairs like `laila:50,studio:200`. Visitors without a code get 3 free mockups. |

Then **Deployments → ⋯ on the latest → Redeploy** so the keys take effect.
Test: open the site, upload a wall photo, describe a mural, Generate.

## 4. Attach your domain (3 min)

- In the Vercel project → **Settings → Domains** → add `muralforge.omhstudios.com`
  (or whatever address you want).
- Vercel shows you one DNS record (a CNAME to `cname.vercel-dns.com`).
  Add it wherever omhstudios.com's DNS lives (GoDaddy / Namecheap / Cloudflare →
  DNS → Add record → CNAME, name `muralforge`, value `cname.vercel-dns.com`).
- Wait a few minutes — Vercel provisions HTTPS automatically. Done: MuralForge
  is live on your URL.

## Running costs

- Vercel: free tier is plenty to start.
- Gemini: ~4¢ per mockup, billed to your Google account — 3 free per visitor
  plus whatever invite allowances you hand out are the only spend levers.
- No database, no other services.

## Later upgrades (when you want them)

- **Charge users:** add Stripe payment links that email buyers an invite code —
  zero code changes, just add codes to `INVITE_CODES`.
- **Real accounts:** swap invite codes for Google sign-in + a database
  (Vercel Postgres) — I can build that as v2.
- **Harder abuse limits:** add Vercel KV for per-IP daily caps.
