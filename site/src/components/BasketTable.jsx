import { useT } from "../i18n/language.jsx";
import { BASE_MONTH, percentChange } from "../lib/basket.js";
import { itemName, itemUnit } from "../lib/content.js";
import { direction, formatMonth, formatPercent, formatRM } from "../lib/format.js";

// The 15 items: each one's typical Selangor price in BASE_MONTH and now, and a button
// to take it out of the basket. The hero total, the chart and the district cards follow.
export default function BasketTable({ view, onChange }) {
  const t = useT();
  const { items, months, selected, basket, base, current } = view;
  const total = items.items.length;
  const then = formatMonth(BASE_MONTH, t);
  const now = formatMonth(months[current], t);

  function toggle(code) {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange(next);
  }

  return (
    <section className="section" aria-labelledby="basket-title">
      <div className="container">
        <h2 id="basket-title">{t("basket.title", { n: total })}</h2>
        <p className="section-intro">{t("basket.caption", { then, now })}</p>
        <p className="section-intro">{t("basket.colours")}</p>

        <div className="table-scroll" tabIndex={0} role="region" aria-labelledby="basket-title">
          <table className="basket-table">
            <thead>
              <tr>
                <th scope="col" className="sticky">
                  {t("basket.item")}
                </th>
                <th scope="col" className="num">
                  {then}
                </th>
                <th scope="col" className="num">
                  {now}
                </th>
                <th scope="col" className="num">
                  {t("basket.change")}
                </th>
                <th scope="col">{t("basket.inBasket")}</th>
              </tr>
            </thead>
            <tbody>
              {items.items.map((item) => {
                const on = selected.has(item.item_code);
                const from = base >= 0 ? item.price[base] : null;
                const to = item.price[current];
                const change = percentChange(from, to);
                const name = itemName(item);
                return (
                  <tr key={item.item_code} className={on ? undefined : "off"}>
                    <th scope="row" className="sticky">
                      {name} <span className="unit">{itemUnit(item)}</span>
                    </th>
                    <td className="num">{formatRM(from)}</td>
                    <td className="num">{formatRM(to)}</td>
                    <td className={`num delta ${direction(change)}`}>{formatPercent(change)}</td>
                    <td>
                      <button
                        type="button"
                        className="toggle"
                        aria-pressed={on}
                        // The accessible name starts with the visible words, then names the item
                        aria-label={`${t("basket.inBasket")}: ${name}`}
                        // Keep at least one item, or there's no basket to show
                        disabled={on && selected.size === 1}
                        onClick={() => toggle(item.item_code)}
                      >
                        <span className="toggle-box" aria-hidden="true">
                          {on ? "✓" : ""}
                        </span>
                        {t("basket.inBasket")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="sticky">
                  {t("basket.total", { n: selected.size, total })}
                </th>
                <td className="num">{formatRM(base >= 0 ? basket[base] : null)}</td>
                <td className="num">{formatRM(basket[current])}</td>
                <td className={`num delta ${direction(percentChange(basket[base] ?? null, basket[current]))}`}>
                  {formatPercent(percentChange(basket[base] ?? null, basket[current]))}
                </td>
                <td>
                  {selected.size < total && (
                    <button
                      type="button"
                      className="chip"
                      onClick={() => onChange(new Set(items.items.map((item) => item.item_code)))}
                    >
                      {t("basket.all", { total })}
                    </button>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}
