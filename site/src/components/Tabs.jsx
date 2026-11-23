import { useRef } from "react";
import { useT } from "../i18n/language.jsx";

// The tab ids double as the address: .../#districts opens the Daerah tab
export const TABS = [
  { id: "basket", label: "nav.basket" },
  { id: "districts", label: "nav.districts" },
  { id: "method", label: "nav.method" },
];

// Bakul, Daerah and Kaedah sit in tabs below the chart, so nobody has to scroll past
// everything to reach them. The tab bar sticks to the top of the screen while you read.
// It follows the WAI-ARIA tabs pattern: arrow keys (and Home/End) move between tabs,
// and only the chosen tab is in the Tab-key order.
export default function Tabs({ active, onSelect, panels }) {
  const t = useT();
  const buttons = useRef({});

  function onKeyDown(event) {
    const i = TABS.findIndex((tab) => tab.id === active);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const tab = TABS[(next + TABS.length) % TABS.length]; // wrap around at either end
    onSelect(tab.id);
    buttons.current[tab.id]?.focus();
  }

  return (
    <div className="tabs">
      {/* Scrolling here puts the tab bar at the top of the screen */}
      <div id="tabs" className="tabs-anchor" />
      <div className="tab-bar">
        <div className="container">
          <div role="tablist" aria-label={t("tabs.label")} className="tab-list" onKeyDown={onKeyDown}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                ref={(element) => {
                  buttons.current[tab.id] = element;
                }}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={active === tab.id}
                aria-controls={tab.id}
                tabIndex={active === tab.id ? 0 : -1}
                onClick={() => onSelect(tab.id)}
              >
                {t(tab.label)}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* All three panels stay on the page; the others are hidden, not removed */}
      {TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={tab.id}
          className="tab-panel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={active !== tab.id}
          tabIndex={0}
        >
          {panels[tab.id]}
        </div>
      ))}
    </div>
  );
}
