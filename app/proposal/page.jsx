"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { optimizeWallPhoto } from "@/lib/optimize-photo";
import {
  DEFAULT_TEMPLATE,
  INTAKE_STORAGE_KEY,
  TEMPLATE_STORAGE_KEY,
  collectFields,
  fillText,
  money,
  pricingTotal,
  usesSpecial,
} from "@/lib/proposal";

const PLACEHOLDER_SPLIT = /(\{\{\s*(?:pricing|mockups)\s*\}\})/i;

function isLongField(name) {
  return /desc|concept|note|detail|about|scope/i.test(name);
}

export default function ProposalBuilder() {
  const [sections, setSections] = useState(DEFAULT_TEMPLATE);
  const [values, setValues] = useState({});
  const [pricing, setPricing] = useState([{ label: "", amount: "" }]);
  const [images, setImages] = useState([]);
  const [tab, setTab] = useState("template");
  const loaded = useRef(false);
  const imageInput = useRef(null);

  useEffect(() => {
    try {
      const savedTemplate = localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (savedTemplate) setSections(JSON.parse(savedTemplate));
      const savedIntake = localStorage.getItem(INTAKE_STORAGE_KEY);
      if (savedIntake) {
        const parsed = JSON.parse(savedIntake);
        if (parsed.values) setValues(parsed.values);
        if (Array.isArray(parsed.pricing) && parsed.pricing.length) setPricing(parsed.pricing);
        if (Array.isArray(parsed.images)) setImages(parsed.images);
      }
      const handoff = sessionStorage.getItem("mf_proposal_mockup");
      if (handoff) {
        setImages((previous) => (previous.includes(handoff) ? previous : [...previous, handoff]));
        sessionStorage.removeItem("mf_proposal_mockup");
        setTab("intake");
      }
    } catch {
      // Corrupt or unavailable storage — start from the default template.
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(sections));
      localStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify({ values, pricing, images }));
    } catch {
      // Storage quota exceeded (usually large images) — keep working in memory.
    }
  }, [sections, values, pricing, images]);

  const fields = useMemo(() => collectFields(sections), [sections]);
  const hasPricing = useMemo(() => usesSpecial(sections, "pricing"), [sections]);
  const hasMockups = useMemo(() => usesSpecial(sections, "mockups"), [sections]);

  function updateSection(index, patch) {
    setSections((previous) =>
      previous.map((section, i) => (i === index ? { ...section, ...patch } : section)),
    );
  }

  function moveSection(index, delta) {
    setSections((previous) => {
      const next = [...previous];
      const target = index + delta;
      if (target < 0 || target >= next.length) return previous;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function addImages(fileList) {
    for (const file of Array.from(fileList || [])) {
      const optimized = await optimizeWallPhoto(file);
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(optimized.file);
      });
      setImages((previous) => (previous.includes(dataUrl) ? previous : [...previous, dataUrl]));
    }
  }

  function renderBody(body) {
    const parts = String(body || "").split(PLACEHOLDER_SPLIT);
    return parts.map((part, index) => {
      const special = part.match(/^\{\{\s*(pricing|mockups)\s*\}\}$/i)?.[1]?.toLowerCase();
      if (special === "pricing") {
        const rows = pricing.filter((row) => row.label.trim() || String(row.amount).trim());
        return (
          <table className="doc-pricing" key={index}>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td>{row.label || "________"}</td>
                  <td>{row.amount ? money(pricingTotal([row])) : "________"}</td>
                </tr>
              ))}
              <tr className="doc-total">
                <td>Total</td>
                <td>{money(pricingTotal(rows))}</td>
              </tr>
            </tbody>
          </table>
        );
      }
      if (special === "mockups") {
        if (!images.length) return null;
        return (
          <div className="doc-mockups" key={index}>
            {images.map((src, i) => (
              <img key={i} src={src} alt={`Mockup ${i + 1}`} />
            ))}
          </div>
        );
      }
      const filled = fillText(part, values, pricing);
      return filled.trim() ? (
        <p className="doc-text" key={index}>
          {filled}
        </p>
      ) : null;
    });
  }

  return (
    <div className="shell">
      <div className="brand no-print">
        <img className="brand-mark" src="/logo.svg" alt="MuralForge logo" />
        <div>
          <h1>Proposal Builder</h1>
          <div className="tag">MuralForge · OMH Studios</div>
        </div>
        <a className="ghost brand-cta" href="/">
          ← Mockups
        </a>
      </div>

      <div className="tabs no-print">
        {[
          ["template", "1 · Template"],
          ["intake", "2 · Intake"],
          ["preview", "3 · Preview"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`tab${tab === key ? " active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "template" ? (
        <div className="panel no-print">
          <h3>Your proposal template</h3>
          <p className="hint-line">
            Write anything — every <code>{"{{Field name}}"}</code> you invent becomes an intake
            question automatically. Special blocks: <code>{"{{pricing}}"}</code> (itemized table
            with total), <code>{"{{mockups}}"}</code> (attached images), <code>{"{{date}}"}</code>{" "}
            (today), <code>{"{{total}}"}</code> (pricing total inline).
          </p>
          {sections.map((section, index) => (
            <div className="tsec" key={index}>
              <div className="tsec-head">
                <input
                  value={section.title}
                  placeholder="Section title"
                  onChange={(event) => updateSection(index, { title: event.target.value })}
                />
                <button type="button" className="ghost mini" onClick={() => moveSection(index, -1)}>
                  ↑
                </button>
                <button type="button" className="ghost mini" onClick={() => moveSection(index, 1)}>
                  ↓
                </button>
                <button
                  type="button"
                  className="ghost mini"
                  onClick={() => setSections((previous) => previous.filter((_, i) => i !== index))}
                >
                  ✕
                </button>
              </div>
              <textarea
                value={section.body}
                placeholder="Section text — use {{placeholders}} freely"
                onChange={(event) => updateSection(index, { body: event.target.value })}
              />
            </div>
          ))}
          <div className="row">
            <button
              type="button"
              className="ghost"
              onClick={() => setSections((previous) => [...previous, { title: "", body: "" }])}
            >
              + Add section
            </button>
            <button type="button" className="ghost" onClick={() => setSections(DEFAULT_TEMPLATE)}>
              Reset to default
            </button>
            <button type="button" className="generate slim" onClick={() => setTab("intake")}>
              Next: intake →
            </button>
          </div>
        </div>
      ) : null}

      {tab === "intake" ? (
        <div className="panel no-print">
          <h3>Client intake</h3>
          {fields.length === 0 ? (
            <p className="hint-line">
              The template has no <code>{"{{placeholders}}"}</code> yet — add some in step 1.
            </p>
          ) : null}
          <div className="field-grid">
            {fields.map((name) =>
              isLongField(name) ? (
                <label className="field wide" key={name}>
                  <span>{name}</span>
                  <textarea
                    value={values[name] || ""}
                    onChange={(event) =>
                      setValues((previous) => ({ ...previous, [name]: event.target.value }))
                    }
                  />
                </label>
              ) : (
                <label className="field" key={name}>
                  <span>{name}</span>
                  <input
                    value={values[name] || ""}
                    onChange={(event) =>
                      setValues((previous) => ({ ...previous, [name]: event.target.value }))
                    }
                  />
                </label>
              ),
            )}
          </div>

          {hasPricing ? (
            <>
              <h3 style={{ marginTop: 22 }}>Pricing</h3>
              {pricing.map((row, index) => (
                <div className="price-row" key={index}>
                  <input
                    placeholder="Line item — e.g. Design & mockups"
                    value={row.label}
                    onChange={(event) =>
                      setPricing((previous) =>
                        previous.map((r, i) =>
                          i === index ? { ...r, label: event.target.value } : r,
                        ),
                      )
                    }
                  />
                  <input
                    placeholder="Amount"
                    value={row.amount}
                    onChange={(event) =>
                      setPricing((previous) =>
                        previous.map((r, i) =>
                          i === index ? { ...r, amount: event.target.value } : r,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="ghost mini"
                    onClick={() => setPricing((previous) => previous.filter((_, i) => i !== index))}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="row">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setPricing((previous) => [...previous, { label: "", amount: "" }])}
                >
                  + Add line
                </button>
                <div className="quota">Total: {money(pricingTotal(pricing))}</div>
              </div>
            </>
          ) : null}

          {hasMockups ? (
            <>
              <h3 style={{ marginTop: 22 }}>Mockups</h3>
              <div className="row">
                <button type="button" className="ghost" onClick={() => imageInput.current?.click()}>
                  + Attach images
                </button>
                <input
                  ref={imageInput}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(event) => addImages(event.target.files)}
                />
              </div>
              {images.length ? (
                <div className="history">
                  {images.map((src, index) => (
                    <img
                      key={index}
                      src={src}
                      alt={`Attached ${index + 1}`}
                      title="Click to remove"
                      onClick={() => setImages((previous) => previous.filter((_, i) => i !== index))}
                    />
                  ))}
                </div>
              ) : (
                <p className="hint-line">
                  Generate a mockup on the main page and hit “Use in proposal”, or attach images
                  here. Click a thumbnail to remove it.
                </p>
              )}
            </>
          ) : null}

          <button type="button" className="generate" onClick={() => setTab("preview")}>
            Preview the proposal →
          </button>
        </div>
      ) : null}

      {tab === "preview" ? (
        <>
          <div className="row no-print" style={{ justifyContent: "flex-end", marginBottom: 12 }}>
            <button type="button" className="generate slim" onClick={() => window.print()}>
              Download PDF / Print
            </button>
          </div>
          <div className="proposal-doc" id="proposal-doc">
            {sections.map((section, index) => (
              <section key={index}>
                {section.title.trim() ? <h2>{fillText(section.title, values, pricing)}</h2> : null}
                {renderBody(section.body)}
              </section>
            ))}
          </div>
        </>
      ) : null}

      <footer className="no-print">
        Templates and intake answers stay in this browser — nothing is uploaded.
      </footer>
    </div>
  );
}
