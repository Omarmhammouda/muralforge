# MuralForge — standalone

Upload a wall photo, describe the mural, get a photoreal mockup painted onto that
exact wall. Built for OMH Studios.

- **Framework:** Next.js 15 (App Router), no database needed for v1
- **Generation:** Google Gemini image model (`gemini-2.5-flash-image`) via your own API key (~4¢/mockup)
- **Access control:** 3 free mockups per visitor (signed cookie) + invite codes with per-code allowances (`INVITE_CODES` env var)
- **The edge:** every request is wrapped in a scene-preservation prompt contract (`lib/mural-prompt.js`) so walls get painted, not redrawn

## Local run

```bash
npm install
cp .env.example .env.local   # fill in GEMINI_API_KEY and APP_SECRET
npm run dev
```

## Deploy

Live at **muralforge.com** — GitHub → Cloudflare Workers (OpenNext), auto-deploys
on every push to `main`. See `DEPLOY.md` for the wiring, env secrets, and the
`/api/health` diagnostics endpoint.
