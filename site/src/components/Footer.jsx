import { useT } from "../i18n/language.jsx";
import { formatDate } from "../lib/format.js";
import { GITHUB_URL } from "./Header.jsx";

// Credits the data under its CC BY 4.0 licence, says the figures are calculated
// (not official statistics), and that the project isn't affiliated with KPDN or DOSM
export default function Footer({ meta }) {
  const t = useT();
  const [pricecatcher, cpi] = meta.sources;
  return (
    <footer className="site-footer">
      <div className="container">
        <p>
          {t("footer.data", {
            pricecatcher: <a href={pricecatcher.url}>PriceCatcher</a>,
            cpi: <a href={cpi.url}>{t("footer.cpiName")}</a>,
            licence: <a href={meta.licence.url}>{meta.licence.name}</a>,
          })}
        </p>
        <p>{t("footer.calculated")}</p>
        <p>{t("footer.independent")}</p>
        <p>
          {t("footer.updated", {
            date: formatDate(meta.last_updated, t),
            until: formatDate(meta.data_until, t),
          })}{" "}
          <a href={GITHUB_URL}>{t("footer.code")}</a>
        </p>
      </div>
    </footer>
  );
}
