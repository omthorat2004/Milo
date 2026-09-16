from __future__ import annotations

import logging
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from milo_backend.core._settings import Settings, get_settings

logger = logging.getLogger("milo.database")

_client: AsyncIOMotorClient[dict[str, Any]] | None = None


async def connect(settings: Settings) -> None:
    global _client

    _client = AsyncIOMotorClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=settings.mongodb_timeout_ms,
        connectTimeoutMS=settings.mongodb_timeout_ms,
        maxPoolSize=10,
        retryWrites=True,
    )

    await _client.admin.command("ping")
    logger.info("Connected to MongoDB database %s", settings.mongodb_db)


async def disconnect() -> None:
    global _client

    if _client is not None:
        _client.close()
        _client = None
        logger.info("Disconnected from MongoDB")


def get_client() -> AsyncIOMotorClient[dict[str, Any]]:
    if _client is None:
        raise RuntimeError("MongoDB is not connected. Did the lifespan handler run?")
    return _client


def get_database() -> AsyncIOMotorDatabase[dict[str, Any]]:
    settings = get_settings()
    return get_client()[settings.mongodb_db]
