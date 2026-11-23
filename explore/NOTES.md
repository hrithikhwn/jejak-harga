# Exploration notes

What the data looked like when the basket and method were chosen (November 2026). These notes explain the decisions in [ROADMAP.md](../ROADMAP.md) and feed the Limitations section of the README.

## Data used

- **Recent data:** PriceCatcher from 1 September to 22 November 2026, all states: 4,369,544 prices from 2,155 shops covering 343 items.
- **History check:** April of each year from 2022 to 2026 (`check_history.sql`).
- **State for v1:** Selangor. The premise lookup lists 248 Selangor shops, but only 136 reported prices between September and November 2026.

## Data quality

From query 4 of `explore.sql`, September to November 2026, all states:

| Check | Result |
|---|---|
| Prices from an unknown shop | 0 |
| Prices for an unknown item | 65,653 (1.5%) |
| Zero or missing prices | 0 |
| Duplicate rows (same date, shop and item) | 0 |
| Repeated codes in the lookup tables | 0 |

The unknown items are 14 item codes (2023 to 2096) that aren't in the item lookup. They looked new because none of them are priced from 1 to 6 September 2026, but they aren't: six have prices since early 2024 and the other eight since 21 July 2025. Some are priced in about 800 shops, so the lookup simply hasn't caught up with them. They're excluded, and none are basket items.

Over the full history (every month since January 2022, from the milestone 2 pipeline), 44 item codes missing from the lookup appear, starting on 31 December 2023. Their share of each month's rows is nil before that, about 1% from January to March 2024, 2.2% to 2.6% from April 2024 to July 2025, and 1.3% to 1.7% since August 2025. The pipeline counts them every month (`unknown_item_rows` in `quality.json`), and a test fails if the share jumps.

## Quirks and what they changed

- **Packaged goods are priced about weekly, fresh items almost daily.** In Selangor, packaged items appear on about 11 of the 83 days and fresh items on about 70. So each shop gets one price per item per month before taking medians. Otherwise daily items would outvote weekly ones.
- **Some districts have very few shops.** With the final basket, Kuala Langat never had all 15 items in September to November 2026, and Sepang and Hulu Selangor had only 1 shop for at least one item in some months. This is why district lines need at least 3 shops per item (`min_shops`). Seven of the ten districts pass.
- **Rice codes changed in 2024.** The "SST5%" rice codes (such as 1445 and 1582) mostly disappear from 2024, and new "(IMPORT)" codes (2066 and 2068) take over. Only 904 and 1583 have steady coverage every April from 2022 to 2026, and 904 has more shops (24 to 42, against 21 to 27). So the basket uses 904.
- **Controlled prices barely move.** Sugar (1589) is RM2.85 at nearly every shop, and most cooking oil (1601) prices sit within about 3% of each other. They add to the basket cost but hardly change the trend.
- **Petaling Jaya is listed separately from Petaling district.** The site follows the lookup's labels.
- **Shop coverage grew in 2026.** April 2026 has many more shops for every basket item than earlier Aprils, for example 115 shops for tomatoes against 83 to 96 before.
- **Fresh produce swings a lot.** Tomatoes were RM2.99 in April 2026 and RM7.99 in September 2026. Compare trends, not two single months.
- **Eggs changed pattern.** Gred C eggs (30) sat at RM11.70 to RM12.30 with almost no spread from 2022 to 2024. In April 2025 and April 2026 the median was about RM8, with a wide spread. By September 2026 it was about RM14. Worth researching for a README finding.

## The basket

The 15 items are listed in [ROADMAP.md](../ROADMAP.md#basket). They were chosen like this:

1. Start from the items priced in the most Selangor shops (query 6).
2. Leave out the curry powders and sauces that top that list, so the basket looks like a real shopping trip.
3. Add the best-covered code for each staple: rice, chicken, eggs, cooking oil and fish.
4. Check every item has prices each April since 2022 (`check_history.sql`). Rice was switched from 2068 to 904 because 2068 only starts in 2024.

## Early numbers

Selangor-wide basket, April snapshots only. Single months are noisy, so this isn't a trend yet.

| April | Basket (RM) |
|---|---|
| 2022 | 134.11 |
| 2023 | 143.25 |
| 2024 | 142.92 |
| 2025 | 139.51 |
| 2026 | 130.82 |

Rice (904) rose from RM29.90 in April 2023 to RM40.49 in April 2024, a 35% jump. That follows Bernas raising the price of imported white rice from RM2,350 to RM3,200 per tonne on 1 September 2023 ([The Star](https://thestar.com.my/news/nation/2023/09/01/price-of-imported-white-rice-up-by-36-says-bernas)). In April 2026 it was still 28% above April 2022.

The April basket, rice and egg figures first came from extra queries on `history.duckdb`. The milestone 2 pipeline reproduces them, with every item's median and shop count the same. Four of the basket totals were a sen lower in those first queries. Each lands exactly on half a sen (134.105, for example), and adding up floating-point numbers happened to round them down. The pipeline adds exact decimals and rounds half a sen up, so the table above uses its figures. About 4 in 10 months land on half a sen like this, so the rounding rule matters.
