import { readEnv } from "@/lib/env";

export const runtime = "nodejs";

const NAMES = ["GEMINI_API_KEY", "APP_SECRET", "INVITE_CODES"];

/**
 * Deployment diagnostics — reports which env vars are visible (presence only,
 * never values) from each source: process.env and the Cloudflare worker
 * context. `resolved` is what the app actually uses via readEnv().
 */
export async function GET() {
  const context = globalThis[Symbol.for("__cloudflare-context__")];
  return Response.json({
    marker: "health-v2",
    resolved: Object.fromEntries(NAMES.map((n) => [n, Boolean(readEnv(n))])),
    processEnv: Object.fromEntries(NAMES.map((n) => [n, Boolean(process.env[n])])),
    workerContext: {
      available: Boolean(context),
      env: Object.fromEntries(NAMES.map((n) => [n, Boolean(context?.env?.[n])])),
    },
  });
}
