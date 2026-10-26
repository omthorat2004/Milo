from __future__ import annotations

from datetime import datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ASCENDING, DESCENDING

from milo_backend.dao._base import BaseDAO
from milo_backend.model.analytics_event import AnalyticsEvent, EventType


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


class AnalyticsEventDAO(BaseDAO):
    collection_name = "analytics_events"

    async def create_indexes(self) -> None:
        await self.collection.create_index(
            [("link_id", ASCENDING), ("occurred_at", DESCENDING)],
            name="idx_event_link_occurred_at",
        )

    async def create(
        self,
        *,
        link_id: str,
        resume_id: str,
        event_type: EventType,
        occurred_at: datetime,
        session_id: str | None,
        device_category: str | None,
        browser: str | None,
        os: str | None,
        referrer_domain: str | None,
        utm_source: str | None,
        utm_medium: str | None,
        utm_campaign: str | None,
        page_number: int | None,
        dwell_time_seconds: float | None,
    ) -> AnalyticsEvent:
        document: dict[str, Any] = {
            "link_id": _require_object_id(link_id),
            "resume_id": _require_object_id(resume_id),
            "event_type": event_type.value,
            "occurred_at": occurred_at,
            "session_id": session_id,
            "device_category": device_category,
            "browser": browser,
            "os": os,
            "referrer_domain": referrer_domain,
            "utm_source": utm_source,
            "utm_medium": utm_medium,
            "utm_campaign": utm_campaign,
            "page_number": page_number,
            "dwell_time_seconds": dwell_time_seconds,
        }

        result = await self.collection.insert_one(document)
        return _as_event({**document, "_id": result.inserted_id})

    async def list_by_link(
        self, link_id: str, *, limit: int = 500
    ) -> list[AnalyticsEvent]:
        identifier = _object_id(link_id)
        if identifier is None:
            return []

        cursor = self.collection.find({"link_id": identifier}).sort("occurred_at", -1)
        documents = await cursor.to_list(limit)
        return [_as_event(document) for document in documents]

    async def list_by_links(
        self, link_ids: list[str], *, limit: int = 1_000
    ) -> list[AnalyticsEvent]:
        identifiers = [
            identifier
            for value in link_ids
            if (identifier := _object_id(value)) is not None
        ]
        if not identifiers:
            return []

        cursor = self.collection.find({"link_id": {"$in": identifiers}}).sort(
            "occurred_at", -1
        )
        documents = await cursor.to_list(limit)
        return [_as_event(document) for document in documents]


def _as_event(document: dict[str, Any]) -> AnalyticsEvent:
    return AnalyticsEvent.model_validate(
        {
            **document,
            "id": str(document["_id"]),
            "link_id": str(document["link_id"]),
            "resume_id": str(document["resume_id"]),
        }
    )
