"""Clear every document from every collection in the configured MongoDB
database. Development convenience only, refuses to run against production.

Indexes are left alone (`delete_many`, not `drop`): `ensure_indexes` already
runs them idempotently on every app startup, but clearing without dropping
means a reset doesn't require restarting an already-running dev server.

Usage:
    poetry run python scripts/reset_db.py          # asks for confirmation
    poetry run python scripts/reset_db.py --yes     # skips the prompt
"""

from __future__ import annotations

import asyncio
import sys

from motor.motor_asyncio import AsyncIOMotorClient

from milo_backend.core import get_settings


async def main() -> None:
    settings = get_settings()

    if settings.is_production:
        print("Refusing to reset a production database.", file=sys.stderr)
        raise SystemExit(1)

    if "--yes" not in sys.argv:
        answer = input(
            f"This clears every collection in '{settings.mongodb_db}' at "
            f"{settings.mongodb_uri}. Type 'yes' to continue: "
        )
        if answer.strip().lower() != "yes":
            print("Aborted.")
            return

    client: AsyncIOMotorClient = AsyncIOMotorClient(settings.mongodb_uri)
    database = client[settings.mongodb_db]

    try:
        collection_names = await database.list_collection_names()
        if not collection_names:
            print(f"'{settings.mongodb_db}' has no collections, nothing to clear.")
            return

        for name in sorted(collection_names):
            result = await database[name].delete_many({})
            print(f"{name}: removed {result.deleted_count} documents")
    finally:
        client.close()

    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
