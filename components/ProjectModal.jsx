"use client";

import { useState } from "react";
import { PROJECT_STATUSES, actions, newId } from "@/lib/store";

const BLANK = {
  name: "", clientId: "", location: "", description: "",
  wallWidth: "", wallHeight: "", status: "Lead", startDate: "", endDate: "", notes: "",
};

export default function ProjectModal({ data, initial, onClose, onSaved }) {
  const [form, setForm] = useState({ ...BLANK, ...initial });
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  function save() {
    if (!form.name.trim()) return;
    const record = actions.upsertProject({ id: form.id || newId(), ...form });
    onSaved?.(record);
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h2>{form.id ? "Edit project" : "Create project"}</h2>
        <div className="form-grid">
          <label className="f"><span>Project name</span><input value={form.name} onChange={set("name")} placeholder="e.g. Lobby mural — Hibernica" /></label>
          <label className="f"><span>Client</span>
            <select value={form.clientId} onChange={set("clientId")}>
              <option value="">— No client yet —</option>
              {data.clients.filter((c) => !c.archived).map((client) => (
                <option key={client.id} value={client.id}>{client.company || client.contact}</option>
              ))}
            </select>
          </label>
          <label className="f wide"><span>Location / address</span><input value={form.location} onChange={set("location")} /></label>
          <label className="f wide"><span>Description</span><textarea value={form.description} onChange={set("description")} /></label>
          <label className="f"><span>Wall width</span><input value={form.wallWidth} onChange={set("wallWidth")} placeholder="e.g. 24 ft" /></label>
          <label className="f"><span>Wall height</span><input value={form.wallHeight} onChange={set("wallHeight")} placeholder="e.g. 10 ft" /></label>
          <label className="f"><span>Status</span>
            <select value={form.status} onChange={set("status")}>
              {PROJECT_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label className="f"><span>Estimated start</span><input type="date" value={form.startDate} onChange={set("startDate")} /></label>
          <label className="f"><span>Estimated completion</span><input type="date" value={form.endDate} onChange={set("endDate")} /></label>
          <label className="f wide"><span>Internal notes</span><textarea value={form.notes} onChange={set("notes")} /></label>
        </div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Save project</button>
        </div>
      </div>
    </div>
  );
}
