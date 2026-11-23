import { useT } from "../i18n/language.jsx";
import {
  compareWithState,
  districtBasket,
  lastIndexWithValue,
  missingItems,
  SAME_PERCENT,
} from "../lib/basket.js";
import { itemName } from "../lib/content.js";
import { formatMonth, formatRM } from "../lib/format.js";

// One card per district: its basket cost in the current month compared with the
// state-wide basket, or why it isn't shown (the items with fewer than min_shops shops
// there) and when it last had a cost.
export default function Districts({ view }) {
  const t = useT();
  const { meta, itemDistricts, months, basket, current } = view;
  const names = Object.keys(itemDistricts.districts).sort();
  return (
    <section className="section" aria-labelledby="districts-title">
      <div className="container">
        <h2 id="districts-title">{t("districts.title")}</h2>
        <p className="section-intro">
          {t("districts.caption", {
            month: formatMonth(months[current], t),
            state: meta.state,
            stateCost: formatRM(basket[current]),
            same: SAME_PERCENT,
            min: meta.min_shops,
          })}
        </p>
        <ul className="district-grid">
          {names.map((name) => (
            <DistrictCard key={name} name={name} view={view} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function DistrictCard({ name, view }) {
  const t = useT();
  const { meta, items, itemDistricts, months, selected, basket, current } = view;
  const series = districtBasket(itemDistricts, name, selected);
  const cost = series[current];

  if (cost !== null) {
    // Said in words ("dearer", "cheaper", "about the same"), so colour is never the only
    // signal. Gaps under SAME_PERCENT get no colour at all.
    const comparison = compareWithState(cost, basket[current]);
    const text =
      comparison.kind === "same"
        ? t("districts.same", { state: meta.state })
        : t(comparison.kind === "dearer" ? "districts.dearer" : "districts.cheaper", {
            amount: formatRM(comparison.amount),
            percent: `${Math.round(Math.abs(comparison.percent))}%`,
            state: meta.state,
          });
    const colour = { dearer: "up", cheaper: "down", same: "flat" }[comparison.kind];
    return (
      <li className="card district">
        <h3>{name}</h3>
        <p className="district-cost">{formatRM(cost)}</p>
        <p className={`delta ${colour}`}>{text}</p>
      </li>
    );
  }

  // Not shown: say which items lacked shops, and when the district last had a cost
  const byCode = new Map(items.items.map((item) => [item.item_code, item]));
  const missing = missingItems(itemDistricts, name, selected, current);
  const previous = lastIndexWithValue(series, current - 1);
  return (
    <li className="card district not-shown">
      <h3>{name}</h3>
      <p className="district-status">{t("districts.notShown")}</p>
      <ul className="missing-list">
        {missing.slice(0, 3).map(({ code, shops }) => (
          <li key={code}>
            {itemName(byCode.get(code))}:{" "}
            {shops === 0 ? t("districts.noShops") : t(shops === 1 ? "districts.shop" : "districts.shops", { n: shops })}
          </li>
        ))}
        {missing.length > 3 && <li>{t("districts.moreItems", { n: missing.length - 3 })}</li>}
      </ul>
      <p className="stat-note">
        {previous >= 0
          ? t("districts.lastShown", { month: formatMonth(months[previous], t), cost: formatRM(series[previous]) })
          : t("districts.never", { month: formatMonth(months[0], t) })}
      </p>
    </li>
  );
}
