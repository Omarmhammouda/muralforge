"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import UpgradeModal from "@/components/UpgradeModal";
import { actions, projectName, useData } from "@/lib/store";
import { PLANS } from "@/lib/plans";
import { effectivePlanId, periodEnd, usageSummary } from "@/lib/billing";
import { longDate, money, shortDate } from "@/lib/format";

export default function BillingPage() {
  const data = useData();
  const [modal, setModal] = useState(null);

  if (!data) return <AppShell title="Billing" />;

  const billing = data.billing;
  const planId = effectivePlanId(billing);
  const plan = PLANS[planId] || PLANS.free;
  const end = periodEnd(billing);
  const canSwitchInterval =
    planId !== "free" && plan.priceMonthly != null && plan.priceYearly != null;
  const otherInterval = billing.interval === "yearly" ? "monthly" : "yearly";
  const meters = usageSummary(data);
  const passExportMax = PLANS.pass.limits.exportsPerPass;
  const seatsIncluded = PLANS.studio.limits.seats;
  const seatPrice = PLANS.studio.seatPrice;
  const seats = billing.seats || seatsIncluded;
  const extraSeats = Math.max(0, seats - seatsIncluded);

  function cancelPlan() {
    if (confirm("Cancel your subscription? You keep access until the end of the current billing period.")) {
      actions.billingCancel(end ? end.toISOString() : null);
    }
  }

  function setSeats(next) {
    actions.billingPatch({ seats: Math.min(10, Math.max(1, next)) });
  }

  return (
    <AppShell title="Billing">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card">
          <h3>Current plan</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="plan-pill">{plan.name}</span>
            {planId === "founding" ? <span className="founding-badge">FOUNDING ARTIST</span> : null}
            {planId !== "free" ? (
              <span className="saving-note">Billed {billing.interval === "yearly" || planId === "founding" ? "yearly" : "monthly"}</span>
            ) : null}
          </div>

          {end ? (
            billing.cancelAtPeriodEnd ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
                <span style={{ fontSize: 13.5 }}>
                  Access until {longDate(end)} — then moves to Free
                </span>
                <button className="btn primary" onClick={() => actions.billingResume()}>
                  Resume subscription
                </button>
              </div>
            ) : (
              <p style={{ fontSize: 13.5, marginTop: 14 }}>Renews {longDate(end)}</p>
            )
          ) : null}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
            <a className="btn" href="/pricing">Change plan</a>
            {canSwitchInterval ? (
              <button
                className="btn ghost"
                onClick={() => setModal({ plan: planId, interval: otherInterval })}
              >
                Switch to {otherInterval}
              </button>
            ) : null}
            {planId !== "free" && !billing.cancelAtPeriodEnd ? (
              <button className="btn ghost danger" onClick={cancelPlan}>
                Cancel subscription
              </button>
            ) : null}
          </div>

          {billing.cancelAtPeriodEnd ? (
            <p className="saving-note" style={{ marginTop: 12 }}>
              Your plan will change at the end of your current billing period. Projects and files will remain saved, but some features may become unavailable until you upgrade again.
            </p>
          ) : null}
        </div>

        <div className="card">
          <h3>Usage</h3>
          {meters.map((m) => {
            const finite = m.limit !== Infinity;
            const pct = finite ? Math.min(100, (m.used / m.limit) * 100) : 6;
            const warn = finite && m.used / m.limit >= 0.8;
            return (
              <div key={m.label} className={`meter${warn ? " warn" : ""}`}>
                <div className="meter-head">
                  <span>{m.label}</span>
                  <b>{m.used} / {m.display}</b>
                </div>
                <div className="bar">
                  <i style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {billing.passes.length ? (
          <div className="card">
            <h3>Project Passes</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Purchased</th>
                  <th>Exports</th>
                  <th>Proposal used</th>
                </tr>
              </thead>
              <tbody>
                {billing.passes.map((pass) => (
                  <tr key={pass.id}>
                    <td>{projectName(data, pass.projectId)}</td>
                    <td>{shortDate(pass.purchasedAt)}</td>
                    <td>{pass.exportsUsed} / {passExportMax}</td>
                    <td>{pass.proposalUsed ? "Yes" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {planId === "studio" ? (
          <div className="card">
            <h3>Team seats</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button className="btn mini" onClick={() => setSeats(seats - 1)} disabled={seats <= 1}>
                −
              </button>
              <b style={{ fontSize: 18 }}>{seats}</b>
              <button className="btn mini" onClick={() => setSeats(seats + 1)} disabled={seats >= 10}>
                +
              </button>
              <span style={{ fontSize: 13.5 }}>
                {extraSeats
                  ? `${extraSeats} additional seat${extraSeats === 1 ? "" : "s"} · ${money(extraSeats * seatPrice)}/month extra`
                  : "No additional seats"}
              </span>
            </div>
            <p className="saving-note" style={{ marginTop: 10 }}>
              5 seats included · additional seats $10/month each — demo only until team accounts ship
            </p>
          </div>
        ) : null}

        <div className="card">
          <h3>Payment method</h3>
          <p style={{ fontSize: 13.5, color: "var(--mute)" }}>
            Demo mode — no card on file. Stripe connects when the accounts backend ships.
          </p>
        </div>

        <div className="card">
          <h3>Billing history</h3>
          {billing.history.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {billing.history.map((item) => (
                  <tr key={item.id}>
                    <td>{shortDate(item.at)}</td>
                    <td>{item.description}</td>
                    <td>{money(item.amount, "USD")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">No payments yet.</div>
          )}
        </div>

        <div className="card">
          <h3>Founding Artist offer</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              className="btn ghost"
              onClick={() =>
                actions.billingPatch({
                  founding: { ...billing.founding, enabled: !billing.founding.enabled },
                })
              }
            >
              {billing.founding.enabled ? "Disable offer" : "Enable offer"}
            </button>
            <span style={{ fontSize: 13.5 }}>
              {billing.founding.claimed} of {PLANS.founding.limit} claimed
            </span>
          </div>
          <p className="saving-note" style={{ marginTop: 10 }}>
            Claim counting is per-browser until the accounts backend ships — no fake scarcity: the offer hides automatically at 100.
          </p>
        </div>
      </div>

      {modal ? (
        <UpgradeModal
          plan={modal.plan}
          interval={modal.interval}
          onClose={() => setModal(null)}
        />
      ) : null}
    </AppShell>
  );
}
