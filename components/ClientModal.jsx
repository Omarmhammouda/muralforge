"use client";

import { useState } from "react";
import { actions, newId } from "@/lib/store";

const BLANK = { company: "", contact: "", email: "", phone: "", address: "", website: "", notes: "" };

export default function ClientModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({ ...BLANK, ...initial });
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  function save() {
    if (!form.company.trim() && !form.contact.trim()) return;
    const record = actions.upsertClient({ id: form.id || newId(), ...form });
    onSaved?.(record);
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h2>{form.id ? "Edit client" : "Add client"}</h2>
        <div className="form-grid">
          <label className="f"><span>Company name</span><input value={form.company} onChange={set("company")} /></label>
          <label className="f"><span>Contact name</span><input value={form.contact} onChange={set("contact")} /></label>
          <label className="f"><span>Email</span><input type="email" value={form.email} onChange={set("email")} /></label>
          <label className="f"><span>Phone</span><input value={form.phone} onChange={set("phone")} /></label>
          <label className="f"><span>Address</span><input value={form.address} onChange={set("address")} /></label>
          <label className="f"><span>Website</span><input value={form.website} onChange={set("website")} /></label>
          <label className="f wide"><span>Notes</span><textarea value={form.notes} onChange={set("notes")} /></label>
        </div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Save client</button>
        </div>
      </div>
    </div>
  );
}
