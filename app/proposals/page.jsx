"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import UpgradeModal from "@/components/UpgradeModal";
import { canCreateProposal } from "@/lib/billing";
import { money, shortDate } from "@/lib/format";
import { createProposal, effectiveStatus } from "@/lib/proposal-factory";
import {
  PROPOSAL_STATUSES,
  actions,
  clientName,
  getState,
  newId,
  projectName,
  proposalTotals,
  useData,
} from "@/lib/store";

function ProposalsInner() {
  const data = useData();
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const creating = useRef(false);
  const [upgrade, setUpgrade] = useState(null); // { projectId, opts } | { projectId, duplicateOf }

  useEffect(() => {
    if (params.get("new") === "1" && !creating.current) {
      creating.current = true;
      const opts = {
        clientId: params.get("client") || "",
        projectId: params.get("project") || "",
        mockupIds: params.get("mockup") ? [params.get("mockup")] : [],
      };
      const check = canCreateProposal(getState(), opts.projectId || null);
      if (!check.ok) {
        setUpgrade({ projectId: opts.projectId || null, opts });
        router.replace("/proposals");
        return;
      }
      const record = createProposal(opts);
      if (check.passId) actions.billingUpdatePass(check.passId, { proposalUsed: true });
      actions.billingRecordUsage("proposals");
      router.replace(`/proposals/${record.id}`);
    }
  }, [params, router]);

  if (!data) return <AppShell title="Proposals" />;

  const currency = data.settings.proposalDefaults.currency;
  const proposals = data.proposals
    .filter((p) => (statusFilter ? effectiveStatus(p) === statusFilter : true))
    .filter((p) =>
      `${p.number} ${p.name} ${clientName(data, p.clientId)} ${projectName(data, p.projectId)}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => {
      if (sort === "value")
        return proposalTotals(b, data.settings).total - proposalTotals(a, data.settings).total;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

  function startProposal(opts = {}) {
    const projectId = opts.projectId || null;
    const check = canCreateProposal(data || getState(), projectId);
    if (!check.ok) {
      setUpgrade({ projectId, opts });
      return;
    }
    const record = createProposal(opts);
    if (check.passId) actions.billingUpdatePass(check.passId, { proposalUsed: true });
    actions.billingRecordUsage("proposals");
    router.push(`/proposals/${record.id}`);
  }

  function cloneProposal(proposal) {
    const record = {
      ...structuredClone(proposal),
      id: newId(),
      number: actions.nextProposalNumber(),
      name: `${proposal.name || "Untitled"} (copy)`,
      status: "Draft",
      sentAt: null,
      issueDate: new Date().toISOString(),
    };
    actions.upsertProposal(record);
    return record;
  }

  function duplicate(proposal) {
    const projectId = proposal.projectId || null;
    const check = canCreateProposal(data || getState(), projectId);
    if (!check.ok) {
      setUpgrade({ projectId, duplicateOf: proposal });
      return;
    }
    const record = cloneProposal(proposal);
    if (check.passId) actions.billingUpdatePass(check.passId, { proposalUsed: true });
    actions.billingRecordUsage("proposals");
    router.push(`/proposals/${record.id}`);
  }

  return (
    <AppShell
      title="Proposals"
      actions={
        <button className="btn primary" onClick={() => startProposal()}>
          + Create Proposal
        </button>
      }
    >
      <div className="toolbar">
        <input className="search" placeholder="Search proposals…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="search" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {PROPOSAL_STATUSES.map((status) => <option key={status}>{status}</option>)}
        </select>
        <select className="search" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Last updated</option>
          <option value="value">Highest value</option>
        </select>
      </div>

      {proposals.length ? (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>#</th><th>Proposal</th><th>Client</th><th>Project</th>
                <th className="num">Value</th><th>Status</th><th>Expires</th><th></th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal) => (
                <tr key={proposal.id} className="rowlink" onClick={() => router.push(`/proposals/${proposal.id}`)}>
                  <td style={{ whiteSpace: "nowrap" }}>{proposal.number}</td>
                  <td><b>{proposal.name || "Untitled"}</b>
                    <div style={{ color: "var(--mute)", fontSize: 12 }}>created {shortDate(proposal.createdAt)}</div>
                  </td>
                  <td>{clientName(data, proposal.clientId)}</td>
                  <td>{projectName(data, proposal.projectId)}</td>
                  <td className="num">{money(proposalTotals(proposal, data.settings).total, currency)}</td>
                  <td><span className={`badge ${effectiveStatus(proposal)}`}>{effectiveStatus(proposal)}</span></td>
                  <td>{shortDate(proposal.expiresAt)}</td>
                  <td onClick={(event) => event.stopPropagation()}>
                    <button className="btn mini ghost" onClick={() => duplicate(proposal)}>Duplicate</button>{" "}
                    <button
                      className="btn mini danger"
                      onClick={() => {
                        if (confirm("Delete this proposal?")) actions.deleteProposal(proposal.id);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <b>No proposals yet</b>
          <p>Create a professional proposal with your mural designs, scope, timeline, and pricing.</p>
          <button className="btn primary" onClick={() => startProposal()}>
            Create Proposal
          </button>
        </div>
      )}

      {upgrade ? (
        <UpgradeModal
          context="proposals"
          projectId={upgrade.projectId || undefined}
          onClose={() => setUpgrade(null)}
          onUnlocked={() => {
            const check = canCreateProposal(getState(), upgrade.projectId);
            if (!check.ok) return;
            const record = upgrade.duplicateOf
              ? cloneProposal(upgrade.duplicateOf)
              : createProposal(upgrade.opts || {});
            if (check.passId) actions.billingUpdatePass(check.passId, { proposalUsed: true });
            actions.billingRecordUsage("proposals");
            router.push(`/proposals/${record.id}`);
          }}
        />
      ) : null}
    </AppShell>
  );
}

export default function ProposalsPage() {
  return (
    <Suspense>
      <ProposalsInner />
    </Suspense>
  );
}
