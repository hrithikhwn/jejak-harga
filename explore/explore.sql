-- explore.sql: a first look at KPDN PriceCatcher data with DuckDB
--
-- Run it with:  python run_sql.py explore.sql
-- The first run downloads three months of data into harga.duckdb in this folder.
-- Later runs reuse it. Delete harga.duckdb to download again (e.g. after changing months).
--
-- Data: PriceCatcher (KPDN) and CPI (DOSM) via OpenDOSM / data.gov.my, CC BY 4.0


-- 0. Settings: change the state and months here
SET VARIABLE my_state = 'Selangor';

SET VARIABLE price_files = [
    'https://storage.data.gov.my/pricecatcher/pricecatcher_2026-09.parquet',
    'https://storage.data.gov.my/pricecatcher/pricecatcher_2026-10.parquet',
    'https://storage.data.gov.my/pricecatcher/pricecatcher_2026-11.parquet'
];


-- 1. Load prices, the two lookup tables and state CPI into local tables
CREATE TABLE IF NOT EXISTS prices AS
SELECT CAST(date AS DATE) AS date, premise_code, item_code, price
FROM read_parquet(getvariable('price_files'), union_by_name = true);  -- tolerate files saved slightly differently

CREATE TABLE IF NOT EXISTS items AS
SELECT * FROM read_parquet('https://storage.data.gov.my/pricecatcher/lookup_item.parquet');

CREATE TABLE IF NOT EXISTS premises AS
SELECT * FROM read_parquet('https://storage.data.gov.my/pricecatcher/lookup_premise.parquet');

CREATE TABLE IF NOT EXISTS cpi_state AS
SELECT * FROM read_parquet('https://storage.dosm.gov.my/cpi/cpi_2d_state.parquet');


-- 2. How much data is there?
SELECT count(*)                     AS price_rows,
       min(date)                    AS first_day,
       max(date)                    AS last_day,
       count(DISTINCT premise_code) AS shops,
       count(DISTINCT item_code)    AS items
FROM prices;


-- 3. Does my_state match how both datasets spell it?
--    If either count is 0, check the spelling with: SELECT DISTINCT state FROM premises
SELECT getvariable('my_state')                                                  AS my_state,
       (SELECT count(*) FROM premises  WHERE state = getvariable('my_state'))   AS shops_in_lookup,
       (SELECT count(*) FROM cpi_state WHERE state = getvariable('my_state'))   AS cpi_rows;


-- 4. Data quality checks. Note every non-zero number in your README's Limitations section.
SELECT
    (SELECT count(*) FROM prices x
      WHERE NOT EXISTS (SELECT 1 FROM premises p
                         WHERE p.premise_code = x.premise_code
                           AND coalesce(trim(p.state), '') <> ''))              AS unknown_shop_rows,
    (SELECT count(*) FROM prices x
      WHERE NOT EXISTS (SELECT 1 FROM items i WHERE i.item_code = x.item_code)) AS unknown_item_rows,
    (SELECT count(*) FROM prices WHERE price IS NULL OR price <= 0)             AS bad_price_rows,
    (SELECT count(*) - count(DISTINCT (date, premise_code, item_code))
       FROM prices)                                                             AS duplicate_rows,
    (SELECT count(*) - count(DISTINCT premise_code) FROM premises)              AS repeated_shop_codes,
    (SELECT count(*) - count(DISTINCT item_code) FROM items)                    AS repeated_item_codes;


-- 5. Coverage in your state: how many shops report in each district
SELECT p.district,
       count(DISTINCT x.premise_code) AS shops,
       count(*)                       AS price_rows
FROM prices x
JOIN premises p ON p.premise_code = x.premise_code
WHERE p.state = getvariable('my_state')
GROUP BY p.district
ORDER BY shops DESC, p.district;


-- 6. Basket candidates: the 30 items sold in the most shops in your state
SELECT i.item_code, i.item, i.unit, i.item_group, i.item_category,
       count(DISTINCT x.premise_code) AS shops
FROM prices x
JOIN premises p ON p.premise_code = x.premise_code
JOIN items i    ON i.item_code = x.item_code
WHERE p.state = getvariable('my_state')
GROUP BY ALL
ORDER BY shops DESC, i.item_code
LIMIT 30;


-- 7. Core table: typical price of each item per district per month.
--    Each shop first gets one price per month, so shops that report every day
--    don't outvote shops that report weekly. Medians keep typos from dragging it around.
CREATE OR REPLACE TABLE district_month AS
WITH shop_month AS (
    SELECT CAST(date_trunc('month', date) AS DATE) AS month,
           premise_code,
           item_code,
           median(price) AS shop_price
    FROM prices
    WHERE price > 0
    GROUP BY ALL
)
SELECT s.month, p.state, p.district, s.item_code,
       median(s.shop_price) AS median_price,
       count(*)             AS shops
FROM shop_month s
JOIN premises p ON p.premise_code = s.premise_code
WHERE coalesce(trim(p.state), '') <> ''                -- drop shops with no location
  AND s.item_code IN (SELECT item_code FROM items)     -- drop unknown items
GROUP BY ALL;


-- 8. Basket cost per district per month.
--    Replace these codes with 10-15 picks from query 6.
SET VARIABLE basket = [1, 1111, 904, 1601, 1589, 917, 70, 129, 1564, 94, 114, 1131, 1611, 1976, 883];

CREATE OR REPLACE TABLE basket_cost AS
SELECT month, district,
       round(sum(median_price), 2) AS basket_rm,
       min(shops)                  AS fewest_shops
FROM district_month
WHERE state = getvariable('my_state')
  AND list_contains(getvariable('basket'), item_code)
GROUP BY month, district
-- keep only district-months where every basket item has a price
HAVING count(*) = len(getvariable('basket'));

-- 8b. Your basket's cost by district and month
SELECT * FROM basket_cost ORDER BY district, month;



-- 9. Price spikes, a preview of the v2 detector: shop prices over 2x the district median.
--    Expect some typos (RM45.00 instead of RM4.50). Telling those apart is part of v2.
SELECT x.date, p.premise, p.district, i.item, x.price,
       round(d.median_price, 2)          AS district_median,
       round(x.price / d.median_price, 1) AS times_median
FROM prices x
JOIN premises p       ON p.premise_code = x.premise_code
JOIN items i          ON i.item_code = x.item_code
JOIN district_month d ON d.state = p.state
                     AND d.district = p.district
                     AND d.item_code = x.item_code
                     AND d.month = CAST(date_trunc('month', x.date) AS DATE)
WHERE p.state = getvariable('my_state')
  AND x.price > 2 * d.median_price
ORDER BY times_median DESC, x.date
LIMIT 20;


-- 10. Context from the official CPI: food and non-alcoholic beverages (division 01)
SELECT date, "index" AS food_cpi
FROM cpi_state
WHERE state = getvariable('my_state') AND division = '01'
ORDER BY date DESC
LIMIT 12;


-- 11. Export a small JSON file: the format the React site will load
COPY (SELECT * FROM basket_cost ORDER BY district, month)
TO 'basket.json' (FORMAT json, ARRAY true);
