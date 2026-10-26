from __future__ import annotations

from datetime import datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ASCENDING, ReturnDocument

from milo_backend.dao._base import BaseDAO
from milo_backend.model.resume import Resume


def _with_id(document: dict[str, Any]) -> dict[str, Any]:
    return {**document, "id": str(document["_id"])}


def _object_id(value: str) -> ObjectId | None:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return None


def _require_object_id(value: str) -> ObjectId:
    identifier = _object_id(value)
    if identifier is None:
        raise ValueError(f"Not a Mongo identifier: {value!r}")
    return identifier


class ResumeDAO(BaseDAO):
    collection_name = "resumes"

    async def create_indexes(self) -> None:
        await self.collection.create_index(
            [("owner_id", ASCENDING)], name="idx_resume_owner"
        )

    async def create(
        self, *, owner_id: str, title: str, source_url: str, now: datetime
    ) -> Resume:
        document: dict[str, Any] = {
            "owner_id": _require_object_id(owner_id),
            "title": title,
            "source_url": source_url,
            "created_at": now,
            "updated_at": now,
        }
        result = await self.collection.insert_one(document)
        return _as_resume({**document, "_id": result.inserted_id})

    async def get_by_id(self, resume_id: str) -> Resume | None:
        identifier = _object_id(resume_id)
        if identifier is None:
            return None

        document = await self.collection.find_one({"_id": identifier})
        return _as_resume(document) if document else None

    async def get_by_id_for_owner(self, resume_id: str, owner_id: str) -> Resume | None:
        identifier = _object_id(resume_id)
        owner = _object_id(owner_id)
        if identifier is None or owner is None:
            return None

        document = await self.collection.find_one(
            {"_id": identifier, "owner_id": owner}
        )
        return _as_resume(document) if document else None

    async def list_by_owner(self, owner_id: str, *, limit: int = 100) -> list[Resume]:
        owner = _object_id(owner_id)
        if owner is None:
            return []

        cursor = self.collection.find({"owner_id": owner}).sort("created_at", -1)
        documents = await cursor.to_list(limit)
        return [_as_resume(document) for document in documents]

    async def update(
        self,
        resume_id: str,
        owner_id: str,
        *,
        title: str | None,
        source_url: str | None,
        now: datetime,
    ) -> Resume | None:
        identifier = _object_id(resume_id)
        owner = _object_id(owner_id)
        if identifier is None or owner is None:
            return None

        fields: dict[str, Any] = {"updated_at": now}
        if title is not None:
            fields["title"] = title
        if source_url is not None:
            fields["source_url"] = source_url

        document = await self.collection.find_one_and_update(
            {"_id": identifier, "owner_id": owner},
            {"$set": fields},
            return_document=ReturnDocument.AFTER,
        )
        return _as_resume(document) if document else None

    async def list_by_ids(self, resume_ids: list[str]) -> list[Resume]:
        identifiers = [
            identifier
            for value in resume_ids
            if (identifier := _object_id(value)) is not None
        ]
        if not identifiers:
            return []

        cursor = self.collection.find({"_id": {"$in": identifiers}})
        documents = await cursor.to_list(len(identifiers))
        return [_as_resume(document) for document in documents]


def _as_resume(document: dict[str, Any]) -> Resume:
    return Resume.model_validate(
        {**_with_id(document), "owner_id": str(document["owner_id"])}
    )
