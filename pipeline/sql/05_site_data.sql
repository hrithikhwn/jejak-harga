-- 05_site_data.sql: each basket item's price, shaped for the site
--
-- The site lets people switch basket items on and off, so it adds up the basket
-- itself and needs every item's price, for the state and for each district.
-- build.py writes this table out as items.json (the state) and
-- item_districts.json (the districts).

-- One row per area and basket item, holding a list of prices and a list of shop
-- counts, both in month order, so the site can line them up with one list of months.
-- A price from fewer than min_shops shops becomes NULL: the same rule 04 uses.
CREATE OR REPLACE TABLE site_item_prices AS
WITH grid AS (
    -- Every area x every basket item x every month, so all the lists are the same length
    SELECT a.level, a.area, b.item_code, m.month
    FROM (SELECT DISTINCT level, area FROM monthly_prices) a
    CROSS JOIN (SELECT unnest(getvariable('basket')) AS item_code) b
    CROSS JOIN (SELECT DISTINCT month FROM monthly_prices) m
)
SELECT g.level, g.area, g.item_code,
       list(CASE WHEN p.shops >= getvariable('min_shops') THEN p.price END
            ORDER BY g.month)                                   AS price,
       list(coalesce(p.shops, 0) ORDER BY g.month)              AS shops
FROM grid g
LEFT JOIN monthly_prices p
       ON  p.level = g.level
       AND p.area = g.area
       AND p.item_code = g.item_code
       AND p.month = g.month
GROUP BY g.level, g.area, g.item_code;
