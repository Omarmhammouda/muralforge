import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cookie-signed usage quota + invite codes — no database needed for v1.
 *
 * FREE_QUOTA mockups per visitor (HMAC-signed cookie), and invite codes set
 * via the INVITE_CODES env var as "code:allowance" pairs, e.g.:
 *   INVITE_CODES="laila:50,studio:200,demo:10"
 * A visitor who enters a valid code generates against that code's allowance
 * (tracked in the same signed cookie).
 */

export const FREE_QUOTA = 3;
const COOKIE_NAME = "mf_quota";

function secret() {
  const value = process.env.APP_SECRET;
  if (!value) throw new Error("APP_SECRET env var is not set");
  return value;
}

function sign(payload) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function parseInviteCodes() {
  const raw = process.env.INVITE_CODES || "";
  const codes = new Map();
  for (const entry of raw.split(",")) {
    const [code, allowance] = entry.split(":").map((part) => (part || "").trim());
    const parsed = Number.parseInt(allowance ?? "", 10);
    if (code && Number.isFinite(parsed) && parsed > 0) codes.set(code, parsed);
  }
  return codes;
}

export function readQuota(cookieValue) {
  const fallback = { used: 0, codeUsed: {} };
  if (!cookieValue) return fallback;
  const separator = cookieValue.lastIndexOf(".");
  if (separator < 0) return fallback;
  const payload = cookieValue.slice(0, separator);
  const signature = cookieValue.slice(separator + 1);
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return fallback;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return {
      used: Number.isFinite(parsed.used) ? parsed.used : 0,
      codeUsed: parsed.codeUsed && typeof parsed.codeUsed === "object" ? parsed.codeUsed : {},
    };
  } catch {
    return fallback;
  }
}

export function writeQuota(state) {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function quotaCookieName() {
  return COOKIE_NAME;
}

/**
 * Decide whether this request may generate, and produce the next cookie state.
 * Returns { allowed, reason?, next, remaining, tier }.
 */
export function consumeGeneration(state, inviteCode) {
  const codes = parseInviteCodes();
  if (inviteCode && codes.has(inviteCode)) {
    const allowance = codes.get(inviteCode);
    const used = Number.isFinite(state.codeUsed[inviteCode]) ? state.codeUsed[inviteCode] : 0;
    if (used >= allowance) {
      return { allowed: false, reason: "code_exhausted", next: state, remaining: 0, tier: "code" };
    }
    const next = { ...state, codeUsed: { ...state.codeUsed, [inviteCode]: used + 1 } };
    return { allowed: true, next, remaining: allowance - used - 1, tier: "code" };
  }
  if (inviteCode) {
    return { allowed: false, reason: "code_invalid", next: state, remaining: 0, tier: "code" };
  }
  if (state.used >= FREE_QUOTA) {
    return { allowed: false, reason: "free_exhausted", next: state, remaining: 0, tier: "free" };
  }
  const next = { ...state, used: state.used + 1 };
  return { allowed: true, next, remaining: FREE_QUOTA - state.used - 1, tier: "free" };
}
