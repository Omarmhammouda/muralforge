"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import ProjectModal from "@/components/ProjectModal";
import { shortDate } from "@/lib/format";
import { PROJECT_STATUSES, clientName, useData } from "@/lib/store";

function ProjectsInner() {
  const data = useData();
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (params.get("new") === "1") {
      setEditing({ clientId: params.get("client") || "" });
    }
  }, [params]);

  if (!data) return <AppShell title="Projects" />;

  const projects = data.projects
    .filter((p) => (statusFilter ? p.status === statusFilter : p.status !== "Archived"))
    .filter((p) =>
      `${p.name} ${p.location} ${clientName(data, p.clientId)}`.toLowerCase().includes(query.toLowerCase()),
    );

  return (
    <AppShell
      title="Projects"
      actions={<button className="btn primary" onClick={() => setEditing({})}>+ New Project</button>}
    >
      <div className="toolbar">
        <input className="search" placeholder="Search projects…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="search" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All active statuses</option>
          {PROJECT_STATUSES.map((status) => <option key={status}>{status}</option>)}
        </select>
      </div>

      {projects.length ? (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr><th>Project</th><th>Client</th><th>Status</th><th>Mockups</th><th>Proposals</th><th>Start</th></tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="rowlink" onClick={() => router.push(`/projects/${project.id}`)}>
                  <td><b>{project.name}</b><div style={{ color: "var(--mute)", fontSize: 12 }}>{project.location}</div></td>
                  <td>{clientName(data, project.clientId)}</td>
                  <td><span className={`badge ${project.status?.replace(/ /g, "")}`}>{project.status}</span></td>
                  <td>{data.mockups.filter((m) => m.projectId === project.id).length}</td>
                  <td>{data.proposals.filter((p) => p.projectId === project.id).length}</td>
                  <td>{project.startDate ? shortDate(project.startDate) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <b>No projects yet</b>
          <p>Create your first mural project and keep everything organized in one place.</p>
          <button className="btn primary" onClick={() => setEditing({})}>Create Project</button>
        </div>
      )}

      {editing ? (
        <ProjectModal data={data} initial={editing} onClose={() => setEditing(null)} />
      ) : null}
    </AppShell>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsInner />
    </Suspense>
  );
}
