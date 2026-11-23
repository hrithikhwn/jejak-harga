import { useLanguage } from "../i18n/language.jsx";
import { formatCount, formatMonth } from "../lib/format.js";
import { GITHUB_URL } from "./Header.jsx";

// How the numbers are worked out, what they can't tell you, and the data-quality
// counts from quality.json (what the pipeline drops before adding anything up)
export default function Method({ meta, quality }) {
  const { lang, t } = useLanguage();
  const totals = quality.months.reduce(
    (sum, month) => ({
      rows: sum.rows + month.price_rows,
      unknownItems: sum.unknownItems + month.unknown_item_rows,
      unknownShops: sum.unknownShops + month.unknown_shop_rows,
      badPrices: sum.badPrices + month.bad_price_rows,
      duplicates: sum.duplicates + month.duplicate_rows,
    }),
    { rows: 0, unknownItems: 0, unknownShops: 0, badPrices: 0, duplicates: 0 },
  );
  const count = (n) => formatCount(n, lang);
  const share = ((100 * totals.unknownItems) / totals.rows).toFixed(1);

  return (
    <section className="section method" aria-labelledby="method-title">
      <div className="container">
        <h2 id="method-title">{t("method.title")}</h2>

        <h3>{t("method.howTitle")}</h3>
        <ol>
          <li>{t("method.how1")}</li>
          <li>{t("method.how2", { state: meta.state })}</li>
          <li>{t("method.how3")}</li>
          <li>{t("method.how4", { min: meta.min_shops })}</li>
          <li>{t("method.how5")}</li>
        </ol>

        <h3>{t("method.limitsTitle")}</h3>
        <ul>
          <li>{t("method.limit1")}</li>
          <li>{t("method.limit2")}</li>
          <li>{t("method.limit3", { min: meta.min_shops })}</li>
          <li>{t("method.limit4")}</li>
          <li>{t("method.limit5")}</li>
          <li>{t("method.limit6")}</li>
        </ul>

        <h3>{t("method.qualityTitle")}</h3>
        <p>{t("method.qualityIntro", { month: formatMonth(quality.months[0].month, t), rows: count(totals.rows) })}</p>
        <ul>
          <li>{t("method.unknownItems", { n: count(totals.unknownItems), share })}</li>
          <li>{t("method.unknownShops", { n: count(totals.unknownShops) })}</li>
          <li>{t("method.badPrices", { n: count(totals.badPrices) })}</li>
        </ul>
        <p>{t("method.duplicates", { n: count(totals.duplicates) })}</p>
        <p>
          {t("method.code", { github: <a href={GITHUB_URL}>GitHub</a> })}
        </p>
      </div>
    </section>
  );
}
