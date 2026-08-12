"use client";

import { useEffect, useState } from "react";

/**
 * Local-first data layer. One company per browser profile; every entity keyed
 * by id with clean relationships (client → projects → mockups/proposals), so
 * swapping this module for an API-backed store later is mechanical.
 */

const KEY = "muralforge_v2";

export const PROJECT_STATUSES = [
  "Lead",
  "Planning",
  "Mockup",
  "Proposal Draft",
  "Proposal Sent",
  "Approved",
  "In Progress",
  "Completed",
  "Archived",
];

export const PROPOSAL_STATUSES = ["Draft", "Sent", "Viewed", "Accepted", "Rejected", "Expired"];

const DEFAULT_TERMS =
  "A 50% deposit reserves the start date; the balance is due on completion.\n" +
  "Weather days on exterior walls extend the schedule, never the price.\n" +
  "Design revisions are included until the mockup is approved; changes after approval are quoted separately.\n" +
  "This quote is valid until the expiration date shown above.";

const DEFAULT_SETTINGS = {
  company: { name: "", legalName: "", email: "", phone: "", website: "", address: "" },
  branding: { logo: null, primary: "#0f766e", accent: "#134e4a", font: "Inter", showPlatform: false },
  proposalDefaults: {
    numberPrefix: "PRO",
    nextNumber: 1,
    expirationDays: 30,
    currency: "USD",
    taxRate: 0,
    depositPct: 50,
    terms: DEFAULT_TERMS,
  },
};

const EMPTY = {
  settings: DEFAULT_SETTINGS,
  clients: [],
  projects: [],
  mockups: [],
  proposals: [],
  templates: [],
  activity: [],
};

let state = null;
const listeners = new Set();

export function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function load() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    state = {
      ...EMPTY,
      ...parsed,
      settings: {
        company: { ...DEFAULT_SETTINGS.company, ...parsed.settings?.company },
        branding: { ...DEFAULT_SETTINGS.branding, ...parsed.settings?.branding },
        proposalDefaults: {
          ...DEFAULT_SETTINGS.proposalDefaults,
          ...parsed.settings?.proposalDefaults,
        },
      },
    };
  } catch {
    state = structuredClone(EMPTY);
  }
  return state;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded — keep working in memory; images live in IndexedDB.
  }
}

function commit(next) {
  state = next;
  persist();
  listeners.forEach((fn) => fn(state));
}

export function getState() {
  return load();
}

/** React hook — null until mounted (SSR-safe), then live data. */
export function useData() {
  const [snapshot, setSnapshot] = useState(null);
  useEffect(() => {
    setSnapshot(load());
    const fn = (next) => setSnapshot(next);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return snapshot;
}

function logActivity(draft, type, text) {
  draft.activity = [
    { id: newId(), type, text, at: new Date().toISOString() },
    ...draft.activity,
  ].slice(0, 60);
}

function upsert(list, item) {
  const index = list.findIndex((x) => x.id === item.id);
  if (index < 0) return [item, ...list];
  return list.map((x, i) => (i === index ? item : x));
}

export const actions = {
  saveSettings(patch) {
    const s = load();
    commit({
      ...s,
      settings: {
        company: { ...s.settings.company, ...patch.company },
        branding: { ...s.settings.branding, ...patch.branding },
        proposalDefaults: { ...s.settings.proposalDefaults, ...patch.proposalDefaults },
      },
    });
  },

  upsertClient(client) {
    const s = load();
    const isNew = !s.clients.some((c) => c.id === client.id);
    const record = { createdAt: new Date().toISOString(), archived: false, ...client };
    const next = { ...s, clients: upsert(s.clients, record) };
    if (isNew) logActivity(next, "client", `Client added — ${record.company || record.contact}`);
    commit(next);
    return record;
  },

  setClientArchived(id, archived) {
    const s = load();
    commit({
      ...s,
      clients: s.clients.map((c) => (c.id === id ? { ...c, archived } : c)),
    });
  },

  upsertProject(project) {
    const s = load();
    const existing = s.projects.find((p) => p.id === project.id);
    const record = {
      createdAt: new Date().toISOString(),
      status: "Lead",
      ...existing,
      ...project,
      updatedAt: new Date().toISOString(),
    };
    const next = { ...s, projects: upsert(s.projects, record) };
    logActivity(
      next,
      "project",
      existing ? `Project updated — ${record.name}` : `Project created — ${record.name}`,
    );
    commit(next);
    return record;
  },

  upsertMockup(mockup) {
    const s = load();
    const existing = s.mockups.find((m) => m.id === mockup.id);
    const record = {
      createdAt: new Date().toISOString(),
      draft: false,
      ...existing,
      ...mockup,
      updatedAt: new Date().toISOString(),
    };
    const next = { ...s, mockups: upsert(s.mockups, record) };
    if (!existing) logActivity(next, "mockup", `Mockup created — ${record.name}`);
    commit(next);
    return record;
  },

  deleteMockup(id) {
    const s = load();
    commit({
      ...s,
      mockups: s.mockups.filter((m) => m.id !== id),
      proposals: s.proposals.map((p) => ({
        ...p,
        mockupIds: (p.mockupIds || []).filter((mid) => mid !== id),
      })),
    });
  },

  nextProposalNumber() {
    const s = load();
    const d = s.settings.proposalDefaults;
    const number = `${d.numberPrefix}-${new Date().getFullYear()}-${String(d.nextNumber).padStart(3, "0")}`;
    commit({
      ...s,
      settings: {
        ...s.settings,
        proposalDefaults: { ...d, nextNumber: d.nextNumber + 1 },
      },
    });
    return number;
  },

  upsertProposal(proposal, activityText) {
    const s = load();
    const existing = s.proposals.find((p) => p.id === proposal.id);
    const record = {
      createdAt: new Date().toISOString(),
      status: "Draft",
      ...existing,
      ...proposal,
      updatedAt: new Date().toISOString(),
    };
    const next = { ...s, proposals: upsert(s.proposals, record) };
    if (!existing) logActivity(next, "proposal", `Proposal created — ${record.name || record.number}`);
    else if (activityText) logActivity(next, "proposal", activityText);
    commit(next);
    return record;
  },

  setProposalStatus(id, status) {
    const s = load();
    const proposal = s.proposals.find((p) => p.id === id);
    if (!proposal) return;
    const patch = { status };
    if (status === "Sent" && !proposal.sentAt) patch.sentAt = new Date().toISOString();
    const next = {
      ...s,
      proposals: s.proposals.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    };
    logActivity(next, "proposal", `Proposal ${status.toLowerCase()} — ${proposal.name || proposal.number}`);
    commit(next);
  },

  deleteProposal(id) {
    const s = load();
    commit({ ...s, proposals: s.proposals.filter((p) => p.id !== id) });
  },

  upsertTemplate(template) {
    const s = load();
    const record = { createdAt: new Date().toISOString(), ...template };
    let templates = upsert(s.templates, record);
    if (record.isDefault) {
      templates = templates.map((t) => ({ ...t, isDefault: t.id === record.id }));
    }
    commit({ ...s, templates });
    return record;
  },

  deleteTemplate(id) {
    const s = load();
    commit({ ...s, templates: s.templates.filter((t) => t.id !== id) });
  },
};

/* ---------- derived helpers ---------- */

export function proposalTotals(proposal, settings) {
  const items = proposal.pricing?.items || [];
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0),
    0,
  );
  const discount = Number(proposal.pricing?.discount) || 0;
  const taxRate = proposal.pricing?.taxRate ?? settings?.proposalDefaults?.taxRate ?? 0;
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * (Number(taxRate) / 100);
  const total = taxable + tax;
  const depositPct = proposal.pricing?.depositPct ?? settings?.proposalDefaults?.depositPct ?? 0;
  const deposit = total * (Number(depositPct) / 100);
  return { subtotal, discount, taxRate: Number(taxRate), tax, total, depositPct: Number(depositPct), deposit };
}

export function clientName(data, clientId) {
  const client = data?.clients.find((c) => c.id === clientId);
  return client ? client.company || client.contact : "—";
}

export function projectName(data, projectId) {
  return data?.projects.find((p) => p.id === projectId)?.name || "—";
}
