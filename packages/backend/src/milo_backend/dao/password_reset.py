from __future__ import annotations

from datetime import datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ASCENDING, ReturnDocument
from pymongo.errors import DuplicateKeyError, OperationFailure

from milo_backend.dao._base import BaseDAO
from milo_backend.model.password_reset import PasswordReset

INDEX_OPTIONS_CONFLICT = 85

TTL_INDEX = "ttl_password_reset_last_sent_at"

MAX_UPSERT_ATTEMPTS = 3


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


class PasswordResetDAO(BaseDAO):
    """Mirrors EmailVerificationDAO's shape (dao/auth.py): one pending reset
    per user (unique `user_id` index), a TTL index so a spent or abandoned
    code deletes itself rather than lingering as a guessable row."""

    collection_name = "password_resets"

    async def create_indexes(self, *, ttl_seconds: int) -> None:
        await self.collection.create_index(
            [("user_id", ASCENDING)], unique=True, name="uniq_password_reset_user"
        )

        try:
            await self._create_ttl_index(ttl_seconds)
        except OperationFailure as error:
            if error.code != INDEX_OPTIONS_CONFLICT:
                raise
            await self.collection.drop_index(TTL_INDEX)
            await self._create_ttl_index(ttl_seconds)

    async def _create_ttl_index(self, ttl_seconds: int) -> None:
        await self.collection.create_index(
            [("last_sent_at", ASCENDING)],
            expireAfterSeconds=ttl_seconds,
            name=TTL_INDEX,
        )

    async def upsert_pending(
        self,
        *,
        user_id: str,
        code_hash: str,
        now: datetime,
    ) -> PasswordReset:
        identifier = _require_object_id(user_id)
        update = {
            "$set": {
                "code_hash": code_hash,
                "attempts": 0,
                "last_sent_at": now,
                "used_at": None,
            },
            "$setOnInsert": {"created_at": now},
        }

        # Same bounded-retry shape as EmailVerificationDAO.upsert_pending: two
        # overlapping forgot-password requests for the same user can race on
        # the unique `user_id` index.
        for _ in range(MAX_UPSERT_ATTEMPTS):
            try:
                document = await self.collection.find_one_and_update(
                    {"user_id": identifier},
                    update,
                    upsert=True,
                    return_document=ReturnDocument.AFTER,
                )
            except DuplicateKeyError:
                document = await self.collection.find_one_and_update(
                    {"user_id": identifier},
                    update,
                    upsert=False,
                    return_document=ReturnDocument.AFTER,
                )

            if document is not None:
                return _as_reset(document)

        raise RuntimeError(
            f"Could not upsert password_resets for user {user_id!r} "
            f"after {MAX_UPSERT_ATTEMPTS} attempts."
        )

    async def get_by_user_id(self, user_id: str) -> PasswordReset | None:
        identifier = _object_id(user_id)
        if identifier is None:
            return None

        document = await self.collection.find_one({"user_id": identifier})
        return _as_reset(document) if document else None

    async def increment_attempts(self, user_id: str) -> int:
        identifier = _object_id(user_id)
        if identifier is None:
            return 0

        document = await self.collection.find_one_and_update(
            {"user_id": identifier},
            {"$inc": {"attempts": 1}},
            return_document=ReturnDocument.AFTER,
            projection={"attempts": 1},
        )
        return int(document["attempts"]) if document else 0

    async def mark_used(self, user_id: str, *, now: datetime) -> None:
        identifier = _object_id(user_id)
        if identifier is None:
            return

        await self.collection.update_one(
            {"user_id": identifier},
            {"$set": {"used_at": now}},
        )


def _as_reset(document: dict[str, Any]) -> PasswordReset:
    return PasswordReset.model_validate(
        {
            **document,
            "id": str(document["_id"]),
            "user_id": str(document["user_id"]),
        }
    )
