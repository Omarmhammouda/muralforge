/**
 * Pricing configuration — the single source of truth for plans, limits, and
 * copy. Change limits here; enforcement reads this at runtime, so no code
 * changes are needed to tune the model. `Infinity` means unlimited.
 */

export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Experience the full workflow — no credit card required.",
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      activeProjects: 1,
      mockupsPerMonth: 2,
      proposalsPerMonth: 1,
      clients: 3,
      seats: 1,
      watermark: true,
      customBranding: false,
      premiumTemplates: false,
      approvalLinks: false,
    },
    features: [
      "1 active project",
      "2 mockups per month",
      "1 proposal per month",
      "Basic proposal template",
      "Watermarked exports",
      "Client & project management",
    ],
    cta: "Start free",
  },

  pass: {
    id: "pass",
    name: "Project Pass",
    tagline: "Only working on one mural? No subscription needed.",
    priceOnce: 9,
    limits: {
      exportsPerPass: 3,
      watermark: false,
    },
    features: [
      "Unlocks one project",
      "3 clean mockup exports",
      "1 professional proposal",
      "PDF export, no watermark",
      "Project stays saved forever",
    ],
    cta: "Unlock a project — $9",
  },

  artist: {
    id: "artist",
    name: "Artist",
    tagline: "For independent mural artists and freelancers.",
    priceMonthly: 19,
    priceYearly: 180,
    yearlySavings: "Save 21%",
    popular: true,
    limits: {
      activeProjects: 10,
      mockupsPerMonth: 30,
      proposalsPerMonth: 10,
      clients: Infinity,
      seats: 1,
      watermark: false,
      customBranding: true,
      premiumTemplates: true,
      approvalLinks: false,
    },
    features: [
      "10 projects per month",
      "30 mockups per month",
      "10 proposals per month",
      "No watermarks · PDF export",
      "Custom logo & branding",
      "Saved proposal templates",
      "Premium proposal layouts",
      "Unlimited clients & history",
    ],
    cta: "Upgrade to Artist",
  },

  studio: {
    id: "studio",
    name: "Studio",
    tagline: "For mural agencies and small teams.",
    priceMonthly: 49,
    priceYearly: 468,
    yearlySavings: "Save 20%",
    seatPrice: 10,
    limits: {
      activeProjects: Infinity,
      mockupsPerMonth: Infinity,
      proposalsPerMonth: Infinity,
      clients: Infinity,
      seats: 5,
      watermark: false,
      customBranding: true,
      premiumTemplates: true,
      approvalLinks: true,
    },
    features: [
      "Everything in Artist",
      "Unlimited projects & proposals",
      "Unlimited mockups",
      "Up to 5 team members",
      "Shared workspace & templates",
      "Client approval links",
      "Project status pipeline",
      "Priority support",
    ],
    cta: "Upgrade to Studio",
  },

  founding: {
    id: "founding",
    name: "Founding Artist",
    tagline: "Everything in Artist — locked-in launch pricing, forever.",
    priceYearly: 99,
    yearlyOnly: true,
    limit: 100,
    limits: null, // inherits Artist limits
    features: [
      "Everything in Artist",
      "Locked-in $99/year while active",
      "Founding Artist badge",
      "Early access to new features",
      "Priority on feature requests",
    ],
    cta: "Claim Founding Artist — $99/yr",
  },
};

/** Comparison table rows: [label, free, pass, artist, studio] */
export const COMPARISON = [
  ["Active projects", "1", "1", "10 / month", "Unlimited"],
  ["Mockups", "2 / month", "3 / project", "30 / month", "Unlimited"],
  ["Proposals", "1 / month", "1", "10 / month", "Unlimited"],
  ["PDF export", "Watermarked", "Yes", "Yes", "Yes"],
  ["Watermark", "Yes", "No", "No", "No"],
  ["Saved clients", "3", "Yes", "Unlimited", "Unlimited"],
  ["Custom branding", "—", "—", "Yes", "Yes"],
  ["Proposal templates", "Basic", "Basic", "Premium", "Premium"],
  ["Team members", "1", "1", "1", "5 (+$10/seat)"],
  ["Client approval links", "—", "—", "—", "Yes"],
];

export const ONBOARDING_OPTIONS = [
  {
    id: "occasional",
    label: "Occasionally",
    sub: "1–2 projects per month",
    recommend: "pass",
    message: "A $9 Project Pass may be the best fit — pay only when you have a mural on.",
  },
  {
    id: "regular",
    label: "Regularly",
    sub: "3–10 projects per month",
    recommend: "artist",
    message: "Artist is recommended for your workflow — 10 projects and 30 mockups a month.",
  },
  {
    id: "frequent",
    label: "Frequently",
    sub: "10+ projects per month",
    recommend: "studio",
    message: "Studio removes every limit so volume never slows you down.",
  },
  {
    id: "agency",
    label: "I run a studio or agency",
    sub: "Team of 2 or more",
    recommend: "studio",
    message: "Studio gives your team shared projects, clients, and proposal templates.",
  },
];

export function planPrice(plan, interval) {
  if (plan.priceOnce != null) return { amount: plan.priceOnce, suffix: " one-time" };
  if (plan.yearlyOnly) return { amount: plan.priceYearly, suffix: "/year" };
  if (interval === "yearly" && plan.priceYearly != null) {
    return {
      amount: plan.priceYearly,
      suffix: "/year",
      monthlyEquivalent: Math.round((plan.priceYearly / 12) * 100) / 100,
    };
  }
  return { amount: plan.priceMonthly, suffix: "/month" };
}
