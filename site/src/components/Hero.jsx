import { useT } from "../i18n/language.jsx";
import { BASE_MONTH, biggestMovers, percentChange } from "../lib/basket.js";
import { itemName, itemUnit } from "../lib/content.js";
import {
  direction,
  formatDate,
  formatMonth,
  formatPercent,
  formatRM,
  formatRMChange,
} from "../lib/format.js";

// "Harga naik?" and three cards: the basket cost now, and the items that rose and
// fell the most since BASE_MONTH. Big numbers first; the detail is further down.
export default function Hero({ view }) {
  const t = useT();
  const { meta, items, months, selected, basket, current, base } = view;
  const month = months[current];
  const baseCost = base >= 0 ? basket[base] : null;
  const change = percentChange(baseCost, basket[current]);
  const movers = biggestMovers(items, base, current);
  const since = formatMonth(BASE_MONTH, t);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container">
        <h1 id="hero-title" className="hero-title">
          {t("hero.title")}
        </h1>
        <p className="hero-subtitle">{t("hero.subtitle")}</p>

        <div className="hero-cards">
          <article className="card stat">
            <p className="stat-label">{t("hero.basket", { month: formatMonth(month, t) })}</p>
            <p className="stat-value hero-figure">{formatRM(basket[current])}</p>
            {change !== null && (
              <p className={`delta ${direction(change)}`}>
                {t("hero.since", {
                  change: `${formatRMChange(basket[current] - baseCost)} (${formatPercent(change)})`,
                  month: since,
                })}
              </p>
            )}
            {month === meta.partial_month && (
              <p className="stat-note">{t("hero.partial", { date: formatDate(meta.data_until, t) })}</p>
            )}
            {selected.size < items.items.length && (
              <p className="stat-note">
                {t("hero.someItems", { n: selected.size, total: items.items.length })}
              </p>
            )}
          </article>

          <MoverCard label={t("hero.riser", { month: since })} mover={movers.riser} empty={t("hero.noRiser")} />
          <MoverCard label={t("hero.faller", { month: since })} mover={movers.faller} empty={t("hero.noFaller")} />
        </div>
      </div>
    </section>
  );
}

function MoverCard({ label, mover, empty }) {
  return (
    <article className="card stat">
      <p className="stat-label">{label}</p>
      {mover ? (
        <>
          <p className="stat-item">
            {itemName(mover.item)} <span className="unit">{itemUnit(mover.item)}</span>
          </p>
          <p className="stat-value">{formatPercent(mover.change)}</p>
          <p className={`delta ${direction(mover.change)}`}>
            {formatRM(mover.from)} → {formatRM(mover.to)}
          </p>
        </>
      ) : (
        <p className="stat-note">{empty}</p>
      )}
    </article>
  );
}
