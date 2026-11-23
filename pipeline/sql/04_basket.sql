-- 04_basket.sql: what the basket costs in each area, every month
--
-- Runs once, after 01-03 have filled monthly_prices for every month.
-- Basket cost is the sum of the basket items' prices, one unit of each.
-- An area only gets a value for a month if every basket item has a price there
-- from at least min_shops shops. This gives smaller districts gaps. The same rule
-- is applied to the whole state, where it also stops a thin current month
-- (the first few days, before every item has been priced) from showing.

CREATE OR REPLACE TABLE basket AS
SELECT month, level, area,
       round(sum(price), 2) AS basket_rm,     -- an exact decimal sum, rounded to the sen
       min(shops)           AS fewest_shops   -- shops behind the least-covered item
FROM monthly_prices
WHERE list_contains(getvariable('basket'), item_code)
GROUP BY month, level, area
HAVING count(DISTINCT item_code) = len(getvariable('basket'))  -- every item has a price
   AND min(shops) >= getvariable('min_shops');                  -- from enough shops
