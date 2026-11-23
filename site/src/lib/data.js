import { useEffect, useState } from "react";

// The JSON files pipeline/build.py writes to public/data/. The site adds up baskets
// itself from item prices, so it doesn't need basket_state.json or basket_districts.json
// (the tests use those to check that its sums match the pipeline's).
const FILES = ["meta", "items", "item_districts", "cpi", "quality"];

export function useSiteData() {
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    let cancelled = false; // ignore a late response if the page has moved on
    Promise.all(
      FILES.map(async (name) => {
        // BASE_URL is "/jejak-harga/" (vite.config.js), so this works on GitHub Pages too
        const response = await fetch(`${import.meta.env.BASE_URL}data/${name}.json`);
        if (!response.ok) throw new Error(`${name}.json: HTTP ${response.status}`);
        return [name, await response.json()];
      }),
    )
      .then((entries) => !cancelled && setState({ status: "ready", data: Object.fromEntries(entries) }))
      .catch((error) => !cancelled && setState({ status: "error", error }));
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
