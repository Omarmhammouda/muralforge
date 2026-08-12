# MuralForge

The operating system for mural businesses: manage clients and projects, create
realistic mural mockups (AI generation + perspective overlay studio), and build
professional, fully branded proposals with pricing, timelines, and PDF export.

- **Framework:** Next.js 15 (App Router)
- **Data:** local-first — clients, projects, proposals, and templates live in the
  browser (localStorage + IndexedDB for images), architected entity-per-store so a
  multi-tenant database backend can slot in without a rewrite
- **AI generation:** Google Gemini image model (`gemini-2.5-flash-image`) via your
  own API key (~4¢/mockup), wrapped in a scene-preservation prompt contract
  (`lib/mural-prompt.js`) so walls get painted, not redrawn
- **Overlay studio:** four-point perspective compositing (`lib/warp.js`) with
  blend modes and image adjustments, exported through canvas
- **Access control (AI route):** 3 free generations per visitor (signed cookie) +
  invite codes with per-code allowances (`INVITE_CODES` env var)
- **White-label:** company branding in Settings drives every exported proposal —
  the platform never appears on client-facing documents unless enabled

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
