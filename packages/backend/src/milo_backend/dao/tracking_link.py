from __future__ import annotations

from datetime import datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ASCENDING, ReturnDocument
from pymongo.errors import DuplicateKeyError

from milo_backend.dao._base import BaseDAO
from milo_backend.model.tracking_link import TrackingLink


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


class TrackingLinkDAO(BaseDAO):
    collection_name = "tracking_links"

    async def create_indexes(self) -> None:
        await self.collection.create_index(
            [("slug", ASCENDING)], unique=True, name="uniq_tracking_link_slug"
        )
        await self.collection.create_index(
            [("resume_id", ASCENDING)], name="idx_tracking_link_resume"
        )

    async def create(
        self,
        *,
        resume_id: str,
        owner_id: str,
        slug: str,
        now: datetime,
        expires_at: datetime | None,
    ) -> TrackingLink | None:
        document: dict[str, Any] = {
            "resume_id": _require_object_id(resume_id),
            "owner_id": _require_object_id(owner_id),
            "slug": slug,
            "created_at": now,
            "expires_at": expires_at,
            "revoked_at": None,
        }

        try:
            result = await self.collection.insert_one(document)
        except DuplicateKeyError:
            return None

        return _as_link({**document, "_id": result.inserted_id})

    async def get_by_slug(self, slug: str) -> TrackingLink | None:
        document = await self.collection.find_one({"slug": slug})
        return _as_link(document) if document else None

    async def get_by_id_for_owner(
        self, link_id: str, owner_id: str
    ) -> TrackingLink | None:
        identifier = _object_id(link_id)
        owner = _object_id(owner_id)
        if identifier is None or owner is None:
            return None

        document = await self.collection.find_one(
            {"_id": identifier, "owner_id": owner}
        )
        return _as_link(document) if document else None

    async def list_by_resume(
        self, resume_id: str, *, limit: int = 200
    ) -> list[TrackingLink]:
        identifier = _object_id(resume_id)
        if identifier is None:
            return []

        cursor = self.collection.find({"resume_id": identifier}).sort("created_at", -1)
        documents = await cursor.to_list(limit)
        return [_as_link(document) for document in documents]

    async def list_by_owner(
        self, owner_id: str, *, limit: int = 500
    ) -> list[TrackingLink]:
        owner = _object_id(owner_id)
        if owner is None:
            return []

        cursor = self.collection.find({"owner_id": owner}).sort("created_at", -1)
        documents = await cursor.to_list(limit)
        return [_as_link(document) for document in documents]

    async def revoke(self, link_id: str, owner_id: str, *, now: datetime) -> None:
        identifier = _object_id(link_id)
        owner = _object_id(owner_id)
        if identifier is None or owner is None:
            return

        await self.collection.update_one(
            {"_id": identifier, "owner_id": owner},
            {"$set": {"revoked_at": now}},
        )

    async def update_expiry(
        self, link_id: str, owner_id: str, *, expires_at: datetime | None
    ) -> TrackingLink | None:
        """Set or clear expiry. Excludes a revoked link: revoking is permanent,
        so there is nothing left to edit once `revoked_at` is set."""
        identifier = _object_id(link_id)
        owner = _object_id(owner_id)
        if identifier is None or owner is None:
            return None

        document = await self.collection.find_one_and_update(
            {"_id": identifier, "owner_id": owner, "revoked_at": None},
            {"$set": {"expires_at": expires_at}},
            return_document=ReturnDocument.AFTER,
        )
        return _as_link(document) if document else None


def _as_link(document: dict[str, Any]) -> TrackingLink:
    return TrackingLink.model_validate(
        {
            **_with_id(document),
            "resume_id": str(document["resume_id"]),
            "owner_id": str(document["owner_id"]),
        }
    )
