"""Checks on the data that pipeline/build.py produced. Run them after a build:

    python pipeline/build.py
    pytest

They fail when the new data looks broken, so the daily job can stop before a bad
build reaches the site. The limits come from the history since 2022 (see each one).
"""

import json
from datetime import date, timedelta
from pathlib import Path
from statistics import median

import duckdb
import pytest

ROOT = Path(__file__).resolve().parent.parent
CONFIG = json.loads((ROOT / "pipeline" / "config.json").read_text(encoding="utf-8"))
PRICES_FILE = ROOT / "data" / "monthly_prices.parquet"
QUALITY_FILE = ROOT / "data" / "monthly_quality.parquet"
SITE_DATA_DIR = ROOT / "site" / "public" / "data"

# Only the current month may have fewer days of prices than this: it has just started.
# Past months have prices on 22 to 31 days.
MIN_DAYS = 7
# "Usual" means the median of up to this many earlier months
LOOKBACK = 6
# Sharp drop: rows per day below this share of usual. The lowest since 2022 is 0.65,
# when PriceCatcher's coverage really did fall (August-September 2025).
DROP_LIMIT = 0.5
# Jump: unknown-item rows more than this many percentage points above usual.
# The biggest rise since 2022 is 1.9 points (April 2024, when a batch of new item codes
# appeared that the lookup still doesn't have), and the share has stayed under 2.6%.
JUMP_LIMIT = 3.0


def query(sql: str, *params) -> list[dict]:
    """Run a DuckDB query and return its rows as {column: value}."""
    cursor = duckdb.connect().execute(sql, list(params))
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def calendar_months(first: date, last: date) -> list[date]:
    """Every month from first to last, from the calendar rather than from the data."""
    months = []
    while first <= last:
        months.append(first)
        first = (first + timedelta(days=32)).replace(day=1)  # the 1st + 32 days is always next month
    return months


@pytest.fixture(scope="module")
def quality() -> list[dict]:
    """One row per month: days with prices, row counts and problem counts (02_quality.sql)."""
    return query("SELECT * FROM read_parquet(?) ORDER BY month", str(QUALITY_FILE))


@pytest.fixture(scope="module")
def expected_months(quality) -> list[date]:
    """Every month since first_month, leaving out a current month that has only just
    started (weekly-priced items may not have a price yet)."""
    latest = quality[-1]
    last = latest["month"]
    if latest["days"] < MIN_DAYS:
        last = (last - timedelta(days=1)).replace(day=1)  # the month before
    return calendar_months(date.fromisoformat(CONFIG["first_month"] + "-01"), last)


@pytest.mark.parametrize("column", ["price_rows", "state_rows"])
def test_row_counts_do_not_drop_sharply(quality, column):
    """A broken download, a renamed state or a lookup problem shows up as far fewer rows
    than in the months before. Rows are compared per day of prices, so a short month or
    the unfinished current month isn't mistaken for a drop."""
    drops = []
    usual_per_day = []
    for month in quality:
        if month["days"] < MIN_DAYS:
            if month is not quality[-1]:
                drops.append(f"{month['month']:%Y-%m} has prices on only {month['days']} days")
            continue
        per_day = month[column] / month["days"]
        if usual_per_day:
            usual = median(usual_per_day[-LOOKBACK:])
            if per_day < DROP_LIMIT * usual:
                drops.append(f"{month['month']:%Y-%m}: {per_day:,.0f} a day, usually {usual:,.0f}")
        usual_per_day.append(per_day)
    assert not drops, f"{column} dropped sharply: " + "; ".join(drops)


def test_unknown_item_rows_do_not_jump(quality):
    """Rows with an item code missing from the item lookup are dropped. Some are normal
    (new codes the lookup hasn't caught up with), but a jump means much more data is
    being thrown away, e.g. because the lookup is broken or out of date."""
    jumps = []
    usual_share = []
    for month in quality:
        if month["price_rows"] == 0:  # an empty month fails the row-count test instead
            continue
        share = 100 * month["unknown_item_rows"] / month["price_rows"]
        if usual_share:
            usual = median(usual_share[-LOOKBACK:])
            if share > usual + JUMP_LIMIT:
                jumps.append(f"{month['month']:%Y-%m}: {share:.1f}% of rows, usually {usual:.1f}%")
        usual_share.append(share)
    assert not jumps, "Unknown-item rows jumped: " + "; ".join(jumps)


def test_every_basket_item_has_prices_every_month(expected_months):
    """Each basket item needs a state-wide price every month, or the basket can't be
    added up. A month missing from the data altogether fails too."""
    priced = {
        (row["month"], row["item_code"])
        for row in query("SELECT month, item_code FROM read_parquet(?) WHERE level = 'state' AND shops > 0",
                         str(PRICES_FILE))
    }
    missing = [f"{month:%Y-%m} item {code}"
               for month in expected_months
               for code in CONFIG["basket"]
               if (month, code) not in priced]
    assert not missing, "No prices for: " + ", ".join(missing)


def test_state_basket_has_every_month(expected_months):
    """The main chart, the state-wide basket, should have no gaps. A month needs every
    item priced by at least min_shops shops (04_basket.sql)."""
    basket = json.loads((SITE_DATA_DIR / "basket_state.json").read_text(encoding="utf-8"))
    have = {row["month"] for row in basket}
    missing = [f"{month:%Y-%m}" for month in expected_months if f"{month:%Y-%m}" not in have]
    assert not missing, f"No {CONFIG['state']} basket for: " + ", ".join(missing)
