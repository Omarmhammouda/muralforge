"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import { money, shortDate } from "@/lib/format";
import { proposalTotals, useData } from "@/lib/store";
import ClientModal from "@/components/ClientModal";

export default function ClientProfile() {
  const data = useData();
  const { id } = useParams();
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  if (!data) return <AppShell title="Client" />;
  const client = data.clients.find((c) => c.id === id);
  if (!client) {
    return (
      <AppShell title="Client">
        <div className="empty"><b>Client not found</b><a className="btn ghost" href="/clients">Back to clients</a></div>
      </AppShell>
    );
  }

  const projects = data.projects.filter((p) => p.clientId === id);
  const proposals = data.proposals.filter((p) => p.clientId === id);
  const currency = data.settings.proposalDefaults.currency;
  const totalValue = proposals.reduce((sum, p) => sum + proposalTotals(p, data.settings).total, 0);
  const accepted = proposals.filter((p) => p.status === "Accepted");
  const pending = proposals.filter((p) => ["Draft", "Sent", "Viewed"].includes(p.status));

  return (
    <AppShell
      title={client.company || client.contact}
      actions={
        <>
          <a className="btn ghost" href={`/projects?new=1&client=${id}`}>+ Project</a>
          <a className="btn primary" href={`/proposals?new=1&client=${id}`}>+ Proposal</a>
        </>
      }
    >
      <div className="stat-grid">
        <div className="stat"><div className="label">Projects</div><div className="value">{projects.length}</div></div>
        <div className="stat"><div className="label">Proposal Value</div><div className="value">{money(totalValue, currency)}</div></div>
        <div className="stat"><div className="label">Accepted</div><div className="value">{accepted.length}</div></div>
        <div className="stat"><div className="label">Pending</div><div className="value">{pending.length}</div></div>
      </div>

      <div className="two-col">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <h3>Projects</h3>
            {projects.length ? (
              <table className="table">
                <thead><tr><th>Project</th><th>Status</th><th>Location</th></tr></thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} className="rowlink" onClick={() => router.push(`/projects/${project.id}`)}>
                      <td><b>{project.name}</b></td>
                      <td><span className={`badge ${project.status?.replace(" ", "")}`} data-s={project.status}>{project.status}</span></td>
                      <td>{project.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: "var(--mute)" }}>No projects for this client yet.</p>
            )}
          </div>

          <div className="card">
            <h3>Proposals</h3>
            {proposals.length ? (
              <table className="table">
                <thead><tr><th>#</th><th>Name</th><th>Status</th><th className="num">Value</th><th>Created</th></tr></thead>
                <tbody>
                  {proposals.map((proposal) => (
                    <tr key={proposal.id} className="rowlink" onClick={() => router.push(`/proposals/${proposal.id}`)}>
                      <td>{proposal.number}</td>
                      <td><b>{proposal.name || "Untitled"}</b></td>
                      <td><span className={`badge ${proposal.status}`}>{proposal.status}</span></td>
                      <td className="num">{money(proposalTotals(proposal, data.settings).total, currency)}</td>
                      <td>{shortDate(proposal.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: "var(--mute)" }}>No proposals for this client yet.</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3>Contact</h3>
          <div className="activity">
            {[
              ["Contact", client.contact],
              ["Email", client.email],
              ["Phone", client.phone],
              ["Address", client.address],
              ["Website", client.website],
              ["Notes", client.notes],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div className="activity-item" key={label}>
                  <span style={{ color: "var(--mute)", minWidth: 70 }}>{label}</span>
                  <span style={{ wordBreak: "break-word" }}>{value}</span>
                </div>
              ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <button className="btn ghost" onClick={() => setEditing(true)}>Edit client</button>
          </div>
        </div>
      </div>

      {editing ? <ClientModal initial={client} onClose={() => setEditing(false)} /> : null}
    </AppShell>
  );
}
