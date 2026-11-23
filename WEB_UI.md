# Web UI plan

How the Jejak Harga site should look and behave. [ROADMAP.md](ROADMAP.md) covers the whole project. This file covers only the website.

## Who it's for

People who buy groceries in Selangor, not data people. Someone should understand the main message within 5 seconds, on a phone, without reading the method.

- Plain words: "dearer", "cheaper", "typical price". No "median", "CPI" or "index" in headlines.
- Every chart says what brighter, higher or orange means, right next to it.
- Big numbers first, detail further down.

## Page layout

One page, in this order. The header, hero and main chart always show. Below them, three tabs hold the detail, so nobody has to scroll past everything: **Bakul** (finding cards and basket table), **Daerah** (district cards) and **Kaedah** (method and limitations). The tab bar sticks to the top of the screen while a tab is read, the header links open the tabs, and the address remembers the open tab (`#basket`, `#districts`, `#method`).

| # | Section | What it shows | Version |
|---|---|---|---|
| 1 | Header | Name, links (Basket, Map, Districts, Method, GitHub), "last update" date, BM/EN switch | v1 |
| 2 | Hero | "Harga naik?" headline and three cards: basket cost this month, biggest riser since April 2022, biggest faller since April 2022 | v1 |
| 3 | Main chart | Selangor-wide basket cost every month since 2022. Buttons add district lines and the food CPI line. Markers for known events (e.g. Sep 2023 imported rice price rise) | v1 |
| 4 | Finding cards | One or two short findings, each with a source link | v1 |
| 5 | Price map | Dark map of Selangor districts coloured by price (see below) | v2 |
| 6 | Heat map | Table of districts × basket items, coloured by price change (see below) | v2 |
| 7 | Basket table | The 15 items with prices then and now, and an on/off button per item that updates the totals | v1 |
| 8 | Districts | One card per district: basket cost compared with the Selangor-wide basket (a gap under 2% counts as about the same), or why it isn't shown | v1 |
| 9 | Method and Limitations | How prices are calculated, and what the numbers can't tell you | v1 |
| 10 | Footer | Data credits, licences, "not affiliated" line | v1 |

## Price map

The eye-catching part, built to be screenshotted and shared.

- **Look:** deep night-purple background (`#160B33`), districts filled on a glowing scale from violet (cheapest) through magenta and orange to pale yellow (dearest), white district borders, white labels with a dark outline so they read on any colour.
- **Scale stops:** `#4B1D91`, `#8E2DE2`, `#E0329A`, `#FF6B35`, `#FFC93C`, `#FFF5B8`. It gets brighter as prices rise, so it still reads correctly in greyscale. The scale stretches from the cheapest to the dearest district for the item shown.
- **Item picker:** Whole basket, Rice, Chicken, Eggs, Fish, Chilli, Tomato. Tapping one recolours the map.
- **Next to the map:** a one-line explanation ("Brighter means pricier"), the colour legend with cheapest and dearest prices, and two cards naming the dearest and cheapest district.
- **Missing data:** districts where any item has fewer than `min_shops` shops are dark grey and labelled "not enough data".
- **Petaling Jaya:** listed separately in PriceCatcher but inside Petaling district on the map, so it's drawn as a dot with its own price.
- **Context:** Kuala Lumpur and Putrajaya are outlined but not coloured.
- **Period:** the latest full month by default. The current month is labelled as partial.
- **Later:** a "Download image" button that saves the map with its title and credit, sized for social media.

## Heat map

For people who want to compare districts item by item.

- Rows are districts, columns are the 15 basket items. Each cell shows its percentage.
- Two views, switched with buttons:
  - **Change since April 2022:** how each item's typical price changed in each district.
  - **Compared with Selangor:** how each district's latest-month price compares with the Selangor-wide price.
- Colours: orange for up or dearer (`#FFD6BF`, `#FF9A5C`, `#B8430B`), blue for down or cheaper (`#D4E4FF`, `#7FA8FF`, `#1D4ED8`), stronger for bigger moves, light grey for small moves, and a grey dash for "not enough shops".
- Thresholds: 3%, 10% and 25% for change; 2%, 5% and 12% for the comparison.
- Hovering or tapping a cell shows a sentence, e.g. "Klang, Tomato: −37% since April 2022".
- On a phone the table scrolls sideways inside its box, with district names kept in view.

## Languages

The whole site works in Bahasa Melayu and English.

- **Default:** Bahasa Melayu. A visitor whose browser is set to English gets English on their first visit.
- **Switch:** a "BM | EN" toggle in the header, and on the price map so shared screenshots can be in either language. The choice is remembered in the browser (`localStorage`, wrapped in try/catch).
- **What changes:** every heading, label, button, chart caption, legend, tooltip, `aria-label` and the footer. Set `lang="ms"` or `lang="en"` on the page so screen readers pronounce it correctly.
- **What stays the same:** item names (they're the official Malay names from PriceCatcher), district names, prices (`RM144.98`) and dates in the "Apr 2022" style, which read the same in both languages.
- **Words to use in Malay:** harga biasa (typical price), kos bakul (basket cost), IHP (CPI), lebih mahal / lebih murah (dearer / cheaper), naik / turun (up / down), tidak cukup kedai (not enough shops), Had data (Limitations).
- **How:** all text lives in two files, `site/src/i18n/ms.json` and `site/src/i18n/en.json`, with the same keys. A small `useT()` hook returns the right string. No text is typed directly into components. A test fails the build if a key is missing from either file.
- **Findings and events:** `events.json` and finding cards carry both languages (`"label": {"ms": "...", "en": "..."}`).
- **Review:** a native speaker checks the Malay before launch, since machine-style Malay puts readers off quickly.

## Look and feel

- **Fonts:** Space Grotesk for headings and big numbers, Inter for everything else.
- **Theme:** bright and confident, like a pasar malam at night.
  - Hero: a deep purple panel (`#2B0B57`) with sunny yellow (`#FFD23F`) for "Harga naik?" and white cards on top.
  - Accent: magenta `#D6125F` for buttons, the chart line and the logo. Links in purple `#7A1FA2`.
  - Finding cards: yellow panels (`#FFE27A`) with dark text.
  - Everything else: white background and ink `#16181D`, so the colour blocks stand out.
  - Every text colour must pass 4.5:1 contrast. Bright fills like `#FF9A5C` only carry dark text.
- **Up and down:** orange `#B8430B` for rises, blue `#1D4ED8` for falls. Always add a + or − sign so colour isn't the only signal.
- **Shapes:** 12px rounded cards with thin grey borders. No gradients except the map legend.
- **Dark section:** the price map sits in its own full-width night-purple band, so it stands out on the page.

## Data the site reads

`pipeline/build.py` writes small JSON files to `site/public/data/`. The site never downloads raw PriceCatcher files.

| File | Contents |
|---|---|
| `meta.json` | Last update date, latest full month, `min_shops`, data credits |
| `basket_state.json` | Selangor basket cost per month |
| `basket_districts.json` | Basket cost per district per month, `null` where coverage is too low |
| `items.json` | Each basket item: code, name, unit, typical Selangor price per month |
| `item_districts.json` | Each item's typical price per district per month, `null` where coverage is too low |
| `cpi.json` | Selangor food CPI (division 01) per month |
| `quality.json` | Data-quality counts for the Limitations section |
| `events.json` | Chart markers: date, short label, source link |
| `districts.geojson` | Simplified Selangor district boundaries for the map |

The site works out the heat map and map colours from these files, so no extra files are needed for them.

## Map boundaries

- Use district boundaries with a clear open licence, such as OpenStreetMap or the Malaysia administrative boundaries on HDX. Check the licence before using any file, and credit the source in the footer.
- Simplify the shapes at build time so `districts.geojson` stays under about 100 KB.
- Draw the map as SVG with `d3-geo` (projection only). No map tiles or map API keys.

## Interaction and accessibility

- All buttons are real `<button>` elements with `aria-pressed` for toggles, at least 44px tall.
- Charts and the map have a text alternative (`aria-label` with the key numbers) and a "Show as table" link.
- Text contrast at least 4.5:1, including on the dark map.
- Up and down use orange and blue, which colour-blind readers can tell apart, plus signs.
- Every section works at phone width: cards stack, button rows wrap, wide tables scroll in their own box.

## Rules for every page

- Hide any district-month where an item has fewer than `min_shops` (3) shops, and say why.
- Call figures "typical prices" or "basket cost", never "inflation".
- Label the current month as partial.
- Never name individual shops as overcharging. Keep the public view at state and district level.
- Keep findings factual, with a source link. No opinions on politicians or parties.
- Footer always includes: data from KPDN PriceCatcher and DOSM via OpenDOSM under CC BY 4.0, figures are calculated and not official statistics, not affiliated with or endorsed by KPDN or DOSM, and the map boundary credit.

## Build order

### v1 (milestone 3)

- [x] Vite + React app, fonts and colours set up
- [x] BM/EN switch with `ms.json` and `en.json`, Malay as default
- [x] Header, hero cards and footer from `meta.json` and `basket_state.json`
- [x] Main chart (Recharts) with district and CPI toggles and event markers
- [x] Basket table with on/off buttons that update the hero total and chart
- [x] District cards and the Method and Limitations section
- [ ] Phone layout checked on a real phone
- [ ] Deployed to GitHub Pages

### v2

- [ ] Price map with item picker, legend and dearest/cheapest cards
- [ ] Heat map with the two views
- [ ] "Show as table" for the chart and the map
- [ ] "Download image" for the map
