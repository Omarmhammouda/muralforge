"use client";

import AppShell from "@/components/AppShell";
import { money, timeAgo } from "@/lib/format";
import { clientName, proposalTotals, useData } from "@/lib/store";

export default function Dashboard() {
  const data = useData();
  if (!data) return <AppShell title="Dashboard" />;

  const currency = data.settings.proposalDefaults.currency;
  const activeProjects = data.projects.filter(
    (p) => !["Completed", "Archived"].includes(p.status),
  );
  const drafts = data.proposals.filter((p) => p.status === "Draft");
  const sent = data.proposals.filter((p) => ["Sent", "Viewed"].includes(p.status));
  const accepted = data.proposals.filter((p) => p.status === "Accepted");
  const totalValue = data.proposals.reduce(
    (sum, p) => sum + proposalTotals(p, data.settings).total,
    0,
  );
  const pendingRevenue = sent.reduce(
    (sum, p) => sum + proposalTotals(p, data.settings).total,
    0,
  );
  const isEmpty =
    !data.clients.length && !data.projects.length && !data.proposals.length && !data.mockups.length;

  return (
    <AppShell title="Dashboard">
      {isEmpty ? (
        <div className="empty" style={{ marginBottom: 22 }}>
          <b>Welcome to MuralForge</b>
          <p>
            Your mural business in one place — clients, projects, realistic wall mockups, and
            professional proposals. Start wherever you like; everything connects.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <a className="btn primary" href="/clients?new=1">Add Your First Client</a>
            <a className="btn ghost" href="/studio">Create a Mockup</a>
          </div>
        </div>
      ) : null}

      <div className="quick-actions">
        <a className="quick-action" href="/projects?new=1">
          <b>+ New Project</b>
          <span>Start a mural project workspace</span>
        </a>
        <a className="quick-action" href="/studio">
          <b>+ Create Mockup</b>
          <span>Visualize art on a real wall</span>
        </a>
        <a className="quick-action" href="/proposals?new=1">
          <b>+ Create Proposal</b>
          <span>Scope, pricing, and terms</span>
        </a>
        <a className="quick-action" href="/clients?new=1">
          <b>+ Add Client</b>
          <span>Keep contacts organized</span>
        </a>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="label">Active Projects</div>
          <div className="value">{activeProjects.length}</div>
          <div className="sub">{data.projects.length} total</div>
        </div>
        <div className="stat">
          <div className="label">Proposals</div>
          <div className="value">{data.proposals.length}</div>
          <div className="sub">
            {drafts.length} draft · {sent.length} sent · {accepted.length} accepted
          </div>
        </div>
        <div className="stat">
          <div className="label">Total Proposal Value</div>
          <div className="value">{money(totalValue, currency)}</div>
          <div className="sub">across all proposals</div>
        </div>
        <div className="stat">
          <div className="label">Pending Revenue</div>
          <div className="value">{money(pendingRevenue, currency)}</div>
          <div className="sub">awaiting client decision</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h3>Recent Activity</h3>
          {data.activity.length ? (
            <div className="activity">
              {data.activity.slice(0, 10).map((item) => (
                <div className="activity-item" key={item.id}>
                  <span className="activity-dot" />
                  <span>{item.text}</span>
                  <span className="when">{timeAgo(item.at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--mute)" }}>
              Activity will appear here as you add clients, mockups, and proposals.
            </p>
          )}
        </div>

        <div className="card">
          <h3>Recent Clients</h3>
          {data.clients.length ? (
            <div className="activity">
              {data.clients.slice(0, 6).map((client) => (
                <div className="activity-item" key={client.id}>
                  <a href={`/clients/${client.id}`}>{client.company || client.contact}</a>
                  <span className="when">
                    {
                      data.proposals.filter((p) => p.clientId === client.id).length
                    }{" "}
                    proposals
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty" style={{ padding: 24 }}>
              <b>No clients yet</b>
              <p>You haven&apos;t added any clients yet.</p>
              <a className="btn primary" href="/clients?new=1">Add Your First Client</a>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
