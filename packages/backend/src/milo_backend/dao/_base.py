from __future__ import annotations

from typing import Any

from motor.motor_asyncio import AsyncIOMotorCollection, AsyncIOMotorDatabase


class BaseDAO:
    collection_name: str

    def __init__(self, db: AsyncIOMotorDatabase[dict[str, Any]]) -> None:
        self.db = db

    @property
    def collection(self) -> AsyncIOMotorCollection[dict[str, Any]]:
        if self.db is None:
            raise RuntimeError("MongoDB is not connected. Did the lifespan handler run?")
        return self.db[self.collection_name]
