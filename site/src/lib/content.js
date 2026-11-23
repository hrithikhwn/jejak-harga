import names from "../content/item_names.json";
import { percentChange } from "./basket.js";
import { formatPercent, formatRM } from "./format.js";

// Short Malay item names, from the basket table in ROADMAP.md. They read the same in
// both languages. An item missing from the list falls back to PriceCatcher's own name.
export function itemName(item) {
  return names[String(item.item_code)]?.name ?? item.item;
}

export function itemUnit(item) {
  return names[String(item.item_code)]?.unit ?? item.unit;
}

// Findings quote prices through placeholders, so their numbers always match the data:
//   {price:2023-04}          the item's typical Selangor price that month
//   {change:2023-04:2024-04} the change between two months, e.g. "+35%"
// A placeholder that can't be filled is left as it is (and fails the content test).
export function fillFinding(text, item, months) {
  const priceIn = (month) => {
    const i = months.indexOf(month);
    return i === -1 ? null : item.price[i];
  };
  return text.replace(/\{(price|change):([\d-]+)(?::([\d-]+))?\}/g, (match, kind, from, to) => {
    if (kind === "price") {
      const price = priceIn(from);
      return price === null ? match : formatRM(price);
    }
    const change = percentChange(priceIn(from), priceIn(to));
    return change === null ? match : formatPercent(change);
  });
}
