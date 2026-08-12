"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { shortDate } from "@/lib/format";
import { getImage, putImage } from "@/lib/images";
import { actions, clientName, newId, projectName, useData } from "@/lib/store";

export default function MockupsPage() {
  const data = useData();
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [sort, setSort] = useState("newest");

  if (!data) return <AppShell title="Mockups" />;

  const mockups = data.mockups
    .filter((m) => (projectFilter ? m.projectId === projectFilter : true))
    .filter((m) => {
      const project = data.projects.find((p) => p.id === m.projectId);
      const haystack = `${m.name} ${project?.name || ""} ${clientName(data, project?.clientId)}`;
      return haystack.toLowerCase().includes(query.toLowerCase());
    })
    .sort((a, b) =>
      sort === "newest"
        ? new Date(b.updatedAt) - new Date(a.updatedAt)
        : new Date(a.updatedAt) - new Date(b.updatedAt),
    );

  async function duplicate(mockup) {
    const image = await getImage(mockup.id);
    const id = newId();
    if (image) await putImage(id, image);
    actions.upsertMockup({ ...mockup, id, name: `${mockup.name} (copy)` });
  }

  async function download(mockup) {
    const image = await getImage(mockup.id);
    if (!image) return;
    const link = document.createElement("a");
    link.href = image;
    link.download = `${mockup.name}.jpg`;
    link.click();
  }

  return (
    <AppShell
      title="Mockups"
      actions={<a className="btn primary" href="/studio">+ Create Mockup</a>}
    >
      <div className="toolbar">
        <input className="search" placeholder="Search mockups…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="search" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="">All projects</option>
          {data.projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        <select className="search" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {mockups.length ? (
        <div className="mock-grid">
          {mockups.map((mockup) => {
            const project = data.projects.find((p) => p.id === mockup.projectId);
            return (
              <div className="mock-card" key={mockup.id}>
                <img src={mockup.thumb} alt={mockup.name} />
                <div className="meta">
                  <b>
                    {mockup.name}
                    {mockup.draft ? <span className="badge" style={{ marginLeft: 6 }}>Draft</span> : null}
                  </b>
                  <span>
                    {project ? `${project.name} · ` : ""}
                    {clientName(data, project?.clientId) !== "—" ? `${clientName(data, project?.clientId)} · ` : ""}
                    {shortDate(mockup.updatedAt)}
                  </span>
                </div>
                <div className="row-actions">
                  <a className="btn mini ghost" href={`/studio?edit=${mockup.id}`}>Edit</a>
                  <button className="btn mini ghost" onClick={() => duplicate(mockup)}>Duplicate</button>
                  <button className="btn mini ghost" onClick={() => download(mockup)}>Download</button>
                  <a
                    className="btn mini ghost"
                    href={`/proposals?new=1&mockup=${mockup.id}${mockup.projectId ? `&project=${mockup.projectId}` : ""}`}
                  >
                    → Proposal
                  </a>
                  <button className="btn mini danger" onClick={() => actions.deleteMockup(mockup.id)}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <b>No mockups yet</b>
          <p>Upload a wall photo and start visualizing your mural.</p>
          <a className="btn primary" href="/studio">Create Mockup</a>
        </div>
      )}
    </AppShell>
  );
}
