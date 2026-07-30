export const runtime = "nodejs";

/**
 * Deployment diagnostics — reports which env vars the running server can see
 * (presence only, never values) plus a marker to identify the deployed build.
 */
export async function GET() {
  return Response.json({
    marker: "health-v1",
    env: {
      GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY),
      APP_SECRET: Boolean(process.env.APP_SECRET),
      INVITE_CODES: Boolean(process.env.INVITE_CODES),
    },
    envKeyCount: Object.keys(process.env).length,
  });
}
