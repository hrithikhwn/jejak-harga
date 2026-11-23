import findings from "../content/findings.json";
import { useLanguage } from "../i18n/language.jsx";
import { fillFinding } from "../lib/content.js";

// One or two short, sourced findings (content/findings.json, in both languages)
export default function Findings({ items }) {
  const { lang, t } = useLanguage();
  return (
    <section className="section" aria-labelledby="findings-title">
      <div className="container">
        <h2 id="findings-title">{t("findings.title")}</h2>
        <div className="finding-grid">
          {findings.map((finding) => {
            const item = items.items.find((candidate) => candidate.item_code === finding.item_code);
            return (
              <article className="finding" key={finding.item_code}>
                <h3>{fillFinding(finding.title[lang], item, items.months)}</h3>
                <p>{fillFinding(finding.text[lang], item, items.months)}</p>
                <p className="finding-source">
                  {t("findings.source")} <a href={finding.source.url}>{finding.source.name}</a>
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
