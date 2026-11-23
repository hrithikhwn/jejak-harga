-- 04_basket.sql: what the basket costs in each area, every month
--
-- Runs once, after 01-03 have filled monthly_prices for every month.
-- Basket cost is the sum of the basket items' prices, one unit of each.
-- An area only gets a value for a month if every basket item has a price there
-- from at least min_shops shops. Otherwise basket_rm is NULL, which gives smaller
-- districts gaps. The same rule is applied to the whole state, where it also stops
-- a thin current month (the first few days, before every item has been priced)
-- from showing.

CREATE OR REPLACE TABLE basket AS
WITH areas AS (
    SELECT DISTINCT level, area FROM monthly_prices
),
months AS (
    SELECT DISTINCT month FROM monthly_prices
),
totals AS (
    SELECT month, level, area,
           sum(price)                AS total,         -- an exact decimal sum
           count(DISTINCT item_code) AS items_priced,
           min(shops)                AS fewest_shops
    FROM monthly_prices
    WHERE list_contains(getvariable('basket'), item_code)
    GROUP BY month, level, area
)
-- Every area for every month (CROSS JOIN makes all the pairs), so a district-month
-- with no prices at all still gets a row, with a NULL basket.
SELECT month, level, area,
       CASE WHEN items_priced = len(getvariable('basket'))   -- every item has a price
             AND fewest_shops >= getvariable('min_shops')    -- from enough shops
            THEN round(total, 2)                              -- rounded to the sen
       END AS basket_rm,
       -- Shops behind the least-covered item, or 0 if an item had no prices at all
       CASE WHEN items_priced = len(getvariable('basket')) THEN fewest_shops ELSE 0 END AS fewest_shops
FROM areas
CROSS JOIN months
LEFT JOIN totals USING (month, level, area);
