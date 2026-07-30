# MuralForge on muralforge.com — Cloudflare + GitHub

How the live site is wired, and everything needed to operate it.

## The pipeline

GitHub repo (`Omarmhammouda/muralforge`, branch `main`)
→ Cloudflare Workers Builds (Next.js via OpenNext)
→ **muralforge.com**

Every push to `main` triggers an automatic build and deploy. A build takes
roughly 2–5 minutes; until it finishes, the previous deployment keeps serving.

## Environment variables — the part that bites

The app needs three values at runtime. They live in the Cloudflare dashboard:
**Workers & Pages → muralforge → Settings → Variables and Secrets**.

| Name | What it is |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio key (billing must be enabled — the free tier has zero image quota) |
| `APP_SECRET` | Long random string that signs the usage-quota cookie |
| `INVITE_CODES` | `code:allowance` pairs, e.g. `laila:50,studio:200,owner:unlimited` |

**Always save them with type "Secret", never "Text".** Plain-text variables
added in the dashboard are wiped by the next git deploy; Secrets survive
every deploy. This is Cloudflare behavior, not ours, and it is the #1 cause
of a sudden "Server is missing GEMINI_API_KEY" on the live site.

Changing a secret takes effect on its own — no rebuild needed.

## Checking a deployment

`https://muralforge.com/api/health` reports what the running worker sees:

```json
{ "marker": "health-v1", "env": { "GEMINI_API_KEY": true, "APP_SECRET": true, "INVITE_CODES": true } }
```

- Any `false` → that secret is missing on the worker serving the domain.
- Homepage HTML instead of JSON → the deployment serving the domain predates
  this endpoint; check the build status in the dashboard.

Build logs live in **Workers & Pages → muralforge → Deployments** (or the
Builds tab). The domain mapping is under **Settings → Domains & Routes**.

## Running costs

- Cloudflare: free tier is plenty to start.
- Gemini: ~4¢ per mockup, billed to the Google account behind the API key.
  Spend is capped by the quota system: 3 free per visitor plus whatever
  invite allowances are handed out.
- No database, no other services.

## Later upgrades (when wanted)

- **Charge users:** Stripe payment links that email buyers an invite code —
  zero code changes, just add codes to `INVITE_CODES`.
- **Real accounts:** swap invite codes for Google sign-in + a database.
- **Harder abuse limits:** Cloudflare KV for per-IP daily caps.
