-- 01_load.sql: load the lookup tables, the state's food CPI and one month of prices
--
-- build.py runs 01, 02 and 03 once for each month, then 04 once at the end.
-- It sets these variables first: state, first_month, month, price_file,
-- items_file, premises_file, cpi_file (local copies in data/raw/).


-- Lookups and CPI are the same for every month, so they load on the first month
-- and IF NOT EXISTS skips them after that.
CREATE TABLE IF NOT EXISTS items AS
SELECT * FROM read_parquet(getvariable('items_file'));

CREATE TABLE IF NOT EXISTS premises AS
SELECT * FROM read_parquet(getvariable('premises_file'));

-- Food and non-alcoholic beverages (division 01) for our state, from the first month on.
-- The CPI file stores dates as timestamps, so cast them to plain dates.
CREATE TABLE IF NOT EXISTS food_cpi AS
SELECT CAST(date AS DATE) AS month,
       "index"            AS food_cpi
FROM read_parquet(getvariable('cpi_file'))
WHERE state = getvariable('state')
  AND division = '01'
  AND CAST(date AS DATE) >= getvariable('first_month');


-- This month's prices, every state (02 counts problems across the whole file).
-- The 2022 files store date as a timestamp and the codes as 32-bit integers;
-- later files use DATE and 64-bit integers. Casting gives every month one schema.
CREATE OR REPLACE TABLE prices AS
SELECT CAST(date AS DATE)           AS date,
       CAST(premise_code AS BIGINT) AS premise_code,
       CAST(item_code AS BIGINT)    AS item_code,
       CAST(price AS DOUBLE)        AS price
FROM read_parquet(getvariable('price_file'));
