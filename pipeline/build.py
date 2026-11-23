"""Rebuild the data behind the Jejak Harga site.

Usage (from the repo root):
    python pipeline/build.py           # daily run: refresh the previous and current month
    python pipeline/build.py --full    # rebuild every month since first_month in config.json

Steps:
1. Download the monthly PriceCatcher files it needs, the two lookups and the state CPI
   into data/raw/ (kept out of git).
2. In an in-memory DuckDB database, run pipeline/sql/01-03 for each month (load,
   quality counts, monthly prices), then 04 once over all months (basket cost).
3. Save the monthly summaries to data/monthly_prices.parquet and
   data/monthly_quality.parquet. The daily run starts from these.
4. Write small JSON files for the site to site/public/data/.

Data: PriceCatcher (KPDN) and CPI (DOSM) via OpenDOSM / data.gov.my, CC BY 4.0
"""

import argparse
import http.client
import json
import shutil
import sys
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parent.parent
CONFIG_FILE = ROOT / "pipeline" / "config.json"
SQL_DIR = ROOT / "pipeline" / "sql"
RAW_DIR = ROOT / "data" / "raw"
PRICES_FILE = ROOT / "data" / "monthly_prices.parquet"
QUALITY_FILE = ROOT / "data" / "monthly_quality.parquet"
SITE_DATA_DIR = ROOT / "site" / "public" / "data"

PRICECATCHER_URL = "https://storage.data.gov.my/pricecatcher"
INPUT_URLS = {  # SQL variable name -> file to download
    "items_file": f"{PRICECATCHER_URL}/lookup_item.parquet",
    "premises_file": f"{PRICECATCHER_URL}/lookup_premise.parquet",
    "cpi_file": "https://storage.dosm.gov.my/cpi/cpi_2d_state.parquet",
}
MONTHLY_SQL = ["01_load.sql", "02_quality.sql", "03_monthly_prices.sql"]

# GitHub Actions runs in UTC. Malaysia has no daylight saving, so a fixed
# UTC+8 offset always gives the Malaysian date.
MALAYSIA = timezone(timedelta(hours=8))


# ---------------------------------------------------------------- months

def add_months(month: date, n: int) -> date:
    """The first day of the month n months after `month` (before it if n < 0)."""
    index = month.year * 12 + month.month - 1 + n
    return date(index // 12, index % 12 + 1, 1)


def month_range(first: date, last: date) -> list[date]:
    """Every month from first to last, inclusive."""
    months = []
    while first <= last:
        months.append(first)
        first = add_months(first, 1)
    return months


# ---------------------------------------------------------------- downloads

def download(url: str, dest: Path) -> bool:
    """Save url to dest. Returns False if the server has no such file (404).

    The file is written to dest.part and renamed when complete, so a failed
    download never leaves a half-written file behind. Network errors are retried.
    """
    partial = dest.with_name(dest.name + ".part")
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(url, timeout=120) as response, open(partial, "wb") as f:
                shutil.copyfileobj(response, f)
            partial.replace(dest)
            return True
        except urllib.error.HTTPError as error:
            if error.code == 404:
                return False
            problem = error
        except (OSError, http.client.HTTPException) as error:  # timeouts, dropped connections
            problem = error
        if attempt < 3:
            time.sleep(10 * attempt)
    sys.exit(f"Could not download {url}: {problem}")


def download_inputs(months: list[date], this_month: date) -> tuple[dict, dict]:
    """Download the lookups, the CPI and the monthly price files.

    Returns ({sql variable: path} for the lookups and CPI, {month: path} for prices).
    """
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    inputs = {}
    for variable, url in INPUT_URLS.items():
        path = RAW_DIR / url.rsplit("/", 1)[1]
        if not download(url, path):
            sys.exit(f"{url} is missing (404).")
        inputs[variable] = path

    price_files = {}
    for month in months:
        name = f"pricecatcher_{month:%Y-%m}.parquet"
        if download(f"{PRICECATCHER_URL}/{name}", RAW_DIR / name):
            price_files[month] = RAW_DIR / name
        elif month == this_month:
            # Normal on the 1st of a month, before the first day's prices are published
            print(f"{month:%Y-%m}  not published yet, skipped")
        else:
            sys.exit(f"{PRICECATCHER_URL}/{name} is missing (404).")
    print(f"Downloaded {len(inputs)} lookup/CPI files and {len(price_files)} monthly files to data/raw/")
    return inputs, price_files


# ---------------------------------------------------------------- DuckDB

def set_variables(con: duckdb.DuckDBPyConnection, **values) -> None:
    """Make Python values available to the SQL files as getvariable('name')."""
    for name, value in values.items():
        con.execute(f"SET VARIABLE {name} = ?", [value])


def run_sql(con: duckdb.DuckDBPyConnection, file_name: str) -> None:
    con.execute((SQL_DIR / file_name).read_text(encoding="utf-8"))


def load_saved_summaries(con: duckdb.DuckDBPyConnection, config: dict) -> date:
    """Daily run: start from the saved summaries. Returns the last month they cover."""
    if not (PRICES_FILE.exists() and QUALITY_FILE.exists()):
        sys.exit("No saved summaries in data/ yet. Run  python pipeline/build.py --full  first.")
    con.execute("CREATE TABLE monthly_prices AS SELECT * FROM read_parquet(?)", [str(PRICES_FILE)])
    con.execute("CREATE TABLE monthly_quality AS SELECT * FROM read_parquet(?)", [str(QUALITY_FILE)])

    # The summary only holds the basket items for one state, starting at first_month,
    # so if config.json has changed, only a full rebuild gives consistent history.
    states, items, first = con.execute("""
        SELECT list_sort(list_distinct(list(area) FILTER (WHERE level = 'state'))),
               list_sort(list_distinct(list(item_code))),
               min(month)
        FROM monthly_prices
    """).fetchone()
    if states != [config["state"]] or items != sorted(config["basket"]) or first != config["first_month"]:
        sys.exit("data/monthly_prices.parquet was built for a different state, basket or first month "
                 "than pipeline/config.json. Run  python pipeline/build.py --full  to rebuild it.")
    return con.execute("SELECT max(month) FROM monthly_quality").fetchone()[0]


def build_tables(con: duckdb.DuckDBPyConnection, config: dict, inputs: dict, price_files: dict) -> None:
    """Run 01-03 for each month, then 04 over every month."""
    set_variables(con,
                  state=config["state"],
                  basket=config["basket"],
                  min_shops=config["min_shops"],
                  first_month=config["first_month"],
                  **{variable: str(path) for variable, path in inputs.items()})
    for month, path in price_files.items():
        set_variables(con, month=month, price_file=str(path))
        for file_name in MONTHLY_SQL:
            run_sql(con, file_name)
        days, rows, state_rows = con.execute(
            "SELECT days, price_rows, state_rows FROM monthly_quality WHERE month = ?", [month]
        ).fetchone()
        print(f"{month:%Y-%m}  {rows:>9,} prices on {days:>2} days, {state_rows:>7,} in {config['state']}")
    run_sql(con, "04_basket.sql")


def save_parquet(con: duckdb.DuckDBPyConnection, query: str, path: Path) -> None:
    """Write a query's result to path, replacing the old file only once the new one is complete."""
    partial = path.with_name(path.name + ".part")
    con.sql(query).write_parquet(str(partial), compression="zstd")
    partial.replace(path)


# ---------------------------------------------------------------- JSON for the site

def to_json_value(value):
    """DuckDB gives exact decimals and dates; JSON wants plain numbers and text."""
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, date):
        return value.isoformat()
    return value


def records(con: duckdb.DuckDBPyConnection, query: str) -> list[dict]:
    """Run a query and return its rows as a list of {column: value}."""
    cursor = con.execute(query)
    columns = [column[0] for column in cursor.description]
    return [{c: to_json_value(v) for c, v in zip(columns, row)} for row in cursor.fetchall()]


def write_json(path: Path, data) -> None:
    """Write data as JSON. A list gets one record per line, which keeps git diffs readable."""
    if isinstance(data, list):
        text = "[\n" + ",\n".join(json.dumps(row, ensure_ascii=False) for row in data) + "\n]\n"
    else:
        text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    path.write_text(text, encoding="utf-8")


def site_data(con: duckdb.DuckDBPyConnection, config: dict) -> dict:
    """Every file the site loads, as {file name: data}."""
    data_until = con.execute("SELECT max(last_day) FROM monthly_quality").fetchone()[0]
    return {
        # The main series: the state-wide basket each month
        "basket_state.json": records(con, """
            SELECT strftime(month, '%Y-%m') AS month, basket_rm, fewest_shops
            FROM basket
            WHERE level = 'state'
            ORDER BY month
        """),
        # District lines: only months where every item had at least min_shops shops there
        "basket_districts.json": records(con, """
            SELECT strftime(month, '%Y-%m') AS month, area AS district, basket_rm, fewest_shops
            FROM basket
            WHERE level = 'district'
            ORDER BY district, month
        """),
        # Each basket item's state-wide price, so the site can switch items on and off
        "item_prices.json": records(con, """
            SELECT strftime(month, '%Y-%m') AS month, item_code, price, shops
            FROM monthly_prices
            WHERE level = 'state'
            ORDER BY item_code, month
        """),
        "food_cpi.json": records(con, """
            SELECT strftime(month, '%Y-%m') AS month, food_cpi
            FROM food_cpi
            ORDER BY month
        """),
        "quality.json": {
            "lookups": records(con, "SELECT * FROM lookup_quality")[0],
            "months": records(con, """
                SELECT strftime(month, '%Y-%m') AS month, * EXCLUDE (month)
                FROM monthly_quality
                ORDER BY month
            """),
        },
        "meta.json": {
            "last_updated": datetime.now(MALAYSIA).date().isoformat(),
            "data_until": data_until.isoformat(),  # the latest day with prices
            "state": config["state"],
            "min_shops": config["min_shops"],
            "first_month": f"{config['first_month']:%Y-%m}",
            # Names and units from the item lookup, in config.json order
            "basket": records(con, """
                SELECT item_code, item, unit, item_group, item_category
                FROM items
                WHERE list_contains(getvariable('basket'), item_code)
                ORDER BY list_position(getvariable('basket'), item_code)
            """),
        },
    }


# ---------------------------------------------------------------- main

def main() -> None:
    parser = argparse.ArgumentParser(description="Rebuild the Jejak Harga data.")
    parser.add_argument("--full", action="store_true",
                        help="rebuild every month since first_month (default: previous and current month)")
    args = parser.parse_args()
    started = time.monotonic()

    with open(CONFIG_FILE, encoding="utf-8") as f:
        config = json.load(f)
    config["first_month"] = date.fromisoformat(config["first_month"] + "-01")

    con = duckdb.connect()  # in memory: everything is rebuilt from files each run
    this_month = datetime.now(MALAYSIA).date().replace(day=1)
    if args.full:
        months = month_range(config["first_month"], this_month)
    else:
        last_saved = load_saved_summaries(con, config)
        # The previous month (late prices can arrive) and the current one. If the saved
        # data ends earlier, e.g. because the scheduled job was paused, fill the gap too.
        months = month_range(min(add_months(this_month, -1), last_saved), this_month)
    print(f"{'Full' if args.full else 'Daily'} run: {months[0]:%Y-%m} to {months[-1]:%Y-%m}")

    inputs, price_files = download_inputs(months, this_month)
    build_tables(con, config, inputs, price_files)

    save_parquet(con, "SELECT * FROM monthly_prices ORDER BY month, level, area, item_code", PRICES_FILE)
    save_parquet(con, "SELECT * FROM monthly_quality ORDER BY month", QUALITY_FILE)

    SITE_DATA_DIR.mkdir(parents=True, exist_ok=True)
    outputs = site_data(con, config)
    for file_name, data in outputs.items():
        write_json(SITE_DATA_DIR / file_name, data)

    print(f"Saved data/{PRICES_FILE.name} and data/{QUALITY_FILE.name}; "
          f"wrote {len(outputs)} files to site/public/data/")
    print(f"Prices until {outputs['meta.json']['data_until']}. Took {time.monotonic() - started:.0f}s.")
    if outputs["basket_state.json"]:
        latest = outputs["basket_state.json"][-1]
        print(f"Latest {config['state']} basket: RM{latest['basket_rm']:.2f} ({latest['month']})")


if __name__ == "__main__":
    main()
