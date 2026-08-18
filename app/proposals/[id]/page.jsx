"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import UpgradeModal from "@/components/UpgradeModal";
import { exportPolicy } from "@/lib/billing";
import { longDate, money, shortDate } from "@/lib/format";
import { getImage } from "@/lib/images";
import { effectiveStatus } from "@/lib/proposal-factory";
import {
  PROPOSAL_STATUSES,
  actions,
  newId,
  proposalTotals,
  useData,
} from "@/lib/store";

function useDebouncedSave(draft, loadedRef, setSaving) {
  useEffect(() => {
    if (!draft || !loadedRef.current) return;
    setSaving("saving");
    const timer = setTimeout(() => {
      actions.upsertProposal(draft);
      setSaving("saved");
    }, 700);
    return () => clearTimeout(timer);
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default function ProposalBuilder() {
  const data = useData();
  const { id } = useParams();
  const [draft, setDraft] = useState(null);
  const [tab, setTab] = useState("edit");
  const [saving, setSaving] = useState("");
  const [images, setImages] = useState({});
  const [upgrade, setUpgrade] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!data || draft) return;
    const record = data.proposals.find((p) => p.id === id);
    if (record) {
      setDraft(structuredClone(record));
      setTimeout(() => (loadedRef.current = true), 50);
    }
  }, [data, draft, id]);

  useDebouncedSave(draft, loadedRef, setSaving);

  useEffect(() => {
    if (!draft) return;
    (draft.mockupIds || []).forEach((mockupId) => {
      if (images[mockupId] !== undefined) return;
      setImages((prev) => ({ ...prev, [mockupId]: null }));
      getImage(mockupId).then((src) =>
        setImages((prev) => ({ ...prev, [mockupId]: src })),
      );
    });
  }, [draft, images]);

  if (!data) return <AppShell title="Proposal" />;
  if (!draft) {
    return (
      <AppShell title="Proposal">
        <div className="empty"><b>Proposal not found</b><a className="btn ghost" href="/proposals">Back to proposals</a></div>
      </AppShell>
    );
  }

  const settings = data.settings;
  const branding = settings.branding;
  const company = settings.company;
  const currency = settings.proposalDefaults.currency;
  const client = data.clients.find((c) => c.id === draft.clientId);
  const project = data.projects.find((p) => p.id === draft.projectId);
  const totals = proposalTotals(draft, settings);
  const selectedMockups = (draft.mockupIds || [])
    .map((mockupId) => data.mockups.find((m) => m.id === mockupId))
    .filter(Boolean);
  const projectMockups = data.mockups.filter(
    (m) => !draft.projectId || m.projectId === draft.projectId || draft.mockupIds?.includes(m.id),
  );

  const patch = (changes) => setDraft((d) => ({ ...d, ...changes }));
  const patchDeep = (key, changes) => setDraft((d) => ({ ...d, [key]: { ...d[key], ...changes } }));

  function sendProposal() {
    actions.setProposalStatus(id, "Sent");
    patch({ status: "Sent", sentAt: draft.sentAt || new Date().toISOString() });
    if (client?.email) {
      const subject = encodeURIComponent(`Mural proposal ${draft.number} — ${draft.name || project?.name || ""}`);
      const body = encodeURIComponent(
        `Hi ${client.contact || ""},\n\nPlease find our mural proposal ${draft.number}` +
          ` for ${project?.name || "your project"} attached as a PDF.\n\nTotal investment: ${money(totals.total, currency)}\n` +
          `Valid until ${shortDate(draft.expiresAt)}.\n\n${company.name || ""}`,
      );
      window.open(`mailto:${client.email}?subject=${subject}&body=${body}`);
    }
  }

  function saveAsTemplate() {
    actions.upsertTemplate({
      id: newId(),
      name: `${draft.name || "Untitled"} template`,
      scope: draft.scope.map(({ title, body }) => ({ title, body })),
      pricingItems: draft.pricing.items.map(({ name, desc, qty }) => ({ name, desc, qty, price: "" })),
      terms: draft.terms,
      schedule: draft.pricing.schedule,
      isDefault: false,
    });
    alert("Saved as a reusable template.");
  }

  const heroSrc = selectedMockups[0] ? images[selectedMockups[0].id] || selectedMockups[0].thumb : null;
  const docWatermark = exportPolicy(data, draft.projectId).watermark;

  function doPrint() {
    setTab("preview");
    setTimeout(() => window.print(), 300);
    actions.billingRecordUsage("pdfExports");
  }

  function exportPdf() {
    const policy = exportPolicy(data, draft.projectId);
    if (policy.watermark) {
      setUpgrade(true);
      return;
    }
    doPrint();
  }

  return (
    <AppShell
      title={draft.name || draft.number}
      actions={
        <>
          {saving === "saving" ? <span className="saving-note">Saving…</span> : null}
          {saving === "saved" ? <span className="saving-note saved">Saved ✓</span> : null}
          <select
            className="search"
            value={draft.status}
            onChange={(event) => {
              patch({ status: event.target.value });
              actions.setProposalStatus(id, event.target.value);
            }}
          >
            {PROPOSAL_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
          <button className="btn ghost" onClick={saveAsTemplate}>Save as template</button>
          <button className="btn ghost" onClick={exportPdf}>
            Export PDF
          </button>
          <button className="btn primary" onClick={sendProposal}>Send to client</button>
        </>
      }
    >
      <div className="toolbar no-print">
        <div className="seg">
          <button className={tab === "edit" ? "on" : ""} onClick={() => setTab("edit")}>Edit</button>
          <button className={tab === "preview" ? "on" : ""} onClick={() => setTab("preview")}>Preview</button>
        </div>
        <div className="spacer" />
        <span className="badge">{effectiveStatus(draft)}</span>
        <span className="saving-note">{draft.number}</span>
      </div>

      {tab === "edit" ? (
        <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <h3>Details</h3>
            <div className="form-grid">
              <label className="f"><span>Proposal name</span>
                <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Lobby Mural — Concept & Installation" />
              </label>
              <label className="f"><span>Client</span>
                <select value={draft.clientId || ""} onChange={(e) => patch({ clientId: e.target.value })}>
                  <option value="">— Select client —</option>
                  {data.clients.filter((c) => !c.archived).map((c) => (
                    <option key={c.id} value={c.id}>{c.company || c.contact}</option>
                  ))}
                </select>
              </label>
              <label className="f"><span>Project</span>
                <select value={draft.projectId || ""} onChange={(e) => patch({ projectId: e.target.value })}>
                  <option value="">— Select project —</option>
                  {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="f"><span>Expiration date</span>
                <input
                  type="date"
                  value={draft.expiresAt ? draft.expiresAt.slice(0, 10) : ""}
                  onChange={(e) => patch({ expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </label>
              <label className="f wide"><span>Project description</span>
                <textarea
                  value={draft.overview?.description || ""}
                  onChange={(e) => patchDeep("overview", { description: e.target.value })}
                  placeholder="What this mural is, where it lives, and what it should achieve…"
                />
              </label>
              <label className="f"><span>Location</span>
                <input
                  value={draft.overview?.location ?? project?.location ?? ""}
                  onChange={(e) => patchDeep("overview", { location: e.target.value })}
                />
              </label>
              <label className="f"><span>Wall dimensions</span>
                <input
                  value={draft.overview?.wallDims ?? (project ? `${project.wallWidth || ""} × ${project.wallHeight || ""}` : "")}
                  onChange={(e) => patchDeep("overview", { wallDims: e.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="card">
            <h3>Mockups in this proposal</h3>
            {projectMockups.length ? (
              <div className="mock-grid">
                {projectMockups.map((mockup) => {
                  const selected = draft.mockupIds?.includes(mockup.id);
                  return (
                    <div
                      className="mock-card"
                      key={mockup.id}
                      style={{ outline: selected ? "2px solid var(--accent)" : "none", cursor: "pointer" }}
                      onClick={() =>
                        patch({
                          mockupIds: selected
                            ? draft.mockupIds.filter((mid) => mid !== mockup.id)
                            : [...(draft.mockupIds || []), mockup.id],
                        })
                      }
                    >
                      <img src={mockup.thumb} alt={mockup.name} />
                      <div className="meta">
                        <b>{selected ? "✓ " : ""}{mockup.name}</b>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: "var(--mute)" }}>
                No mockups yet — <a href={`/studio${draft.projectId ? `?project=${draft.projectId}` : ""}`}>create one in the studio</a>. The first selected mockup becomes the cover image.
              </p>
            )}
          </div>

          <div className="card">
            <h3>Scope of work</h3>
            {draft.scope.map((section, index) => (
              <div key={section.id} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <input
                    className="search" style={{ width: "100%", fontWeight: 600 }}
                    value={section.title}
                    placeholder="Section title"
                    onChange={(e) =>
                      patch({ scope: draft.scope.map((s, i) => (i === index ? { ...s, title: e.target.value } : s)) })
                    }
                  />
                  <textarea
                    className="search" style={{ width: "100%", marginTop: 6, minHeight: 54, resize: "vertical" }}
                    value={section.body}
                    placeholder="What's included…"
                    onChange={(e) =>
                      patch({ scope: draft.scope.map((s, i) => (i === index ? { ...s, body: e.target.value } : s)) })
                    }
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <button className="btn mini ghost" disabled={index === 0} onClick={() => {
                    const scope = [...draft.scope];
                    [scope[index - 1], scope[index]] = [scope[index], scope[index - 1]];
                    patch({ scope });
                  }}>↑</button>
                  <button className="btn mini ghost" disabled={index === draft.scope.length - 1} onClick={() => {
                    const scope = [...draft.scope];
                    [scope[index + 1], scope[index]] = [scope[index], scope[index + 1]];
                    patch({ scope });
                  }}>↓</button>
                  <button className="btn mini danger" onClick={() => patch({ scope: draft.scope.filter((_, i) => i !== index) })}>✕</button>
                </div>
              </div>
            ))}
            <button className="btn ghost mini" onClick={() => patch({ scope: [...draft.scope, { id: newId(), title: "", body: "" }] })}>
              + Add section
            </button>
          </div>

          <div className="card">
            <h3>Pricing</h3>
            <table className="table">
              <thead>
                <tr><th>Item</th><th>Description</th><th style={{ width: 70 }}>Qty</th><th style={{ width: 120 }}>Unit price</th><th></th></tr>
              </thead>
              <tbody>
                {draft.pricing.items.map((item, index) => (
                  <tr key={item.id}>
                    <td><input className="search" style={{ width: "100%", minWidth: 120 }} value={item.name}
                      onChange={(e) => patchDeep("pricing", { items: draft.pricing.items.map((x, i) => i === index ? { ...x, name: e.target.value } : x) })} /></td>
                    <td><input className="search" style={{ width: "100%", minWidth: 160 }} value={item.desc}
                      onChange={(e) => patchDeep("pricing", { items: draft.pricing.items.map((x, i) => i === index ? { ...x, desc: e.target.value } : x) })} /></td>
                    <td><input className="search" style={{ width: "100%", minWidth: 50 }} type="number" min="0" value={item.qty}
                      onChange={(e) => patchDeep("pricing", { items: draft.pricing.items.map((x, i) => i === index ? { ...x, qty: e.target.value } : x) })} /></td>
                    <td><input className="search" style={{ width: "100%", minWidth: 90 }} type="number" min="0" value={item.price}
                      onChange={(e) => patchDeep("pricing", { items: draft.pricing.items.map((x, i) => i === index ? { ...x, price: e.target.value } : x) })} /></td>
                    <td><button className="btn mini danger" onClick={() => patchDeep("pricing", { items: draft.pricing.items.filter((_, i) => i !== index) })}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn ghost mini" style={{ marginTop: 8 }}
              onClick={() => patchDeep("pricing", { items: [...draft.pricing.items, { id: newId(), name: "", desc: "", qty: 1, price: "" }] })}>
              + Add line item
            </button>
            <div className="form-grid" style={{ marginTop: 14 }}>
              <label className="f"><span>Discount ({currency})</span>
                <input type="number" min="0" value={draft.pricing.discount} onChange={(e) => patchDeep("pricing", { discount: e.target.value })} />
              </label>
              <label className="f"><span>Tax rate (%)</span>
                <input type="number" min="0" value={draft.pricing.taxRate} onChange={(e) => patchDeep("pricing", { taxRate: e.target.value })} />
              </label>
              <label className="f"><span>Deposit (%)</span>
                <input type="number" min="0" max="100" value={draft.pricing.depositPct} onChange={(e) => patchDeep("pricing", { depositPct: e.target.value })} />
              </label>
              <label className="f"><span>Payment schedule</span>
                <input value={draft.pricing.schedule} onChange={(e) => patchDeep("pricing", { schedule: e.target.value })} />
              </label>
            </div>
            <div style={{ textAlign: "right", marginTop: 12, fontSize: 14 }}>
              Subtotal {money(totals.subtotal, currency)} · Tax {money(totals.tax, currency)} ·{" "}
              <b>Total {money(totals.total, currency)}</b> · Deposit {money(totals.deposit, currency)}
            </div>
          </div>

          <div className="card">
            <h3>Timeline</h3>
            <div className="form-grid">
              <label className="f"><span>Estimated start</span>
                <input type="date" value={draft.timeline?.start || ""} onChange={(e) => patchDeep("timeline", { start: e.target.value })} />
              </label>
              <label className="f"><span>Preparation</span>
                <input value={draft.timeline?.prep || ""} placeholder="e.g. 2 days" onChange={(e) => patchDeep("timeline", { prep: e.target.value })} />
              </label>
              <label className="f"><span>Production</span>
                <input value={draft.timeline?.production || ""} placeholder="e.g. 5 painting days" onChange={(e) => patchDeep("timeline", { production: e.target.value })} />
              </label>
              <label className="f"><span>Estimated completion</span>
                <input type="date" value={draft.timeline?.completion || ""} onChange={(e) => patchDeep("timeline", { completion: e.target.value })} />
              </label>
            </div>
          </div>

          <div className="card">
            <h3>Terms &amp; conditions</h3>
            <textarea
              className="search"
              style={{ width: "100%", minHeight: 120, resize: "vertical" }}
              value={draft.terms}
              onChange={(e) => patch({ terms: e.target.value })}
            />
          </div>
        </div>
      ) : (
        <ProposalDocument
          draft={draft}
          client={client}
          project={project}
          settings={settings}
          totals={totals}
          selectedMockups={selectedMockups}
          images={images}
          heroSrc={heroSrc}
          watermark={docWatermark}
        />
      )}

      {upgrade ? (
        <UpgradeModal
          context="export"
          projectId={draft.projectId || undefined}
          onClose={() => setUpgrade(false)}
          onContinueWatermark={doPrint}
        />
      ) : null}
    </AppShell>
  );
}

function ProposalDocument({ draft, client, project, settings, totals, selectedMockups, images, heroSrc, watermark }) {
  const { company, branding, proposalDefaults } = settings;
  const currency = proposalDefaults.currency;
  const extraMockups = selectedMockups.slice(1);
  const wm = watermark ? <div className="doc-watermark">MURALFORGE PREVIEW</div> : null;

  return (
    <div
      className="doc"
      style={{ "--doc-accent": branding.primary, fontFamily: `${branding.font}, Inter, sans-serif` }}
    >
      {/* Page 1 — Cover */}
      <div className="doc-page doc-cover">
        {wm}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          {branding.logo ? <img className="logo" src={branding.logo} alt="" /> : <div className="co-name">{company.name}</div>}
          <div style={{ textAlign: "right", color: "#5f6672", fontSize: 12.5 }}>
            {draft.number}
            <br />
            {longDate(draft.issueDate)}
          </div>
        </div>
        <h1>{draft.name || "Mural Proposal"}</h1>
        <div className="cover-sub">
          Prepared for {client ? client.company || client.contact : "—"}
          {project ? ` · ${project.name}` : ""}
        </div>
        {heroSrc ? <img className="cover-img" src={heroSrc} alt="Mural mockup" /> : null}
        <div className="cover-foot">
          <span>{company.name}{company.legalName && company.legalName !== company.name ? ` · ${company.legalName}` : ""}</span>
          <span>{[company.email, company.phone, company.website].filter(Boolean).join(" · ")}</span>
        </div>
      </div>

      {/* Page 2 — Project overview */}
      <div className="doc-page">
        {wm}
        <h2>Project Overview</h2>
        {draft.overview?.description ? <p className="pre">{draft.overview.description}</p> : null}
        <div className="meta-grid">
          <div><b>Client</b>{client ? client.company || client.contact : "—"}</div>
          <div><b>Contact</b>{[client?.contact, client?.email, client?.phone].filter(Boolean).join(" · ") || "—"}</div>
          <div><b>Location</b>{draft.overview?.location || project?.location || "—"}</div>
          <div><b>Wall dimensions</b>{draft.overview?.wallDims || "—"}</div>
          <div><b>Issued</b>{longDate(draft.issueDate)}</div>
          <div><b>Valid until</b>{longDate(draft.expiresAt)}</div>
        </div>
      </div>

      {/* Page 3 — Mural design */}
      {selectedMockups.length ? (
        <div className="doc-page">
          {wm}
          <h2>Mural Design</h2>
          <img className="design-img" src={images[selectedMockups[0].id] || selectedMockups[0].thumb} alt={selectedMockups[0].name} />
          <div className="caption">{selectedMockups[0].name}</div>
          {extraMockups.length ? (
            <>
              <h4>Additional design options</h4>
              <div className="design-grid">
                {extraMockups.map((mockup) => (
                  <div key={mockup.id}>
                    <img src={images[mockup.id] || mockup.thumb} alt={mockup.name} />
                    <div className="caption">{mockup.name}</div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
          <p className="caption">
            Mockups are previews rendered on photographs of the actual wall — the final mural is
            painted by hand and refined together before production begins.
          </p>
        </div>
      ) : null}

      {/* Page 4 — Scope & timeline */}
      <div className="doc-page">
        {wm}
        <h2>Scope of Work</h2>
        {draft.scope.filter((s) => s.title || s.body).map((section) => (
          <div key={section.id} style={{ marginBottom: 16 }}>
            <h4>{section.title}</h4>
            <p className="pre">{section.body}</p>
          </div>
        ))}
        <h2 style={{ marginTop: 34 }}>Timeline</h2>
        <div className="meta-grid">
          <div><b>Estimated start</b>{draft.timeline?.start ? longDate(draft.timeline.start) : "To be scheduled"}</div>
          <div><b>Preparation</b>{draft.timeline?.prep || "—"}</div>
          <div><b>Production</b>{draft.timeline?.production || "—"}</div>
          <div><b>Estimated completion</b>{draft.timeline?.completion ? longDate(draft.timeline.completion) : "—"}</div>
        </div>
      </div>

      {/* Page 5 — Investment */}
      <div className="doc-page">
        {wm}
        <h2>Investment</h2>
        <table className="pricing">
          <thead>
            <tr><th>Item</th><th>Description</th><th className="num">Qty</th><th className="num">Unit</th><th className="num">Amount</th></tr>
          </thead>
          <tbody>
            {draft.pricing.items.filter((item) => item.name).map((item) => (
              <tr key={item.id}>
                <td><b>{item.name}</b></td>
                <td>{item.desc}</td>
                <td className="num">{item.qty}</td>
                <td className="num">{money(item.price, currency)}</td>
                <td className="num">{money((Number(item.qty) || 0) * (Number(item.price) || 0), currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="totals">
          <div><span>Subtotal</span><span>{money(totals.subtotal, currency)}</span></div>
          {totals.discount ? <div><span>Discount</span><span>−{money(totals.discount, currency)}</span></div> : null}
          {totals.taxRate ? <div><span>Tax ({totals.taxRate}%)</span><span>{money(totals.tax, currency)}</span></div> : null}
          <div className="grand"><span>Total investment</span><span>{money(totals.total, currency)}</span></div>
          {totals.depositPct ? (
            <div className="deposit"><span>Deposit due ({totals.depositPct}%)</span><span>{money(totals.deposit, currency)}</span></div>
          ) : null}
        </div>
        {draft.pricing.schedule ? (
          <p style={{ marginTop: 26 }}><b>Payment schedule:</b> {draft.pricing.schedule}</p>
        ) : null}
      </div>

      {/* Page 6 — Terms & approval */}
      <div className="doc-page">
        {wm}
        <h2>Terms &amp; Conditions</h2>
        <p className="pre">{draft.terms}</p>
        <h2 style={{ marginTop: 40 }}>Approval</h2>
        <p>
          To move forward, sign below or reply by email. This proposal is valid until{" "}
          {longDate(draft.expiresAt)}.
        </p>
        <div className="sig-row">
          <div className="sig">
            <div>Client signature &amp; date</div>
          </div>
          <div className="sig">
            <div>{company.name || "Company"} — authorized signature &amp; date</div>
          </div>
        </div>
        {branding.showPlatform ? (
          <p className="caption" style={{ marginTop: 40 }}>Prepared with MuralForge</p>
        ) : null}
      </div>
    </div>
  );
}
