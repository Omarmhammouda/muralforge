"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { actions, projectName, useData } from "@/lib/store";
import { PLANS, planPrice } from "@/lib/plans";
import { foundingAvailable, passForProject } from "@/lib/billing";

/**
 * Contextual paywall -> demo checkout -> success. Pass a `context` to open on
 * the paywall step, or a `plan` (without context) to jump straight to checkout.
 */

const PAYWALLS = {
  project: {
    title: "Ready for your next mural?",
    body: "Upgrade to Artist for up to 10 projects per month, or unlock this individual project for $9.",
    upgradeLabel: "Upgrade to Artist — $19/month",
    passLabel: "Unlock This Project — $9",
  },
  mockups: {
    title: "You've reached your mockup limit.",
    body: "Upgrade to Artist for 30 mockups per month, or unlock this individual project for $9.",
    upgradeLabel: "Upgrade to Artist — $19/month",
    passLabel: "Unlock This Project — $9",
  },
  proposals: {
    title: "You've reached your proposal limit.",
    body: "Upgrade to continue creating professional mural proposals, or purchase a Project Pass.",
    upgradeLabel: "Upgrade to Artist — $19/month",
    passLabel: "Unlock This Project — $9",
  },
  watermark: {
    title: "Remove the watermark and present your work professionally.",
    upgradeLabel: "Upgrade to Artist",
    passLabel: "Unlock This Project for $9",
    watermarkOption: true,
  },
  "pass-exports": {
    title: "This project's 3 clean exports are used.",
    body: "Upgrade to Artist for unlimited clean exports across every project.",
    upgradeLabel: "Upgrade to Artist — $19/month",
  },
};
PAYWALLS.export = PAYWALLS.watermark;

export default function UpgradeModal({
  context,
  projectId,
  plan,
  interval,
  onClose,
  onUnlocked,
  onContinueWatermark,
}) {
  const data = useData();
  const [step, setStep] = useState(context ? "paywall" : "checkout");
  const [planId, setPlanId] = useState(plan || "artist");
  const [billingInterval, setBillingInterval] = useState(interval || "monthly");

  useEffect(() => {
    if (step !== "success") return;
    const timer = setTimeout(() => {
      onUnlocked?.();
      onClose();
    }, 900);
    return () => clearTimeout(timer);
  }, [step, onUnlocked, onClose]);

  if (!data) return null;

  const planDef = PLANS[planId] || PLANS.artist;
  const isPass = planId === "pass";
  const isSub = planId === "artist" || planId === "studio";
  const foundingBlocked = planId === "founding" && !foundingAvailable(data.billing);
  // A project can hold one pass; buying a second delivers nothing.
  const hasPass = projectId ? Boolean(passForProject(data.billing, projectId)) : false;

  function goCheckout(id) {
    setPlanId(id);
    setStep("checkout");
  }

  function completePurchase() {
    if (isPass) {
      if (hasPass) return; // never charge for a duplicate pass
      actions.billingPurchasePass(projectId, 9, "Project Pass — " + (projectName(data, projectId) || "project"));
    } else if (planId === "founding") {
      if (foundingBlocked) return;
      actions.billingSubscribe("founding", "yearly", 99, "Founding Artist — $99/year");
    } else {
      const { amount } = planPrice(planDef, billingInterval);
      const per = billingInterval === "yearly" ? "year" : "month";
      actions.billingSubscribe(planId, billingInterval, amount, `${planDef.name} — $${amount}/${per}`);
    }
    setStep("success");
  }

  function renderPaywall() {
    const pw = PAYWALLS[context] || PAYWALLS.project;
    return (
      <div className="paywall">
        <h2>{pw.title}</h2>
        {pw.body ? <p>{pw.body}</p> : null}
        <div className="pw-actions">
          <button className="btn primary" onClick={() => goCheckout("artist")}>{pw.upgradeLabel}</button>
          {pw.passLabel && projectId && !hasPass ? (
            <button className="btn ghost" onClick={() => goCheckout("pass")}>{pw.passLabel}</button>
          ) : null}
        </div>
        {pw.watermarkOption && onContinueWatermark ? (
          <div className="pw-alt">
            <button
              onClick={() => {
                onContinueWatermark();
                onClose();
              }}
            >
              Continue with watermark
            </button>
          </div>
        ) : null}
        <div className="pw-alt">
          <Link href="/pricing">Compare all plans →</Link>
        </div>
      </div>
    );
  }

  function renderCheckout() {
    const price = planPrice(planDef, billingInterval);
    const billingLine =
      price.monthlyEquivalent != null
        ? `$${price.amount} / year (≈ $${price.monthlyEquivalent}/month)`
        : `$${price.amount} / ${price.suffix.replace("/", "").trim()}`;
    return (
      <>
        <h2>Checkout</h2>
        {isSub ? (
          <div className="interval-toggle" style={{ marginBottom: 12 }}>
            <button
              className={billingInterval === "monthly" ? "on" : ""}
              onClick={() => setBillingInterval("monthly")}
            >
              Monthly
            </button>
            <button
              className={billingInterval === "yearly" ? "on" : ""}
              onClick={() => setBillingInterval("yearly")}
            >
              Yearly{planDef.yearlySavings ? <span className="hint-save"> {planDef.yearlySavings}</span> : null}
            </button>
          </div>
        ) : null}
        <div className="checkout-summary">
          {isPass ? (
            <>
              <div className="row-line"><span>Plan</span><span>Project Pass — one-time $9</span></div>
              <div className="row-line"><span>Project</span><span>{projectName(data, projectId) || "New project"}</span></div>
              <div className="row-line total"><span>Due today</span><span>$9</span></div>
            </>
          ) : (
            <>
              <div className="row-line"><span>Plan</span><span>{planDef.name}</span></div>
              <div className="row-line"><span>Billing</span><span>{billingLine}</span></div>
              <div className="row-line total"><span>Due today</span><span>${price.amount}</span></div>
            </>
          )}
        </div>
        <div className="demo-note">
          Demo checkout — Stripe connects with the accounts backend; this unlocks instantly in this browser.
        </div>
        {foundingBlocked ? (
          <p className="saving-note" style={{ marginBottom: 12 }}>
            All Founding Artist spots have been claimed.
          </p>
        ) : null}
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={completePurchase} disabled={foundingBlocked}>
            Complete purchase
          </button>
        </div>
      </>
    );
  }

  function renderSuccess() {
    return (
      <div className="paywall">
        <h2>You're unlocked.</h2>
        <p>Your new limits are live in this browser.</p>
      </div>
    );
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        {step === "paywall" ? renderPaywall() : step === "checkout" ? renderCheckout() : renderSuccess()}
      </div>
    </div>
  );
}
