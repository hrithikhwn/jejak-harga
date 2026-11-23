-- 03_monthly_prices.sql: this month's typical price of each basket item,
-- for the whole state and for each district
--
-- Step 1: each shop gets one price per item for the month (the median of its prices),
--         so a shop that reports every day doesn't outvote one that reports weekly.
-- Step 2: an area's price is the median of those shop prices: across every shop in the
--         state, and across the shops in each district. Medians keep typos from dragging it.
--
-- Running a month again replaces its rows: DELETE that month, then INSERT it.

CREATE TABLE IF NOT EXISTS monthly_prices (
    month     DATE,
    level     VARCHAR,         -- 'state' or 'district'
    area      VARCHAR,         -- the state's name or the district's name
    item_code BIGINT,
    price     DECIMAL(10, 4),  -- median across shops, RM
    shops     INTEGER          -- shops that priced the item this month
);

DELETE FROM monthly_prices WHERE month = getvariable('month');

INSERT INTO monthly_prices
WITH shop_month AS (
    -- Step 1: one median price per shop per basket item. The WHERE clause drops shops
    -- outside our state (and unknown shops, which have no state), zero or missing prices,
    -- and unknown items.
    SELECT p.district, x.premise_code, x.item_code,
           median(x.price) AS shop_price
    FROM prices x
    JOIN premises p ON p.premise_code = x.premise_code
    WHERE p.state = getvariable('state')
      AND x.price > 0
      AND list_contains(getvariable('basket'), x.item_code)
      AND x.item_code IN (SELECT item_code FROM items)
    GROUP BY p.district, x.premise_code, x.item_code
)
-- Step 2a: median across all the state's shops.
-- The median of two prices is their average, so it can have more decimals than a price.
-- Storing it as an exact DECIMAL (4 places is enough) means the basket total in 04 adds
-- up the same way every run, with no floating-point leftovers like 2.8749999.
SELECT getvariable('month')                    AS month,
       'state'                                 AS level,
       getvariable('state')                    AS area,
       item_code,
       CAST(median(shop_price) AS DECIMAL(10, 4)) AS price,
       count(*)                                AS shops
FROM shop_month
GROUP BY item_code

UNION ALL

-- Step 2b: median across the shops in each district
SELECT getvariable('month'),
       'district',
       district,
       item_code,
       CAST(median(shop_price) AS DECIMAL(10, 4)),
       count(*)
FROM shop_month
WHERE coalesce(trim(district), '') <> ''
GROUP BY district, item_code;
