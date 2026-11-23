// Basket maths. The site adds up the basket itself, so people can switch items on and off.
// Prices come from items.json and item_districts.json, written by pipeline/build.py:
// price[i] belongs to months[i], and is null when fewer than min_shops shops priced
// the item that month.

// Every "since ..." comparison on the site starts here, as WEB_UI.md asks
export const BASE_MONTH = "2022-04";

// A district whose basket is within this many percent of the state-wide basket counts
// as "about the same": a different mix of shops can move a district's cost that much.
// It's the smallest step WEB_UI.md's heat map uses for "Compared with Selangor".
export const SAME_PERCENT = 2;

// Prices have at most 4 decimal places, because they're medians of prices in sen.
// Adding them as whole numbers of RM0.0001 keeps the total exact, and rounding half
// a sen up then matches the pipeline's 04_basket.sql to the sen. Adding the decimals
// directly can land a hair under a half sen (134.10499...) and round down instead.
export function sumPrices(prices) {
  if (prices.length === 0 || prices.some((price) => price === null)) return null;
  const total = prices.reduce((sum, price) => sum + Math.round(price * 10000), 0);
  return Math.floor((total + 50) / 100) / 100;
}

// The basket cost each month: the chosen items' prices added up, or null in a month
// where any chosen item has no price. That's the same rule the pipeline applies.
function basketByMonth(priceLists, monthCount) {
  return Array.from({ length: monthCount }, (_, i) => sumPrices(priceLists.map((prices) => prices[i])));
}

// selected is a Set of item codes
export function stateBasket(items, selected) {
  const lists = items.items.filter((item) => selected.has(item.item_code)).map((item) => item.price);
  return basketByMonth(lists, items.months.length);
}

export function districtBasket(itemDistricts, district, selected) {
  const prices = itemDistricts.districts[district];
  const none = itemDistricts.months.map(() => null);
  const lists = [...selected].map((code) => prices[String(code)]?.price ?? none);
  return basketByMonth(lists, itemDistricts.months.length);
}

// The chosen items that keep a district from having a basket in month i, with how many
// shops priced each one (fewer than min_shops, possibly none)
export function missingItems(itemDistricts, district, selected, i) {
  const prices = itemDistricts.districts[district];
  return [...selected]
    .filter((code) => (prices[String(code)]?.price[i] ?? null) === null)
    .map((code) => ({ code, shops: prices[String(code)]?.shops[i] ?? 0 }));
}

export function lastIndexWithValue(series, upTo = series.length - 1) {
  for (let i = upTo; i >= 0; i -= 1) {
    if (series[i] !== null) return i;
  }
  return -1;
}

export function percentChange(from, to) {
  return from === null || to === null || from === 0 ? null : (to / from - 1) * 100;
}

// How a district's basket compares with the state-wide basket in the same month:
// { kind: "same" | "dearer" | "cheaper", amount: the gap in RM (to the sen), percent }
export function compareWithState(cost, stateCost) {
  const percent = percentChange(stateCost, cost);
  if (percent === null) return null;
  const amount = Math.abs(Math.round((cost - stateCost) * 100)) / 100;
  if (Math.abs(percent) < SAME_PERCENT) return { kind: "same", amount, percent };
  return { kind: percent > 0 ? "dearer" : "cheaper", amount, percent };
}

// The official food CPI is an index (2010 = 100), not ringgit. To show it on the same
// axis as the basket, rescale it to the basket's cost in BASE_MONTH, so both lines meet
// there: "what the basket would cost had it moved like the official index".
// One axis, no second scale to misread.
export function scaledCpi(months, cpiRows, basket) {
  const cpi = new Map(cpiRows.map((row) => [row.month, row.food_cpi]));
  const base = months.indexOf(BASE_MONTH);
  if (base === -1 || basket[base] === null || !cpi.has(BASE_MONTH)) return months.map(() => null);
  const factor = basket[base] / cpi.get(BASE_MONTH);
  return months.map((month) => (cpi.has(month) ? Math.round(cpi.get(month) * factor * 100) / 100 : null));
}

// The items whose typical price rose and fell the most between two months.
// riser or faller is null when nothing went that way.
export function biggestMovers(items, fromIndex, toIndex) {
  const changes = items.items
    .map((item) => ({ item, from: item.price[fromIndex], to: item.price[toIndex] }))
    .filter(({ from, to }) => from !== null && to !== null)
    .map((entry) => ({ ...entry, change: percentChange(entry.from, entry.to) }))
    .sort((a, b) => b.change - a.change);
  const riser = changes[0];
  const faller = changes[changes.length - 1];
  return {
    riser: riser && riser.change > 0 ? riser : null,
    faller: faller && faller.change < 0 ? faller : null,
  };
}
