"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { shortDate } from "@/lib/format";
import { STANDARD_SCOPE } from "@/lib/proposal-factory";
import { actions, newId, useData } from "@/lib/store";

function TemplateModal({ initial, onClose }) {
  const [form, setForm] = useState({
    name: "",
    scope: STANDARD_SCOPE,
    pricingItems: [
      { name: "Design & Concept", desc: "Custom mural concept development", qty: 1, price: "" },
      { name: "Mural Installation", desc: "Professional mural execution", qty: 1, price: "" },
    ],
    terms: "",
    schedule: "",
    isDefault: false,
    ...initial,
  });

  function save() {
    if (!form.name.trim()) return;
    actions.upsertTemplate({ ...form, id: form.id || newId() });
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h2>{form.id ? "Edit template" : "New proposal template"}</h2>
        <div className="form-grid">
          <label className="f"><span>Template name</span>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Commercial Mural Proposal" />
          </label>
          <label className="f" style={{ justifyContent: "end" }}>
            <span>Default template</span>
            <select value={form.isDefault ? "yes" : "no"} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.value === "yes" }))}>
              <option value="no">No</option>
              <option value="yes">Yes — use for new proposals</option>
            </select>
          </label>
        </div>

        <h3 style={{ margin: "16px 0 8px", fontSize: 13, color: "var(--mute)" }}>SCOPE SECTIONS</h3>
        {form.scope.map((section, index) => (
          <div key={index} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input className="search" style={{ flex: 1 }} value={section.title} placeholder="Section title"
              onChange={(e) => setForm((f) => ({ ...f, scope: f.scope.map((s, i) => i === index ? { ...s, title: e.target.value } : s) }))} />
            <input className="search" style={{ flex: 2 }} value={section.body} placeholder="Description"
              onChange={(e) => setForm((f) => ({ ...f, scope: f.scope.map((s, i) => i === index ? { ...s, body: e.target.value } : s) }))} />
            <button className="btn mini danger" onClick={() => setForm((f) => ({ ...f, scope: f.scope.filter((_, i) => i !== index) }))}>✕</button>
          </div>
        ))}
        <button className="btn ghost mini" onClick={() => setForm((f) => ({ ...f, scope: [...f.scope, { title: "", body: "" }] }))}>+ Add section</button>

        <h3 style={{ margin: "16px 0 8px", fontSize: 13, color: "var(--mute)" }}>PRICING LINE ITEMS</h3>
        {form.pricingItems.map((item, index) => (
          <div key={index} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input className="search" style={{ flex: 1 }} value={item.name} placeholder="Item"
              onChange={(e) => setForm((f) => ({ ...f, pricingItems: f.pricingItems.map((x, i) => i === index ? { ...x, name: e.target.value } : x) }))} />
            <input className="search" style={{ flex: 2 }} value={item.desc} placeholder="Description"
              onChange={(e) => setForm((f) => ({ ...f, pricingItems: f.pricingItems.map((x, i) => i === index ? { ...x, desc: e.target.value } : x) }))} />
            <button className="btn mini danger" onClick={() => setForm((f) => ({ ...f, pricingItems: f.pricingItems.filter((_, i) => i !== index) }))}>✕</button>
          </div>
        ))}
        <button className="btn ghost mini" onClick={() => setForm((f) => ({ ...f, pricingItems: [...f.pricingItems, { name: "", desc: "", qty: 1, price: "" }] }))}>+ Add item</button>

        <div className="form-grid" style={{ marginTop: 16 }}>
          <label className="f wide"><span>Terms &amp; conditions</span>
            <textarea value={form.terms} onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))} placeholder="Leave blank to use your company defaults from Settings" />
          </label>
          <label className="f wide"><span>Payment schedule</span>
            <input value={form.schedule} onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))} placeholder="e.g. 50% deposit · balance on completion" />
          </label>
        </div>

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Save template</button>
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const data = useData();
  const [editing, setEditing] = useState(null);

  if (!data) return <AppShell title="Templates" />;

  return (
    <AppShell
      title="Templates"
      actions={<button className="btn primary" onClick={() => setEditing({})}>+ New Template</button>}
    >
      {data.templates.length ? (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Template</th><th>Sections</th><th>Line items</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {data.templates.map((template) => (
                <tr key={template.id}>
                  <td>
                    <b>{template.name}</b>
                    {template.isDefault ? <span className="badge Accepted" style={{ marginLeft: 8 }}>Default</span> : null}
                  </td>
                  <td>{template.scope?.length || 0}</td>
                  <td>{template.pricingItems?.length || 0}</td>
                  <td>{shortDate(template.createdAt)}</td>
                  <td>
                    <button className="btn mini ghost" onClick={() => setEditing(template)}>Edit</button>{" "}
                    <button className="btn mini ghost" onClick={() => actions.upsertTemplate({ ...structuredClone(template), id: newId(), name: `${template.name} (copy)`, isDefault: false })}>Duplicate</button>{" "}
                    {!template.isDefault ? (
                      <button className="btn mini ghost" onClick={() => actions.upsertTemplate({ ...template, isDefault: true })}>Set default</button>
                    ) : null}{" "}
                    <button className="btn mini danger" onClick={() => actions.deleteTemplate(template.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <b>No templates yet</b>
          <p>
            Templates pre-fill new proposals with your standard scope, pricing structure, and terms
            — build one per service type (commercial, residential, interior…).
          </p>
          <button className="btn primary" onClick={() => setEditing({})}>Create Template</button>
        </div>
      )}

      {editing ? <TemplateModal initial={editing} onClose={() => setEditing(null)} /> : null}
    </AppShell>
  );
}
