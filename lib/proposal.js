/**
 * Proposal templates — sections of plain text with {{placeholders}}.
 *
 * Any {{Field name}} the template author invents becomes an intake-form field
 * automatically. A few placeholders are special blocks instead of fields:
 *   {{pricing}}  — itemized pricing table with auto-total
 *   {{mockups}}  — attached mockup images
 *   {{date}}     — today's date
 *   {{total}}    — the pricing total as text
 */

export const SPECIAL_FIELDS = new Set(["pricing", "mockups", "date", "total"]);

export const TEMPLATE_STORAGE_KEY = "mf_proposal_template";
export const INTAKE_STORAGE_KEY = "mf_proposal_intake";

export const DEFAULT_TEMPLATE = [
  {
    title: "Mural Proposal — {{Business name}}",
    body: "Prepared for {{Client name}} by OMH Studios · {{date}}\nContact: omar@omhstudios.com",
  },
  {
    title: "The Wall",
    body: "Location: {{Wall location}}\nSize: {{Wall width}} × {{Wall height}}\nSurface: {{Surface type}} ({{Indoor or outdoor}})\nCondition notes: {{Wall condition notes}}",
  },
  {
    title: "The Concept",
    body: "{{Concept description}}\n\n{{mockups}}\n\nThese previews were generated on a photo of the actual wall — the final mural is painted by hand, and we refine the design with you before brushes touch the wall.",
  },
  {
    title: "Scope of Work",
    body: "- Surface prep and priming\n- All paints and materials (exterior-grade, UV-sealed where needed)\n- Painting of the approved design\n- Protective clear coat\n- Site cleanup",
  },
  {
    title: "Investment",
    body: "{{pricing}}\nA 50% deposit reserves the start date; the balance is due on completion.",
  },
  {
    title: "Timeline",
    body: "Estimated painting time: {{Estimated days}} days, starting {{Proposed start date}}. Weather days (exterior walls) extend the schedule, never the price.",
  },
  {
    title: "Approval",
    body: "To go ahead, reply to this proposal or sign below. This quote is valid for 30 days.\n\nClient signature: ______________________        Date: ____________",
  },
];

const PLACEHOLDER = /\{\{([^}]+)\}\}/g;

/** Ordered, de-duplicated list of intake fields the template asks for. */
export function collectFields(sections) {
  const seen = new Set();
  const fields = [];
  for (const section of sections) {
    for (const text of [section.title, section.body]) {
      for (const match of String(text || "").matchAll(PLACEHOLDER)) {
        const name = match[1].trim();
        if (!name || SPECIAL_FIELDS.has(name.toLowerCase()) || seen.has(name)) continue;
        seen.add(name);
        fields.push(name);
      }
    }
  }
  return fields;
}

/** True when a section's body uses a given special block, e.g. "pricing". */
export function usesSpecial(sections, name) {
  return sections.some((section) =>
    [...String(section.body || "").matchAll(PLACEHOLDER)].some(
      (match) => match[1].trim().toLowerCase() === name,
    ),
  );
}

export function pricingTotal(rows) {
  return rows.reduce((sum, row) => {
    const parsed = Number.parseFloat(String(row.amount).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? sum + parsed : sum;
  }, 0);
}

export function money(value) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/** Replace text placeholders with intake values (specials handled by caller). */
export function fillText(text, values, pricingRows) {
  return String(text || "").replace(PLACEHOLDER, (whole, rawName) => {
    const name = rawName.trim();
    const lower = name.toLowerCase();
    if (lower === "date") {
      return new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    if (lower === "total") return money(pricingTotal(pricingRows || []));
    if (SPECIAL_FIELDS.has(lower)) return whole;
    const value = values[name];
    return value && String(value).trim() ? String(value) : "________";
  });
}
