"""Run every statement in a .sql file against a DuckDB database and print the SELECT results.

Usage:
    pip install -U duckdb
    python run_sql.py explore.sql              # uses harga.duckdb
    python run_sql.py explore.sql other.duckdb
"""

import sys

import duckdb


def title_of(query: str) -> str:
    """Use the comment right above a query as its title, or the start of the SQL."""
    for line in query.strip().splitlines():
        line = line.strip()
        if line.startswith("--"):
            return line.lstrip("-").strip()
        if line:
            break
    return " ".join(query.split())[:70] + " ..."


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)

    sql_file = sys.argv[1]
    db_file = sys.argv[2] if len(sys.argv) > 2 else "harga.duckdb"

    with open(sql_file, encoding="utf-8") as f:
        statements = duckdb.extract_statements(f.read())

    con = duckdb.connect(db_file)
    try:
        for statement in statements:
            if statement.type != duckdb.StatementType.SELECT:
                con.execute(statement.query)  # SET, CREATE, COPY: nothing to show
                continue
            print(f"\n>> {title_of(statement.query)}")
            con.sql(statement.query).show(max_rows=30)
    finally:
        con.close()


if __name__ == "__main__":
    main()
