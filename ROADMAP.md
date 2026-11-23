# Jejak Harga roadmap

*Harga naik? Follow what your basket costs, district by district, since 2022.*

Jejak Harga is a live site that tracks what a basket of 15 everyday groceries costs across Selangor, month by month since 2022, and compares districts where enough shops report. It uses KPDN's PriceCatcher data and refreshes itself every day.

The official PriceCatcher app already shows today's prices and can total a basket of 10 items. This project covers what the app doesn't: how prices have changed over time, and how districts compare.

## v1 scope

**In v1**

- One state (Selangor to start)
- A fixed basket of 15 everyday items, all priced every year since 2022 (see [Basket](#basket))
- Main chart: the Selangor-wide basket cost each month since 2022
- District lines, shown only in months where every basket item has at least 3 shops in that district
- The official food CPI for the same state, shown alongside for context
- Automatic daily refresh
- Live on GitHub Pages
- A README with a live link, a GIF, key findings and limitations

**Later**

- All states
- A map of the cheapest districts for any item
- A price spike detector (anomaly detection on shop prices)
- Short-term price forecasts
- Custom quantities in the basket

## Basket

Chosen from the items sold in the most Selangor shops, then checked to have prices every year since 2022.

| Code | Item | Unit |
|---|---|---|
| 1 | Ayam bersih (standard) | 1kg |
| 1111 | Telur ayam gred C | 30 biji |
| 904 | Beras Super Cap Rambutan 5% (import) | 10kg |
| 1601 | Minyak masak tulen Cap Buruh | 2kg |
| 1589 | Gula putih bertapis kasar | 1kg |
| 917 | Tepung gandum Cap Sauh | 1kg |
| 70 | Ikan selar/pelata | 1kg |
| 129 | Bawang besar kuning/Holland | 1kg |
| 1564 | Bawang putih import (China) | 1kg |
| 94 | Cili merah | 1kg |
| 114 | Tomato | 1kg |
| 1131 | Ubi kentang import (China) | 1kg |
| 1611 | Santan kelapa Kara | 200ml |
| 1976 | Maggi mi segera perisa kari | 5 × 79g |
| 883 | Krimer manis F&N | 500g |

Rice uses code 904 because the rice codes changed in 2024, and 904 is one of the few priced throughout. It also captures the jump in imported rice prices between 2023 and 2024.

## Data

| Dataset | What it gives | File |
|---|---|---|
| [PriceCatcher](https://open.dosm.gov.my/data-catalogue/pricecatcher) | Daily prices: `date`, `premise_code`, `item_code`, `price` (RM) | `https://storage.data.gov.my/pricecatcher/pricecatcher_YYYY-MM.parquet` |
| [Item lookup](https://open.dosm.gov.my/data-catalogue/lookup_item) | `item`, `unit`, `item_group`, `item_category` | `https://storage.data.gov.my/pricecatcher/lookup_item.parquet` |
| [Premise lookup](https://open.dosm.gov.my/data-catalogue/lookup_premise) | `premise`, `address`, `premise_type`, `state`, `district` | `https://storage.data.gov.my/pricecatcher/lookup_premise.parquet` |
| [CPI by state](https://open.dosm.gov.my/data-catalogue/cpi_state) | Monthly CPI by division (`01` = food and non-alcoholic beverages), base 2010 = 100 | `https://storage.dosm.gov.my/cpi/cpi_2d_state.parquet` |

PriceCatcher updates daily and the CPI updates monthly. All four datasets are open data under CC BY 4.0, so the site and README must credit KPDN and DOSM (via OpenDOSM).

## Repo layout

```
jejak-harga/
├── explore/
│   ├── explore.sql              # first look at the data
│   ├── run_sql.py               # runs a .sql file and prints the results
│   └── NOTES.md                 # data quirks found while exploring
├── pipeline/
│   ├── sql/
│   │   ├── 01_load.sql
│   │   ├── 02_quality.sql
│   │   ├── 03_monthly_prices.sql
│   │   └── 04_basket.sql
│   ├── build.py                 # runs sql/ in order, writes JSON for the site
│   └── config.json              # state, basket item codes, min_shops, first month
├── data/
│   ├── raw/                     # downloaded files (not in git)
│   ├── monthly_prices.parquet   # monthly summary, updated by the daily job
│   └── monthly_quality.parquet  # data-quality counts per month
├── site/                        # React app (Vite)
│   ├── public/data/             # JSON written by build.py
│   └── src/
├── tests/
│   └── test_data.py             # fails the build if the new data looks broken
├── .github/workflows/refresh.yml
├── .gitignore                   # raw downloads and *.duckdb stay out of git
├── requirements.txt
├── README.md
└── ROADMAP.md
```

## How the pipeline works

1. A scheduled GitHub Actions workflow runs once a day, after PriceCatcher's daily update.
2. `pipeline/build.py` downloads only the previous and current month's files (late prices can arrive) and replaces those months. Past months are already summarised in `data/monthly_prices.parquet`.
3. DuckDB runs the SQL in `pipeline/sql/` in order: load, quality checks, state and district monthly prices, basket cost.
4. `build.py` writes small JSON files and a last-updated date to `site/public/data/`.
5. Vite builds the React site and the workflow deploys it to GitHub Pages.

`python pipeline/build.py --full` rebuilds the summary from every monthly file.

### Method

- Each shop gets one price per item per month (its median), so shops that report every day don't outweigh shops that report weekly.
- The Selangor price for an item is the median across all reporting shops in the state. A district's price is the median across the shops in that district.
- Basket cost is the sum of the item prices, one unit of each. Item prices are kept as exact decimals and the total is rounded to the sen at the end, with half a sen rounding up, so every run gives the same answer.
- The Selangor-wide basket is the main series. A district only gets a value for a month if every basket item has at least 3 shops there that month (`min_shops` in `config.json`). The same rule applies state-wide, where it only matters in the first days of a new month.
- Rows with unknown shops or items, and zero or missing prices, are dropped. The pipeline counts them so they can be reported.

## Milestones

### 1. Explore

- [x] Run `explore/explore.sql` on three recent months
- [x] Pick 15 basket items sold in many shops (query 6)
- [x] Check the basket items have prices back to 2022 (`explore/check_history.sql`)
- [ ] Record the data-quality numbers (query 4)
- [ ] Write down data quirks in `explore/NOTES.md`

Done when the basket list and notes exist.

### 2. Pipeline

- [x] Split `explore.sql` into the files in `pipeline/sql/`
- [x] Compute the Selangor-wide basket and the district baskets (with `min_shops`)
- [x] Make `build.py` write the JSON and a last-updated date
- [x] Add a `--full` mode that rebuilds history from all monthly files
- [x] Add tests that fail if quality numbers jump or row counts drop

Done when one command rebuilds everything from scratch.

### 3. Site

- [ ] Set up a Vite + React app
- [ ] Main line chart (e.g. Recharts): the Selangor-wide basket over time, with district lines you can add
- [ ] Let people switch basket items on and off
- [ ] Show the food CPI line for context
- [ ] Deploy to GitHub Pages

Done when the live link works on a phone.

### 4. Automate and polish

- [ ] Add `.github/workflows/refresh.yml` on a daily schedule
- [ ] Write the README: live link, GIF, three key findings, limitations and data credits

Done when the last-updated date changes with no manual work.

## Limitations (for the README)

- PriceCatcher is collected for price surveillance. DOSM says it should complement CPI data, not replace it, and isn't meant for measuring inflation. This site shows basket costs, not an inflation rate.
- Prices are medians across the shops that reported, and the set of shops reporting changes over time.
- District lines only appear in months where every basket item has at least 3 shops in that district, so smaller districts have gaps.
- Fresh produce swings a lot from month to month, so compare trends rather than two single months.
- The current month is always partial.
- The data-quality counts (unknown shops, bad prices, duplicates) are reported with each build.

## Gotchas

- GitHub Actions cron runs in UTC. PriceCatcher's catalogue page lists its daily update at 12:00, so schedule the job an hour later: `0 5 * * *` is 1pm in Malaysia.
- GitHub pauses scheduled workflows in public repos after 60 days without activity. Re-enable the workflow from the Actions tab if that happens.
- A GitHub Pages project site needs `base: '/jejak-harga/'` in `vite.config.js` (matching the repo name), or the deployed page loads blank.
