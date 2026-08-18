"use client";

/**
 * Entitlement engine — answers "can this account do X right now?" from the
 * plan config (lib/plans.js) + billing state (store). All limits come from
 * config; nothing is hard-coded here. Data is never deleted at a limit — we
 * block the premium action and offer the upgrade instead.
 */

import { PLANS } from "./plans";
import { actions, getState, usagePeriodKey } from "./store";

/** Subscription period end (renewal or lapse date). Null on free. */
export function periodEnd(billing) {
  if (!billing.periodStart || billing.plan === "free") return null;
  // A canceled/downgraded subscription lapses at the boundary promised at
  // cancel time, even once that date is in the past.
  if (billing.cancelEffectiveAt) return new Date(billing.cancelEffectiveAt);
  const end = new Date(billing.periodStart);
  const yearly = billing.interval === "yearly" || billing.plan === "founding";
  // Advance whole periods until the date is in the future (handles old anchors).
  while (end <= new Date()) {
    if (yearly) end.setFullYear(end.getFullYear() + 1);
    else end.setMonth(end.getMonth() + 1);
  }
  return end;
}

/**
 * Commit the lapsed period outside the render pass. effectivePlanId is called
 * during render; committing store state there would invoke every useData
 * setState mid-render (and write localStorage as a render side effect).
 */
let lapseApplyScheduled = false;
function scheduleLapseApply() {
  if (lapseApplyScheduled || typeof window === "undefined") return;
  lapseApplyScheduled = true;
  setTimeout(() => {
    lapseApplyScheduled = false;
    const billing = getState().billing;
    if (billing.plan === "free") return;
    if (!billing.cancelAtPeriodEnd && !billing.pendingPlan) return;
    const end = periodEnd(billing);
    if (end && end <= new Date()) {
      actions.billingApplyPeriodEnd(billing.pendingPlan || "free");
    }
  }, 0);
}

/**
 * The plan actually in effect. A canceled subscription keeps full access until
 * the period lapses; after that we fold back to free (applied lazily on read).
 * Pure with respect to the store — the state change is applied deferred.
 */
export function effectivePlanId(billing) {
  if (billing.plan === "free") return "free";
  if (billing.cancelAtPeriodEnd || billing.pendingPlan) {
    const end = periodEnd(billing);
    if (end && end <= new Date()) {
      scheduleLapseApply();
      return billing.pendingPlan || "free";
    }
  }
  return billing.plan;
}

/** Effective limits — Founding Artist inherits the Artist limits. */
export function entitlements(billing) {
  const planId = effectivePlanId(billing);
  const plan = PLANS[planId] || PLANS.free;
  return { planId, ...(plan.limits || PLANS.artist.limits) };
}

export function passForProject(billing, projectId) {
  if (!projectId) return null;
  return billing.passes.find((pass) => pass.projectId === projectId) || null;
}

/** Current-cycle usage, treating a stale period key as zeroed counters. */
export function currentUsage(billing) {
  const key = usagePeriodKey(billing);
  if (billing.usage.periodKey === key) return billing.usage;
  return { periodKey: key, mockups: 0, proposals: 0, projectsCreated: 0, pdfExports: 0 };
}

export function activeProjects(data) {
  return data.projects.filter((p) => !["Completed", "Archived"].includes(p.status));
}

/* ---------- gate checks: { ok, reason } ---------- */

export function canCreateProject(data) {
  const limits = entitlements(data.billing);
  if (limits.activeProjects === Infinity) return { ok: true };
  // Passed projects don't count against the free active-project cap.
  const counted = activeProjects(data).filter(
    (p) => !passForProject(data.billing, p.id),
  ).length;
  if (limits.planId === "free" && counted >= limits.activeProjects) {
    return { ok: false, reason: "projects" };
  }
  const created = currentUsage(data.billing).projectsCreated;
  if (limits.planId !== "free" && created >= limits.activeProjects) {
    return { ok: false, reason: "projects" };
  }
  return { ok: true };
}

export function canCreateMockup(data, projectId) {
  if (passForProject(data.billing, projectId)) return { ok: true };
  const limits = entitlements(data.billing);
  if (limits.mockupsPerMonth === Infinity) return { ok: true };
  if (currentUsage(data.billing).mockups >= limits.mockupsPerMonth) {
    return { ok: false, reason: "mockups" };
  }
  return { ok: true };
}

export function canCreateProposal(data, projectId) {
  const pass = passForProject(data.billing, projectId);
  if (pass) {
    return pass.proposalUsed ? { ok: false, reason: "proposals" } : { ok: true, passId: pass.id };
  }
  const limits = entitlements(data.billing);
  if (limits.proposalsPerMonth === Infinity) return { ok: true };
  if (currentUsage(data.billing).proposals >= limits.proposalsPerMonth) {
    return { ok: false, reason: "proposals" };
  }
  return { ok: true };
}

/**
 * Export/download policy for a mockup or PDF tied to `projectId`:
 * { watermark, ok, passId?, remainingExports? }
 */
export function exportPolicy(data, projectId) {
  const limits = entitlements(data.billing);
  if (!limits.watermark) return { ok: true, watermark: false };
  const pass = passForProject(data.billing, projectId);
  if (pass) {
    const max = PLANS.pass.limits.exportsPerPass;
    if (pass.exportsUsed >= max) return { ok: false, watermark: false, reason: "pass-exports" };
    return { ok: true, watermark: false, passId: pass.id, remainingExports: max - pass.exportsUsed };
  }
  return { ok: true, watermark: true };
}

export function foundingAvailable(billing) {
  return billing.founding.enabled && billing.founding.claimed < PLANS.founding.limit;
}

/* ---------- usage meters for the billing page ---------- */

export function usageSummary(data) {
  const limits = entitlements(data.billing);
  const usage = currentUsage(data.billing);
  const fmt = (limit) => (limit === Infinity ? "∞" : limit);
  return [
    {
      label: "Projects this cycle",
      used: limits.planId === "free" ? activeProjects(data).length : usage.projectsCreated,
      limit: limits.activeProjects,
      display: fmt(limits.activeProjects),
    },
    { label: "Mockups", used: usage.mockups, limit: limits.mockupsPerMonth, display: fmt(limits.mockupsPerMonth) },
    { label: "Proposals", used: usage.proposals, limit: limits.proposalsPerMonth, display: fmt(limits.proposalsPerMonth) },
    { label: "PDF exports", used: usage.pdfExports, limit: Infinity, display: "∞" },
  ];
}

/* ---------- watermark ---------- */

/** Stamp a diagonal preview watermark onto an image data URL. */
export async function watermarkDataUrl(dataUrl) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const size = Math.max(24, Math.round(canvas.width / 28));
  ctx.font = `600 ${size}px Inter, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = Math.max(1, size / 14);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 9);
  ctx.textAlign = "center";
  const text = "MURALFORGE PREVIEW";
  const stepY = size * 5;
  const stepX = size * 14;
  for (let y = -canvas.height; y < canvas.height; y += stepY) {
    for (let x = -canvas.width; x < canvas.width; x += stepX) {
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    }
  }
  return canvas.toDataURL("image/jpeg", 0.92);
}

/** Consume one Project Pass export (no-op without a pass). */
export function consumePassExport(passId) {
  if (!passId) return;
  const pass = getState().billing.passes.find((p) => p.id === passId);
  if (pass) actions.billingUpdatePass(passId, { exportsUsed: pass.exportsUsed + 1 });
}
