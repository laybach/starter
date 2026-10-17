"""Postgres connection pool and a tiny migration runner.

Migrations are the numbered .sql files in backend/migrations/, applied in filename order at
startup and recorded in schema_migrations, each in its own transaction. The API starts before
the database is guaranteed to be up (there's no cross-file depends_on), so connecting retries
until Postgres answers.
"""
import asyncio
import logging
import os
from pathlib import Path

from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

log = logging.getLogger("starter.db")

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"

CONNINFO = (
    f"host={os.environ.get('DB_HOST', 'starter-db')} "
    f"port={os.environ.get('DB_PORT', '9200')} "
    f"dbname={os.environ.get('DB_NAME', 'starter')} "
    f"user={os.environ.get('DB_USER', 'starter')} "
    f"password={os.environ.get('DB_PASSWORD', '')}"
)

pool: AsyncConnectionPool | None = None


def _new_pool() -> AsyncConnectionPool:
    # check= validates a connection on checkout, so connections cut by a restore
    # (DROP DATABASE ... WITH (FORCE)) are replaced instead of failing a request.
    return AsyncConnectionPool(
        CONNINFO,
        open=False,
        min_size=1,
        max_size=5,
        kwargs={"row_factory": dict_row},
        check=AsyncConnectionPool.check_connection,
    )


async def connect() -> None:
    global pool
    while True:
        # A closed pool can't be reopened, so each attempt gets a fresh one.
        candidate = _new_pool()
        try:
            await candidate.open(wait=True, timeout=5)
            pool = candidate
            await migrate()
            return
        except Exception as exc:  # database not up yet, or mid-restore
            log.warning("Database not ready (%s); retrying in 2s", exc)
            pool = None
            await candidate.close()
            await asyncio.sleep(2)


async def close() -> None:
    if pool is not None:
        await pool.close()


def get_pool() -> AsyncConnectionPool:
    if pool is None:
        raise RuntimeError("Database not connected yet")
    return pool


async def migrate() -> None:
    pool = get_pool()
    async with pool.connection() as conn:
        await conn.execute(
            """CREATE TABLE IF NOT EXISTS schema_migrations (
                   version TEXT PRIMARY KEY,
                   applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
               )"""
        )
        applied = {r["version"] for r in await (await conn.execute("SELECT version FROM schema_migrations")).fetchall()}

    for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
        if path.stem in applied:
            continue
        async with pool.connection() as conn, conn.transaction():
            await conn.execute(path.read_text())
            await conn.execute("INSERT INTO schema_migrations (version) VALUES (%s)", (path.stem,))
        log.info("Applied migration %s", path.name)
