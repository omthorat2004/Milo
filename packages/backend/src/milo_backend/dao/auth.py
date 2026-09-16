from __future__ import annotations

from datetime import datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ASCENDING, ReturnDocument
from pymongo.errors import DuplicateKeyError, OperationFailure

from milo_backend.dao._base import BaseDAO
from milo_backend.model.email_verification import EmailVerification, VerificationStatus
from milo_backend.model.user import User

INDEX_OPTIONS_CONFLICT = 85

TTL_INDEX = "ttl_verification_last_sent_at"


def _with_id(document: dict[str, Any]) -> dict[str, Any]:
    return {**document, "id": str(document["_id"])}


def _object_id(value: str) -> ObjectId | None:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return None


class UserDAO(BaseDAO):
    collection_name = "users"

    async def create_indexes(self) -> None:
        await self.collection.create_index(
            [("email", ASCENDING)], unique=True, name="uniq_user_email"
        )

    async def create(
        self,
        *,
        name: str,
        email: str,
        password_hash: str,
        now: datetime,
    ) -> User | None:
        document: dict[str, Any] = {
            "name": name,
            "email": email,
            "password_hash": password_hash,
            "email_verified": False,
            "created_at": now,
            "updated_at": now,
            "last_login_at": None,
        }

        try:
            result = await self.collection.insert_one(document)
        except DuplicateKeyError:
            return None

        return User.model_validate({**document, "id": str(result.inserted_id)})

    async def get_by_email(self, email: str) -> User | None:
        document = await self.collection.find_one({"email": email})
        return User.model_validate(_with_id(document)) if document else None

    async def get_by_id(self, user_id: str) -> User | None:
        identifier = _object_id(user_id)
        if identifier is None:
            return None

        document = await self.collection.find_one({"_id": identifier})
        return User.model_validate(_with_id(document)) if document else None

    async def mark_email_verified(self, user_id: str, *, now: datetime) -> None:
        identifier = _object_id(user_id)
        if identifier is None:
            return

        await self.collection.update_one(
            {"_id": identifier},
            {"$set": {"email_verified": True, "updated_at": now}},
        )

    async def record_login(self, user_id: str, *, now: datetime) -> None:
        identifier = _object_id(user_id)
        if identifier is None:
            return

        await self.collection.update_one(
            {"_id": identifier},
            {"$set": {"last_login_at": now, "updated_at": now}},
        )


class EmailVerificationDAO(BaseDAO):
    collection_name = "email_verifications"

    async def create_indexes(self, *, ttl_seconds: int) -> None:
        await self.collection.create_index(
            [("user_id", ASCENDING)], unique=True, name="uniq_verification_user"
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
    ) -> EmailVerification:
        identifier = _require_object_id(user_id)

        document = await self.collection.find_one_and_update(
            {"user_id": identifier},
            {
                "$set": {
                    "code_hash": code_hash,
                    "status": VerificationStatus.PENDING.value,
                    "attempts": 0,
                    "last_sent_at": now,
                    "verified_at": None,
                },
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        return _as_verification(document)

    async def get_by_user_id(self, user_id: str) -> EmailVerification | None:
        identifier = _object_id(user_id)
        if identifier is None:
            return None

        document = await self.collection.find_one({"user_id": identifier})
        return _as_verification(document) if document else None

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

    async def mark_verified(self, user_id: str, *, now: datetime) -> None:
        identifier = _object_id(user_id)
        if identifier is None:
            return

        await self.collection.update_one(
            {"user_id": identifier},
            {
                "$set": {
                    "status": VerificationStatus.VERIFIED.value,
                    "verified_at": now,
                }
            },
        )


def _require_object_id(value: str) -> ObjectId:
    identifier = _object_id(value)
    if identifier is None:
        raise ValueError(f"Not a Mongo identifier: {value!r}")
    return identifier


def _as_verification(document: dict[str, Any]) -> EmailVerification:
    return EmailVerification.model_validate(
        {**_with_id(document), "user_id": str(document["user_id"])}
    )
