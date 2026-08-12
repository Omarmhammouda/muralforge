"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import ClientModal from "@/components/ClientModal";
import { money } from "@/lib/format";
import { actions, proposalTotals, useData } from "@/lib/store";

function ClientsInner() {
  const data = useData();
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (params.get("new") === "1") setEditing({});
  }, [params]);

  if (!data) return <AppShell title="Clients" />;

  const clients = data.clients
    .filter((c) => (showArchived ? true : !c.archived))
    .filter((c) =>
      `${c.company} ${c.contact} ${c.email}`.toLowerCase().includes(query.toLowerCase()),
    );

  return (
    <AppShell
      title="Clients"
      actions={<button className="btn primary" onClick={() => setEditing({})}>+ Add Client</button>}
    >
      <div className="toolbar">
        <input
          className="search"
          placeholder="Search clients…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <label style={{ display: "flex", gap: 6, alignItems: "center", color: "var(--mute)", fontSize: 13 }}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
          />
          Show archived
        </label>
      </div>

      {clients.length ? (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Client</th><th>Contact</th><th>Email</th><th>Projects</th>
                <th className="num">Proposal value</th><th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const projects = data.projects.filter((p) => p.clientId === client.id);
                const value = data.proposals
                  .filter((p) => p.clientId === client.id)
                  .reduce((sum, p) => sum + proposalTotals(p, data.settings).total, 0);
                return (
                  <tr
                    key={client.id}
                    className="rowlink"
                    onClick={() => router.push(`/clients/${client.id}`)}
                  >
                    <td><b>{client.company || client.contact}</b>{client.archived ? <span className="badge" style={{ marginLeft: 8 }}>Archived</span> : null}</td>
                    <td>{client.contact}</td>
                    <td>{client.email}</td>
                    <td>{projects.length}</td>
                    <td className="num">{money(value, data.settings.proposalDefaults.currency)}</td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <button className="btn mini ghost" onClick={() => setEditing(client)}>Edit</button>{" "}
                      <button
                        className="btn mini ghost"
                        onClick={() => actions.setClientArchived(client.id, !client.archived)}
                      >
                        {client.archived ? "Restore" : "Archive"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <b>No clients yet</b>
          <p>You haven&apos;t added any clients yet.</p>
          <button className="btn primary" onClick={() => setEditing({})}>Add Your First Client</button>
        </div>
      )}

      {editing ? (
        <ClientModal initial={editing} onClose={() => setEditing(null)} />
      ) : null}
    </AppShell>
  );
}

export default function ClientsPage() {
  return (
    <Suspense>
      <ClientsInner />
    </Suspense>
  );
}
