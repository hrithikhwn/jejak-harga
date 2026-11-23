// Formatting shared by every component. Prices read the same in both languages
// ("RM144.98"); dates keep the "Apr 2022" style with each language's month names.

const MINUS = "−"; // a real minus sign, wider and clearer than a hyphen

function sign(n) {
  return n > 0 ? "+" : n < 0 ? MINUS : "";
}

// Prices have at most 4 decimal places, and some end in exactly half a sen (a median of
// two prices is their average). toFixed(2) would round those whichever way the stored
// binary number happens to fall, so count in RM0.0001 first, then round half a sen up:
// the same rule the basket totals use.
export function formatRM(value) {
  if (value === null || value === undefined) return "–";
  const sen = Math.round(Math.round(value * 10000) / 100);
  return `RM${(sen / 100).toFixed(2)}`;
}

// Changes always carry a sign, so colour is never the only way to tell up from down
export function formatRMChange(value) {
  if (value === null) return "–";
  const sen = Math.round(value * 100);
  return `${sign(sen)}RM${(Math.abs(sen) / 100).toFixed(2)}`;
}

export function formatPercent(value) {
  if (value === null) return "–";
  const whole = Math.round(value);
  return `${sign(whole)}${Math.abs(whole)}%`;
}

// "up", "down" or "flat", judged on the rounded percentage people actually see,
// so a change shown as "0%" is never coloured
export function direction(percent) {
  const whole = Math.round(percent ?? 0);
  return whole > 0 ? "up" : whole < 0 ? "down" : "flat";
}

// "2022-04" -> "Apr 2022" (Malay: "Apr 2022", "Ogo 2022", ...)
export function formatMonth(month, t) {
  const [year, m] = month.split("-");
  return `${t(`month.${Number(m)}`)} ${year}`;
}

// "2026-11-22" -> "22 Nov 2026"
export function formatDate(day, t) {
  const [year, m, d] = day.split("-");
  return `${Number(d)} ${t(`month.${Number(m)}`)} ${year}`;
}

// 132456789 -> "132,456,789" (both languages group thousands with commas in Malaysia)
export function formatCount(value, lang) {
  return new Intl.NumberFormat(lang === "ms" ? "ms-MY" : "en-MY").format(value);
}
