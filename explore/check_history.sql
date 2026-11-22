-- check_history.sql: do the basket items go back far enough for a trend since 2022?
--
-- Run it with:  python run_sql.py check_history.sql history.duckdb
-- It loads April of each year (2022-2026) into history.duckdb and counts,
-- for each basket item, how many shops in your state priced it.
-- A 0 means the item code didn't exist yet (or wasn't collected) that year.

SET VARIABLE my_state = 'Selangor';

SET VARIABLE basket = [1, 1111, 2068, 1601, 1589, 917, 70, 129, 1564, 94, 114, 1131, 1611, 1976, 883];

SET VARIABLE price_files = [
    'https://storage.data.gov.my/pricecatcher/pricecatcher_2022-04.parquet',
    'https://storage.data.gov.my/pricecatcher/pricecatcher_2023-04.parquet',
    'https://storage.data.gov.my/pricecatcher/pricecatcher_2024-04.parquet',
    'https://storage.data.gov.my/pricecatcher/pricecatcher_2025-04.parquet',
    'https://storage.data.gov.my/pricecatcher/pricecatcher_2026-04.parquet'
];

CREATE TABLE IF NOT EXISTS prices AS
SELECT CAST(date AS DATE) AS date, premise_code, item_code, price
FROM read_parquet(getvariable('price_files'), union_by_name = true);

CREATE TABLE IF NOT EXISTS items AS
SELECT * FROM read_parquet('https://storage.data.gov.my/pricecatcher/lookup_item.parquet');

CREATE TABLE IF NOT EXISTS premises AS
SELECT * FROM read_parquet('https://storage.data.gov.my/pricecatcher/lookup_premise.parquet');


-- 1. Shops in your state that priced each basket item, every April
SELECT b.item_code,
       any_value(i.item) AS item,
       count(DISTINCT s.premise_code) FILTER (WHERE year(s.date) = 2022) AS apr_2022,
       count(DISTINCT s.premise_code) FILTER (WHERE year(s.date) = 2023) AS apr_2023,
       count(DISTINCT s.premise_code) FILTER (WHERE year(s.date) = 2024) AS apr_2024,
       count(DISTINCT s.premise_code) FILTER (WHERE year(s.date) = 2025) AS apr_2025,
       count(DISTINCT s.premise_code) FILTER (WHERE year(s.date) = 2026) AS apr_2026
FROM (SELECT unnest(getvariable('basket')) AS item_code) b
LEFT JOIN items i ON i.item_code = b.item_code
LEFT JOIN (SELECT px.date, px.premise_code, px.item_code
           FROM prices px
           JOIN premises p ON p.premise_code = px.premise_code
           WHERE p.state = getvariable('my_state')) s ON s.item_code = b.item_code
GROUP BY b.item_code
ORDER BY b.item_code;


-- 2. Rice options with the longest history in your state
SELECT i.item_code, i.item, i.unit,
       count(DISTINCT x.premise_code) FILTER (WHERE year(x.date) = 2022) AS apr_2022,
       count(DISTINCT x.premise_code) FILTER (WHERE year(x.date) = 2023) AS apr_2023,
       count(DISTINCT x.premise_code) FILTER (WHERE year(x.date) = 2024) AS apr_2024,
       count(DISTINCT x.premise_code) FILTER (WHERE year(x.date) = 2025) AS apr_2025,
       count(DISTINCT x.premise_code) FILTER (WHERE year(x.date) = 2026) AS apr_2026
FROM prices x
JOIN premises p ON p.premise_code = x.premise_code
JOIN items i    ON i.item_code = x.item_code
WHERE p.state = getvariable('my_state') AND i.item_category = 'BERAS'
GROUP BY ALL
ORDER BY apr_2022 DESC, apr_2026 DESC
LIMIT 15;
