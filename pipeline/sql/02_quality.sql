-- 02_quality.sql: count the rows the method will drop, for this month, across all states
--
-- These counts feed the data-quality section of the site and the tests.
-- Running a month again replaces its row: DELETE that month, then INSERT it.

CREATE TABLE IF NOT EXISTS monthly_quality (
    month             DATE,
    days              INTEGER,  -- days with at least one price
    last_day          DATE,     -- latest date in the file
    price_rows        BIGINT,   -- every row in the file, all states
    state_rows        BIGINT,   -- rows from shops in our state
    unknown_shop_rows BIGINT,   -- shop code not in the premise lookup, or a shop with no state
    unknown_item_rows BIGINT,   -- item code not in the item lookup
    bad_price_rows    BIGINT,   -- price zero, negative or missing
    duplicate_rows    BIGINT    -- extra rows for the same date, shop and item
);

DELETE FROM monthly_quality WHERE month = getvariable('month');

INSERT INTO monthly_quality
WITH flagged AS (
    -- Tag every price row. EXISTS asks "is there a matching lookup row?" without joining,
    -- so a code repeated in a lookup could never count a price twice.
    SELECT x.*,
           EXISTS (SELECT 1 FROM premises p
                    WHERE p.premise_code = x.premise_code
                      AND coalesce(trim(p.state), '') <> '')  AS known_shop,
           EXISTS (SELECT 1 FROM premises p
                    WHERE p.premise_code = x.premise_code
                      AND p.state = getvariable('state'))     AS in_state,
           EXISTS (SELECT 1 FROM items i
                    WHERE i.item_code = x.item_code)           AS known_item
    FROM prices x
)
SELECT getvariable('month')                                       AS month,
       count(DISTINCT date)                                       AS days,
       max(date)                                                  AS last_day,
       count(*)                                                   AS price_rows,
       count(*) FILTER (WHERE in_state)                           AS state_rows,
       count(*) FILTER (WHERE NOT known_shop)                     AS unknown_shop_rows,
       count(*) FILTER (WHERE NOT known_item)                     AS unknown_item_rows,
       count(*) FILTER (WHERE price IS NULL OR price <= 0)        AS bad_price_rows,
       count(*) - count(DISTINCT (date, premise_code, item_code)) AS duplicate_rows
FROM flagged;


-- Repeated codes in the lookups would make a join count a shop or an item twice.
-- This doesn't depend on the month; it's recomputed each time because it's cheap.
CREATE OR REPLACE TABLE lookup_quality AS
SELECT (SELECT count(*) - count(DISTINCT premise_code) FROM premises) AS repeated_shop_codes,
       (SELECT count(*) - count(DISTINCT item_code)    FROM items)    AS repeated_item_codes;
