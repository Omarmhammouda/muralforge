"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { actions, useData } from "@/lib/store";

const FONTS = ["Inter", "Georgia", "Helvetica Neue", "Palatino", "Futura", "Courier New"];
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "AED"];

export default function SettingsPage() {
  const data = useData();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState("");

  useEffect(() => {
    if (data && !form) setForm(structuredClone(data.settings));
  }, [data, form]);

  if (!data || !form) return <AppShell title="Settings" />;

  const setCompany = (key) => (e) => setForm((f) => ({ ...f, company: { ...f.company, [key]: e.target.value } }));
  const setBranding = (key, value) => setForm((f) => ({ ...f, branding: { ...f.branding, [key]: value } }));
  const setDefaults = (key) => (e) =>
    setForm((f) => ({ ...f, proposalDefaults: { ...f.proposalDefaults, [key]: e.target.value } }));

  function save() {
    actions.saveSettings({
      company: form.company,
      branding: form.branding,
      proposalDefaults: {
        ...form.proposalDefaults,
        nextNumber: Number(form.proposalDefaults.nextNumber) || 1,
        expirationDays: Number(form.proposalDefaults.expirationDays) || 30,
        taxRate: Number(form.proposalDefaults.taxRate) || 0,
        depositPct: Number(form.proposalDefaults.depositPct) || 0,
      },
    });
    setSaving("saved");
    setTimeout(() => setSaving(""), 2000);
  }

  async function pickLogo(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBranding("logo", String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <AppShell
      title="Settings"
      actions={
        <>
          {saving === "saved" ? <span className="saving-note saved">Saved ✓</span> : null}
          <button className="btn primary" onClick={save}>Save settings</button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card">
          <h3>Company information</h3>
          <p className="saving-note" style={{ marginTop: -8, marginBottom: 12 }}>
            This is what appears on your proposals — clients see your business, not this platform.
          </p>
          <div className="form-grid">
            <label className="f"><span>Company name</span><input value={form.company.name} onChange={setCompany("name")} placeholder="e.g. Walls & Wonder Studio" /></label>
            <label className="f"><span>Legal business name</span><input value={form.company.legalName} onChange={setCompany("legalName")} /></label>
            <label className="f"><span>Email</span><input value={form.company.email} onChange={setCompany("email")} /></label>
            <label className="f"><span>Phone</span><input value={form.company.phone} onChange={setCompany("phone")} /></label>
            <label className="f"><span>Website</span><input value={form.company.website} onChange={setCompany("website")} /></label>
            <label className="f"><span>Address</span><input value={form.company.address} onChange={setCompany("address")} /></label>
          </div>
        </div>

        <div className="card">
          <h3>Branding</h3>
          <div className="form-grid">
            <div className="f">
              <span>Company logo (used on proposals)</span>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {form.branding.logo ? (
                  <img src={form.branding.logo} alt="Logo" style={{ height: 44, maxWidth: 160, objectFit: "contain", border: "1px solid var(--line)", borderRadius: 8, padding: 4, background: "#fff" }} />
                ) : (
                  <span className="saving-note">No logo uploaded</span>
                )}
                <label className="btn ghost mini">
                  Upload
                  <input type="file" accept="image/*" hidden onChange={(e) => pickLogo(e.target.files?.[0])} />
                </label>
                {form.branding.logo ? (
                  <button className="btn ghost mini" onClick={() => setBranding("logo", null)}>Remove</button>
                ) : null}
              </div>
            </div>
            <label className="f"><span>Proposal typography</span>
              <select value={form.branding.font} onChange={(e) => setBranding("font", e.target.value)}>
                {FONTS.map((font) => <option key={font}>{font}</option>)}
              </select>
            </label>
            <label className="f"><span>Primary color (proposal accents)</span>
              <input type="color" value={form.branding.primary} onChange={(e) => setBranding("primary", e.target.value)} style={{ height: 40, padding: 4 }} />
            </label>
            <label className="f"><span>Secondary color</span>
              <input type="color" value={form.branding.accent} onChange={(e) => setBranding("accent", e.target.value)} style={{ height: 40, padding: 4 }} />
            </label>
            <label className="f wide"><span>Platform credit on exports</span>
              <select
                value={form.branding.showPlatform ? "yes" : "no"}
                onChange={(e) => setBranding("showPlatform", e.target.value === "yes")}
              >
                <option value="no">Off — fully white-label (recommended)</option>
                <option value="yes">On — show a small &quot;Prepared with MuralForge&quot; line</option>
              </select>
            </label>
          </div>
        </div>

        <div className="card">
          <h3>Proposal defaults</h3>
          <div className="form-grid">
            <label className="f"><span>Number prefix</span><input value={form.proposalDefaults.numberPrefix} onChange={setDefaults("numberPrefix")} /></label>
            <label className="f"><span>Next number</span><input type="number" min="1" value={form.proposalDefaults.nextNumber} onChange={setDefaults("nextNumber")} /></label>
            <label className="f"><span>Default expiration (days)</span><input type="number" min="1" value={form.proposalDefaults.expirationDays} onChange={setDefaults("expirationDays")} /></label>
            <label className="f"><span>Currency</span>
              <select value={form.proposalDefaults.currency} onChange={setDefaults("currency")}>
                {CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}
              </select>
            </label>
            <label className="f"><span>Default tax rate (%)</span><input type="number" min="0" value={form.proposalDefaults.taxRate} onChange={setDefaults("taxRate")} /></label>
            <label className="f"><span>Default deposit (%)</span><input type="number" min="0" max="100" value={form.proposalDefaults.depositPct} onChange={setDefaults("depositPct")} /></label>
            <label className="f wide"><span>Default terms &amp; conditions</span>
              <textarea style={{ minHeight: 110 }} value={form.proposalDefaults.terms} onChange={setDefaults("terms")} />
            </label>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
