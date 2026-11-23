import { useLanguage } from "../i18n/language.jsx";
import { formatDate } from "../lib/format.js";
import { TABS } from "./Tabs.jsx";

export const GITHUB_URL = "https://github.com/hrithikhwn/jejak-harga";

// The price map (WEB_UI.md section 5) is v2, so there's no Map link until it exists.
// Bakul, Daerah and Kaedah open their tab and bring it into view.
export default function Header({ meta, onOpenTab }) {
  const { t } = useLanguage();

  function openTab(event, id) {
    // Ctrl/Cmd/Shift-click still opens the link in a new tab or window, as usual
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onOpenTab(id, { scroll: true });
  }

  return (
    <header className="site-header" id="top">
      <div className="container header-row">
        <a className="logo" href="#top">
          Jejak Harga
        </a>
        <LanguageSwitch />
        <nav className="site-nav" aria-label={t("nav.label")}>
          <ul>
            {TABS.map((tab) => (
              <li key={tab.id}>
                <a href={`#${tab.id}`} onClick={(event) => openTab(event, tab.id)}>
                  {t(tab.label)}
                </a>
              </li>
            ))}
            <li>
              <a href={GITHUB_URL}>GitHub</a>
            </li>
          </ul>
        </nav>
        <p className="updated">{t("header.updated", { date: formatDate(meta.last_updated, t) })}</p>
      </div>
    </header>
  );
}

const LANGUAGES = [
  { code: "ms", short: "BM", name: "Bahasa Melayu" },
  { code: "en", short: "EN", name: "English" },
];

export function LanguageSwitch() {
  const { lang, setLang, t } = useLanguage();
  return (
    <div className="lang-switch" role="group" aria-label={t("lang.label")}>
      {LANGUAGES.map(({ code, short, name }) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={lang === code}
          aria-label={`${short} (${name})`}
          onClick={() => setLang(code)}
        >
          {short}
        </button>
      ))}
    </div>
  );
}
