"use client";

import { useState } from "react";
import { actions } from "@/lib/store";
import { ONBOARDING_OPTIONS } from "@/lib/plans";

/**
 * First-run question — how often the user creates mural projects. Selecting an
 * option shows a plan recommendation; every path marks billing as onboarded.
 * Not dismissible by clicking the overlay.
 */
export default function OnboardingModal({ onClose }) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = ONBOARDING_OPTIONS.find((option) => option.id === selectedId) || null;

  function finish(goToPricing) {
    actions.billingPatch({ onboarded: true, frequency: selectedId });
    onClose();
    if (goToPricing) window.location.href = "/pricing";
  }

  function skip() {
    actions.billingPatch({ onboarded: true });
    onClose();
  }

  return (
    <div className="overlay">
      <div className="modal">
        <h2>How often do you create mural projects?</h2>
        <div className="quick-actions" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 14 }}>
          {ONBOARDING_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="quick-action"
              style={
                selectedId === option.id
                  ? { borderColor: "var(--accent)", background: "var(--accent-soft)" }
                  : undefined
              }
              onClick={() => setSelectedId(option.id)}
            >
              <b>{option.label}</b>
              <span>{option.sub}</span>
            </button>
          ))}
        </div>
        {selected ? (
          <>
            <div className="checkout-summary">
              <p style={{ fontSize: "13.5px", lineHeight: 1.6, margin: 0 }}>{selected.message}</p>
            </div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => finish(false)}>Continue with Free</button>
              <button className="btn primary" onClick={() => finish(true)}>See plans</button>
            </div>
          </>
        ) : null}
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <button
            type="button"
            onClick={skip}
            style={{
              background: "none",
              border: 0,
              color: "var(--mute)",
              font: "inherit",
              fontSize: "12.5px",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
