"use client";

import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import UpgradeModal from "@/components/UpgradeModal";
import { effectivePlanId, foundingAvailable } from "@/lib/billing";
import { COMPARISON, PLANS, planPrice } from "@/lib/plans";
import { useData } from "@/lib/store";

const CARD_ORDER = ["free", "pass", "artist", "studio"];

export default function PricingPage() {
  const data = useData();
  const [interval, setIntervalPick] = useState("monthly");
  const [checkout, setCheckout] = useState(null);

  if (!data) return <AppShell title="Pricing" />;

  const currentPlan = effectivePlanId(data.billing);
  const showFounding = foundingAvailable(data.billing);
  const foundingLeft = PLANS.founding.limit - data.billing.founding.claimed;

  return (
    <AppShell title="Pricing">
      <div className="pricing-hero">
        <h2>From Mockup to Signed Project.</h2>
        <p>
          Create realistic mural concepts, turn them into professional proposals, and keep
          every client project organized in one place.
        </p>
      </div>

      <div className="interval-toggle">
        <button
          className={interval === "monthly" ? "on" : ""}
          onClick={() => setIntervalPick("monthly")}
        >
          Monthly
        </button>
        <button
          className={interval === "yearly" ? "on" : ""}
          onClick={() => setIntervalPick("yearly")}
        >
          Yearly <span className="hint-save">Save up to 21%</span>
        </button>
      </div>

      {showFounding && (
        <div className="founding-banner">
          <div className="fb-body">
            <b>{PLANS.founding.name} — $99/year</b>
            <p>{PLANS.founding.tagline}</p>
            <p>
              Limited to the first 100 artists.{" "}
              <span className="count">{foundingLeft} spots left</span>
            </p>
          </div>
          <button
            className="btn primary"
            onClick={() => setCheckout({ plan: "founding", interval: "yearly" })}
          >
            {PLANS.founding.cta}
          </button>
        </div>
      )}

      <div className="plan-grid">
        {CARD_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const price = planPrice(plan, interval);
          const isCurrent = currentPlan === planId;
          const isPopular = Boolean(plan.popular);
          const yearlyNote =
            interval === "yearly" && price.monthlyEquivalent && plan.yearlySavings
              ? `$${price.monthlyEquivalent}/mo equivalent · ${plan.yearlySavings}`
              : "";
          return (
            <div key={planId} className={`plan-card${isPopular ? " popular" : ""}`}>
              {isPopular && <div className="pop-tag">MOST POPULAR</div>}
              <h4>{plan.name}</h4>
              <div className="tagline">{plan.tagline}</div>
              <div className="price">
                ${price.amount}
                <small>{price.suffix}</small>
              </div>
              <div className="price-note">{yearlyNote}</div>
              {planId === "studio" && (
                <div className="price-note">+$10/month per additional seat</div>
              )}
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {isCurrent ? (
                <button className="btn ghost" disabled>
                  Current plan
                </button>
              ) : planId === "free" ? (
                <Link className="btn ghost" href="/">
                  Start free
                </Link>
              ) : (
                <button
                  className={`btn ${isPopular ? "primary" : "ghost"}`}
                  onClick={() => setCheckout({ plan: planId, interval })}
                >
                  {plan.cta}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ textAlign: "center", color: "var(--mute)", fontSize: 13, margin: "-12px 0 28px" }}>
        No hidden charges · Cancel anytime · Your work is never deleted.
      </p>

      <div className="card">
        <h3 style={{ margin: "0 0 12px" }}>Compare plans</h3>
        <div className="compare-wrap">
          <table className="compare">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Free</th>
                <th>Project Pass</th>
                <th className="col-pop">Artist</th>
                <th>Studio</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) => (
                    <td key={index} className={index === 3 ? "col-pop" : ""}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {checkout && (
        <UpgradeModal
          plan={checkout.plan}
          interval={checkout.interval}
          onClose={() => setCheckout(null)}
        />
      )}
    </AppShell>
  );
}
