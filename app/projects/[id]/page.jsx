"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import ProjectModal from "@/components/ProjectModal";
import { money, shortDate, timeAgo } from "@/lib/format";
import { PROJECT_STATUSES, actions, clientName, proposalTotals, useData } from "@/lib/store";

export default function ProjectWorkspace() {
  const data = useData();
  const { id } = useParams();
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  if (!data) return <AppShell title="Project" />;
  const project = data.projects.find((p) => p.id === id);
  if (!project) {
    return (
      <AppShell title="Project">
        <div className="empty"><b>Project not found</b><a className="btn ghost" href="/projects">Back to projects</a></div>
      </AppShell>
    );
  }

  const mockups = data.mockups.filter((m) => m.projectId === id);
  const proposals = data.proposals.filter((p) => p.projectId === id);
  const currency = data.settings.proposalDefaults.currency;
  const activity = data.activity.filter((a) =>
    a.text.includes(project.name) ||
    mockups.some((m) => a.text.includes(m.name)) ||
    proposals.some((p) => a.text.includes(p.name || p.number)),
  );

  return (
    <AppShell
      title={project.name}
      actions={
        <>
          <select
            className="search"
            value={project.status}
            onChange={(event) => actions.upsertProject({ id, status: event.target.value })}
          >
            {PROJECT_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
          <a className="btn ghost" href={`/studio?project=${id}`}>+ Mockup</a>
          <a className="btn primary" href={`/proposals?new=1&project=${id}`}>+ Proposal</a>
        </>
      }
    >
      <div className="two-col">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <h3>Overview</h3>
            <div className="form-grid" style={{ fontSize: 13.5 }}>
              {[
                ["Client", project.clientId ? (
                  <a key="c" href={`/clients/${project.clientId}`}>{clientName(data, project.clientId)}</a>
                ) : "—"],
                ["Location", project.location || "—"],
                ["Wall size", project.wallWidth || project.wallHeight ? `${project.wallWidth || "?"} × ${project.wallHeight || "?"}` : "—"],
                ["Timeline", project.startDate ? `${shortDate(project.startDate)} → ${project.endDate ? shortDate(project.endDate) : "TBD"}` : "—"],
              ].map(([label, value]) => (
                <div className="f" key={label}>
                  <span>{label}</span>
                  <div>{value}</div>
                </div>
              ))}
              {project.description ? (
                <div className="f wide"><span>Description</span><div style={{ whiteSpace: "pre-wrap" }}>{project.description}</div></div>
              ) : null}
              {project.notes ? (
                <div className="f wide"><span>Internal notes</span><div style={{ whiteSpace: "pre-wrap", color: "var(--mute)" }}>{project.notes}</div></div>
              ) : null}
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="btn ghost mini" onClick={() => setEditing(true)}>Edit project</button>
            </div>
          </div>

          <div className="card">
            <h3>Mockups ({mockups.length})</h3>
            {mockups.length ? (
              <div className="mock-grid">
                {mockups.map((mockup) => (
                  <div className="mock-card" key={mockup.id}>
                    <img src={mockup.thumb} alt={mockup.name} />
                    <div className="meta">
                      <b>{mockup.name}</b>
                      <span>{mockup.draft ? "Draft · " : ""}{timeAgo(mockup.updatedAt)}</span>
                    </div>
                    <div className="row-actions">
                      <a className="btn mini ghost" href={`/studio?edit=${mockup.id}`}>Edit</a>
                      <button className="btn mini danger" onClick={() => actions.deleteMockup(mockup.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty" style={{ padding: 24 }}>
                <b>No mockups yet</b>
                <p>Upload a wall photo and start visualizing the mural.</p>
                <a className="btn primary" href={`/studio?project=${id}`}>Create Mockup</a>
              </div>
            )}
          </div>

          <div className="card">
            <h3>Proposals ({proposals.length})</h3>
            {proposals.length ? (
              <table className="table">
                <thead><tr><th>#</th><th>Name</th><th>Status</th><th className="num">Value</th></tr></thead>
                <tbody>
                  {proposals.map((proposal) => (
                    <tr key={proposal.id} className="rowlink" onClick={() => router.push(`/proposals/${proposal.id}`)}>
                      <td>{proposal.number}</td>
                      <td><b>{proposal.name || "Untitled"}</b></td>
                      <td><span className={`badge ${proposal.status}`}>{proposal.status}</span></td>
                      <td className="num">{money(proposalTotals(proposal, data.settings).total, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty" style={{ padding: 24 }}>
                <b>No proposals yet</b>
                <p>Create a professional proposal with your mural designs, scope, timeline, and pricing.</p>
                <a className="btn primary" href={`/proposals?new=1&project=${id}`}>Create Proposal</a>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3>Activity</h3>
          {activity.length ? (
            <div className="activity">
              {activity.slice(0, 12).map((item) => (
                <div className="activity-item" key={item.id}>
                  <span className="activity-dot" />
                  <span>{item.text}</span>
                  <span className="when">{timeAgo(item.at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--mute)" }}>Project activity will appear here.</p>
          )}
        </div>
      </div>

      {editing ? (
        <ProjectModal data={data} initial={project} onClose={() => setEditing(false)} />
      ) : null}
    </AppShell>
  );
}
