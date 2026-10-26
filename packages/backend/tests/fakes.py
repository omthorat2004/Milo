"""In-memory fakes for the DAOs, implementing each real DAO's exact method
signatures (per docs/testing.md). Used by `tests/service/*` so business rules
are tested without a database — see backend-architecture.md's layering
rationale for why `service` is designed to allow this.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from milo_backend.model.analytics_event import AnalyticsEvent, EventType
from milo_backend.model.email_verification import EmailVerification, VerificationStatus
from milo_backend.model.resume import Resume
from milo_backend.model.tracking_link import TrackingLink
from milo_backend.model.user import User


def _new_id() -> str:
    return uuid.uuid4().hex[:24]


class FakeUserDAO:
    def __init__(self) -> None:
        self._by_id: dict[str, User] = {}

    async def create(
        self, *, name: str, email: str, password_hash: str, now: datetime
    ) -> User | None:
        if await self.get_by_email(email) is not None:
            return None

        user = User(
            id=_new_id(),
            name=name,
            email=email,
            password_hash=password_hash,
            email_verified=False,
            created_at=now,
            updated_at=now,
            last_login_at=None,
        )
        self._by_id[user.id] = user
        return user

    async def get_by_email(self, email: str) -> User | None:
        for user in self._by_id.values():
            if user.email == email:
                return user
        return None

    async def get_by_id(self, user_id: str) -> User | None:
        return self._by_id.get(user_id)

    async def mark_email_verified(self, user_id: str, *, now: datetime) -> None:
        user = self._by_id.get(user_id)
        if user is not None:
            self._by_id[user_id] = user.model_copy(
                update={"email_verified": True, "updated_at": now}
            )

    async def record_login(self, user_id: str, *, now: datetime) -> None:
        user = self._by_id.get(user_id)
        if user is not None:
            self._by_id[user_id] = user.model_copy(
                update={"last_login_at": now, "updated_at": now}
            )


class FakeEmailVerificationDAO:
    def __init__(self) -> None:
        self._by_user: dict[str, EmailVerification] = {}

    async def upsert_pending(
        self, *, user_id: str, code_hash: str, now: datetime
    ) -> EmailVerification:
        existing = self._by_user.get(user_id)
        record = EmailVerification(
            id=existing.id if existing else _new_id(),
            user_id=user_id,
            code_hash=code_hash,
            status=VerificationStatus.PENDING,
            attempts=0,
            created_at=existing.created_at if existing else now,
            last_sent_at=now,
            verified_at=None,
        )
        self._by_user[user_id] = record
        return record

    async def get_by_user_id(self, user_id: str) -> EmailVerification | None:
        return self._by_user.get(user_id)

    async def increment_attempts(self, user_id: str) -> int:
        record = self._by_user[user_id]
        record = record.model_copy(update={"attempts": record.attempts + 1})
        self._by_user[user_id] = record
        return record.attempts

    async def mark_verified(self, user_id: str, *, now: datetime) -> None:
        record = self._by_user.get(user_id)
        if record is not None:
            self._by_user[user_id] = record.model_copy(
                update={"status": VerificationStatus.VERIFIED, "verified_at": now}
            )


class FakeResumeDAO:
    def __init__(self) -> None:
        self._by_id: dict[str, Resume] = {}

    async def create(
        self, *, owner_id: str, title: str, source_url: str, now: datetime
    ) -> Resume:
        resume = Resume(
            id=_new_id(),
            owner_id=owner_id,
            title=title,
            source_url=source_url,
            created_at=now,
            updated_at=now,
        )
        self._by_id[resume.id] = resume
        return resume

    async def get_by_id(self, resume_id: str) -> Resume | None:
        return self._by_id.get(resume_id)

    async def get_by_id_for_owner(self, resume_id: str, owner_id: str) -> Resume | None:
        resume = self._by_id.get(resume_id)
        return resume if resume is not None and resume.owner_id == owner_id else None

    async def list_by_owner(self, owner_id: str, *, limit: int = 100) -> list[Resume]:
        return [r for r in self._by_id.values() if r.owner_id == owner_id][:limit]

    async def list_by_ids(self, resume_ids: list[str]) -> list[Resume]:
        return [self._by_id[i] for i in resume_ids if i in self._by_id]

    async def update(
        self,
        resume_id: str,
        owner_id: str,
        *,
        title: str | None,
        source_url: str | None,
        now: datetime,
    ) -> Resume | None:
        resume = await self.get_by_id_for_owner(resume_id, owner_id)
        if resume is None:
            return None

        updated = resume.model_copy(
            update={
                "title": title if title is not None else resume.title,
                "source_url": source_url
                if source_url is not None
                else resume.source_url,
                "updated_at": now,
            }
        )
        self._by_id[resume_id] = updated
        return updated


class FakeTrackingLinkDAO:
    def __init__(self) -> None:
        self._by_id: dict[str, TrackingLink] = {}

    async def create(
        self,
        *,
        resume_id: str,
        owner_id: str,
        slug: str,
        now: datetime,
        expires_at: datetime | None,
    ) -> TrackingLink | None:
        if any(link.slug == slug for link in self._by_id.values()):
            return None

        link = TrackingLink(
            id=_new_id(),
            resume_id=resume_id,
            owner_id=owner_id,
            slug=slug,
            created_at=now,
            expires_at=expires_at,
            revoked_at=None,
        )
        self._by_id[link.id] = link
        return link

    async def get_by_slug(self, slug: str) -> TrackingLink | None:
        for link in self._by_id.values():
            if link.slug == slug:
                return link
        return None

    async def get_by_id_for_owner(
        self, link_id: str, owner_id: str
    ) -> TrackingLink | None:
        link = self._by_id.get(link_id)
        return link if link is not None and link.owner_id == owner_id else None

    async def list_by_resume(
        self, resume_id: str, *, limit: int = 200
    ) -> list[TrackingLink]:
        return [link for link in self._by_id.values() if link.resume_id == resume_id][
            :limit
        ]

    async def list_by_owner(
        self, owner_id: str, *, limit: int = 500
    ) -> list[TrackingLink]:
        return [link for link in self._by_id.values() if link.owner_id == owner_id][
            :limit
        ]

    async def revoke(self, link_id: str, owner_id: str, *, now: datetime) -> None:
        link = await self.get_by_id_for_owner(link_id, owner_id)
        if link is not None:
            self._by_id[link_id] = link.model_copy(update={"revoked_at": now})

    async def update_expiry(
        self, link_id: str, owner_id: str, *, expires_at: datetime | None
    ) -> TrackingLink | None:
        link = await self.get_by_id_for_owner(link_id, owner_id)
        if link is None or link.revoked_at is not None:
            return None

        updated = link.model_copy(update={"expires_at": expires_at})
        self._by_id[link_id] = updated
        return updated


class FakeAnalyticsEventDAO:
    def __init__(self) -> None:
        self._events: list[AnalyticsEvent] = []

    async def create(self, **fields: Any) -> AnalyticsEvent:
        event = AnalyticsEvent(
            id=_new_id(), event_type=EventType(fields.pop("event_type")), **fields
        )
        self._events.append(event)
        return event

    async def list_by_link(
        self, link_id: str, *, limit: int = 500
    ) -> list[AnalyticsEvent]:
        return [event for event in self._events if event.link_id == link_id][:limit]

    async def list_by_links(
        self, link_ids: list[str], *, limit: int = 1_000
    ) -> list[AnalyticsEvent]:
        ids = set(link_ids)
        return [event for event in self._events if event.link_id in ids][:limit]
