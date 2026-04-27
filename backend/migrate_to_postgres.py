"""
Migrate data from SQLite to PostgreSQL.
Usage:
  1. Set DATABASE_URL in .env to your PostgreSQL connection string
  2. Run: python migrate_to_postgres.py
"""
import asyncio
import sys
import os
import sqlite3

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.database import engine, async_session
from app.models.base import Base


TABLES_ORDER = [
    "users", "articles", "buyers", "racks",
    "stock_entries", "sales", "purchases", "audit_logs",
]


async def main():
    sqlite_path = os.path.join(os.path.dirname(__file__), "caratsense.db")
    if not os.path.exists(sqlite_path):
        print("Error: caratsense.db not found")
        return

    print("Creating PostgreSQL tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row

    for table in TABLES_ORDER:
        try:
            rows = sqlite_conn.execute(f"SELECT * FROM {table}").fetchall()
            if not rows:
                print(f"  {table}: 0 rows (skip)")
                continue

            columns = rows[0].keys()
            placeholders = ", ".join([f":{c}" for c in columns])
            cols_str = ", ".join(columns)

            async with async_session() as session:
                batch_size = 500
                for i in range(0, len(rows), batch_size):
                    batch = rows[i:i + batch_size]
                    values = [dict(row) for row in batch]
                    await session.execute(
                        text(f"INSERT INTO {table} ({cols_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"),
                        values,
                    )
                await session.commit()

            print(f"  {table}: {len(rows)} rows migrated")
        except Exception as e:
            print(f"  {table}: ERROR - {e}")

    sqlite_conn.close()
    print("\nMigration complete!")


if __name__ == "__main__":
    asyncio.run(main())
