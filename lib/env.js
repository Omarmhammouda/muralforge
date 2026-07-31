/**
 * Env reader that works in both runtimes.
 *
 * Locally (`next dev`) values live on process.env. On Cloudflare Workers via
 * OpenNext, secrets live on the per-request Cloudflare context and are only
 * copied into process.env when the worker's nodejs_compat_populate_process_env
 * compatibility flag is on — which auto-generated builds may not enable. Read
 * both so the app works regardless.
 */
export function readEnv(name) {
  const fromProcess = typeof process !== "undefined" ? process.env?.[name] : undefined;
  if (fromProcess) return fromProcess;
  const context = globalThis[Symbol.for("__cloudflare-context__")];
  const value = context?.env?.[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
