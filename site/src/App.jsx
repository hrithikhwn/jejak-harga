import { useEffect, useMemo, useState } from "react";
import BasketTable from "./components/BasketTable.jsx";
import Districts from "./components/Districts.jsx";
import Findings from "./components/Findings.jsx";
import Footer from "./components/Footer.jsx";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import MainChart from "./components/MainChart.jsx";
import Method from "./components/Method.jsx";
import Tabs, { TABS } from "./components/Tabs.jsx";
import { useT } from "./i18n/language.jsx";
import { BASE_MONTH, lastIndexWithValue, stateBasket } from "./lib/basket.js";
import { useSiteData } from "./lib/data.js";

const TAB_IDS = TABS.map((tab) => tab.id);

// The tab named in the address (".../#districts"), if any
function tabInAddress() {
  const id = window.location.hash.slice(1);
  return TAB_IDS.includes(id) ? id : null;
}

export default function App() {
  const t = useT();
  const site = useSiteData();

  if (site.status !== "ready") {
    const failed = site.status === "error";
    return (
      <main className="status-page">
        <p role={failed ? "alert" : "status"}>{t(failed ? "status.error" : "status.loading")}</p>
      </main>
    );
  }
  return <Page data={site.data} />;
}

function Page({ data }) {
  const t = useT();
  const { meta, items, item_districts: itemDistricts, cpi, quality } = data;

  // The item codes in the basket. Everything starts switched on; the basket table's
  // buttons change this, and the hero, chart and district cards all follow it.
  const [selected, setSelected] = useState(() => new Set(items.items.map((item) => item.item_code)));
  const basket = useMemo(() => stateBasket(items, selected), [items, selected]);
  const [tab, setTab] = useState(() => tabInAddress() ?? "basket");

  // Open a tab and put it in the address, so a shared link opens the same tab.
  // replaceState changes the address without jumping the page or adding a Back step.
  // The tab bar comes to the top of the screen when asked (the header links), or when
  // the reader has scrolled below it, so the new tab starts from its beginning.
  function openTab(id, { scroll = false } = {}) {
    setTab(id);
    window.history.replaceState(null, "", `#${id}`);
    const anchor = document.getElementById("tabs");
    if (anchor && (scroll || anchor.getBoundingClientRect().top < 0)) anchor.scrollIntoView();
  }

  // The page only appears once the data has loaded, so a link such as .../#districts
  // can't scroll there by itself: do it now. Also follow addresses changed by hand.
  useEffect(() => {
    function followAddress() {
      const id = window.location.hash.slice(1);
      if (TAB_IDS.includes(id)) {
        setTab(id);
        document.getElementById("tabs")?.scrollIntoView();
      } else if (id) {
        document.getElementById(id)?.scrollIntoView();
      }
    }
    followAddress();
    window.addEventListener("hashchange", followAddress);
    return () => window.removeEventListener("hashchange", followAddress);
  }, []);

  // What every section needs, in one object so it can be passed down together
  const view = {
    meta,
    items,
    itemDistricts,
    cpi,
    quality,
    months: items.months,
    selected,
    basket, // the state-wide basket cost each month, for the items switched on
    current: lastIndexWithValue(basket), // the latest month with a basket cost
    base: items.months.indexOf(BASE_MONTH), // the month comparisons start from
  };

  return (
    <>
      <a className="skip-link" href="#main">
        {t("nav.skip")}
      </a>
      <Header meta={meta} onOpenTab={openTab} />
      <main id="main">
        {/* The main message, always shown: the basket cost now, and its trend */}
        <Hero view={view} />
        <MainChart view={view} />
        {/* The detail, one tab at a time */}
        <Tabs
          active={tab}
          onSelect={openTab}
          panels={{
            basket: (
              <>
                <Findings items={items} />
                <BasketTable view={view} onChange={setSelected} />
              </>
            ),
            districts: <Districts view={view} />,
            method: <Method meta={meta} quality={quality} />,
          }}
        />
      </main>
      <Footer meta={meta} />
    </>
  );
}
