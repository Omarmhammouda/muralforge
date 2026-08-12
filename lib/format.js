const CURRENCY_SYMBOLS = { USD: "$", EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$", AED: "AED " };

export function money(value, currency = "USD") {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  const amount = Number(value) || 0;
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: amount % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export function shortDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function longDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function timeAgo(iso) {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function addDays(iso, days) {
  const date = iso ? new Date(iso) : new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString();
}
