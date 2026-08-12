"use client";

import { addDays } from "./format";
import { actions, getState, newId } from "./store";

export function effectiveStatus(proposal) {
  if (
    ["Draft", "Sent", "Viewed"].includes(proposal.status) &&
    proposal.expiresAt &&
    new Date(proposal.expiresAt) < new Date()
  ) {
    return "Expired";
  }
  return proposal.status;
}

export const STANDARD_SCOPE = [
  { title: "Surface Preparation", body: "Cleaning, repair of minor imperfections, and masking of adjacent surfaces." },
  { title: "Priming", body: "Professional-grade primer matched to the wall surface for long-term adhesion." },
  { title: "Mural Production", body: "Hand-painted execution of the approved design, including all paints and materials." },
  { title: "Protective Coating", body: "UV-resistant protective clear coat for durability and easy cleaning." },
  { title: "Cleanup", body: "Full site cleanup and removal of all materials on completion." },
];

export function createProposal({ clientId = "", projectId = "", mockupIds = [] } = {}) {
  const state = getState();
  const defaults = state.settings.proposalDefaults;
  const template = state.templates.find((t) => t.isDefault);
  const record = {
    id: newId(),
    number: actions.nextProposalNumber(),
    name: "",
    clientId,
    projectId,
    status: "Draft",
    issueDate: new Date().toISOString(),
    expiresAt: addDays(null, defaults.expirationDays),
    overview: { description: "", location: "", wallDims: "" },
    scope: (template?.scope || STANDARD_SCOPE).map((section) => ({ ...section, id: newId() })),
    mockupIds,
    pricing: {
      items: (template?.pricingItems || [
        { name: "Design & Concept", desc: "Custom mural concept development", qty: 1, price: "" },
        { name: "Surface Preparation", desc: "Wall preparation and priming", qty: 1, price: "" },
        { name: "Mural Installation", desc: "Professional mural execution", qty: 1, price: "" },
      ]).map((item) => ({ ...item, id: newId() })),
      discount: 0,
      taxRate: defaults.taxRate,
      depositPct: defaults.depositPct,
      schedule:
        template?.schedule ||
        `${defaults.depositPct}% deposit to reserve the start date · balance due on completion.`,
    },
    timeline: { start: "", prep: "", production: "", completion: "" },
    terms: template?.terms || defaults.terms,
  };
  return actions.upsertProposal(record);
}
