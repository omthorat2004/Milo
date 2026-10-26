from __future__ import annotations

import asyncio
import logging
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import httpx

from milo_backend.core import FetchedDocument, Settings, fetch_document
from milo_backend.dao.analytics_event import AnalyticsEventDAO
from milo_backend.dao.resume import ResumeDAO
from milo_backend.dao.tracking_link import TrackingLinkDAO
from milo_backend.exception.resume import ResumeFetchFailed, ResumeNotFound
from milo_backend.exception.tracking_link import (
    TrackingLinkExpired,
    TrackingLinkNotFound,
    TrackingLinkRevoked,
)
from milo_backend.model.analytics_event import AnalyticsEvent, EventType
from milo_backend.model.resume import Resume
from milo_backend.model.tracking_link import TrackingLink

logger = logging.getLogger("milo.tracking_link")

MAX_SLUG_ATTEMPTS = 5

RETRYABLE_STATUS_CODES = frozenset({500, 502, 503, 504})


@dataclass(frozen=True)
class ResolvedDocument:
    content: bytes
    content_type: str


@dataclass(frozen=True)
class LinkOverview:
    """A tracking link plus the resume fields a listing UI needs, without a
    second round-trip per row."""

    link: TrackingLink
    resume_title: str
    resume_source_url: str


def _overview(link: TrackingLink, resume: Resume) -> LinkOverview:
    return LinkOverview(
        link=link, resume_title=resume.title, resume_source_url=resume.source_url
    )


class LinkService:
    def __init__(
        self,
        *,
        links: TrackingLinkDAO,
        resumes: ResumeDAO,
        events: AnalyticsEventDAO,
        settings: Settings,
    ) -> None:
        self.links = links
        self.resumes = resumes
        self.events = events
        self.settings = settings

    async def create_link(
        self, *, resume_id: str, owner_id: str, expires_in_days: int | None
    ) -> LinkOverview:
        resume = await self.resumes.get_by_id_for_owner(resume_id, owner_id)
        if resume is None:
            raise ResumeNotFound()

        now = datetime.now(UTC)
        ttl_days = expires_in_days or self.settings.tracking_link_default_ttl_days
        expires_at = now + timedelta(days=ttl_days) if ttl_days else None

        for _ in range(MAX_SLUG_ATTEMPTS):
            slug = _generate_slug(self.settings.tracking_link_slug_length)
            link = await self.links.create(
                resume_id=resume.id,
                owner_id=owner_id,
                slug=slug,
                now=now,
                expires_at=expires_at,
            )
            if link is not None:
                logger.info(
                    "Tracking link %s created for resume %s", link.id, resume.id
                )
                return _overview(link, resume)

        raise RuntimeError("Could not allocate a unique tracking link slug.")

    async def list_links(self, *, resume_id: str, owner_id: str) -> list[LinkOverview]:
        resume = await self.resumes.get_by_id_for_owner(resume_id, owner_id)
        if resume is None:
            raise ResumeNotFound()
        links = await self.links.list_by_resume(resume.id)
        return [_overview(link, resume) for link in links]

    async def list_my_links(self, *, owner_id: str) -> list[LinkOverview]:
        links = await self.links.list_by_owner(owner_id)
        if not links:
            return []

        resumes = await self.resumes.list_by_ids([link.resume_id for link in links])
        resume_by_id = {resume.id: resume for resume in resumes}

        overviews: list[LinkOverview] = []
        for link in links:
            resume = resume_by_id.get(link.resume_id)
            if resume is None:
                continue
            overviews.append(_overview(link, resume))
        return overviews

    async def get_link(self, *, link_id: str, owner_id: str) -> LinkOverview:
        link = await self.links.get_by_id_for_owner(link_id, owner_id)
        if link is None:
            raise TrackingLinkNotFound()

        resume = await self.resumes.get_by_id(link.resume_id)
        if resume is None:
            raise ResumeNotFound()

        return _overview(link, resume)

    async def revoke_link(self, *, link_id: str, owner_id: str) -> None:
        link = await self.links.get_by_id_for_owner(link_id, owner_id)
        if link is None:
            raise TrackingLinkNotFound()
        await self.links.revoke(link_id, owner_id, now=datetime.now(UTC))

    async def update_expiry(
        self, *, link_id: str, owner_id: str, expires_in_days: int | None
    ) -> LinkOverview:
        """Raises TrackingLinkNotFound both when the link doesn't exist and when
        it's already revoked — revoking is permanent, so there is nothing left
        to edit, and that's indistinguishable from "not yours" to the caller."""
        expires_at = (
            datetime.now(UTC) + timedelta(days=expires_in_days)
            if expires_in_days
            else None
        )
        link = await self.links.update_expiry(link_id, owner_id, expires_at=expires_at)
        if link is None:
            raise TrackingLinkNotFound()

        resume = await self.resumes.get_by_id(link.resume_id)
        if resume is None:
            raise ResumeNotFound()

        return _overview(link, resume)

    async def record_dwell(
        self,
        *,
        slug: str,
        session_id: str | None,
        page_number: int | None,
        dwell_seconds: float,
    ) -> None:
        """Best-effort: sent via `navigator.sendBeacon`, so there is no response
        the caller can act on. A link that's gone, expired, or revoked by the
        time the beacon arrives is a benign race (the viewer was already
        reading it) — this silently no-ops rather than raising."""
        link = await self.links.get_by_slug(slug)
        if link is None:
            return

        try:
            await self.events.create(
                link_id=link.id,
                resume_id=link.resume_id,
                event_type=EventType.VIEW,
                occurred_at=datetime.now(UTC),
                session_id=session_id,
                device_category=None,
                browser=None,
                os=None,
                referrer_domain=None,
                utm_source=None,
                utm_medium=None,
                utm_campaign=None,
                page_number=page_number,
                dwell_time_seconds=dwell_seconds,
            )
        except Exception:
            logger.warning(
                "Failed to record dwell beacon for link %s", link.id, exc_info=True
            )

    async def list_events_for_link(
        self, *, link_id: str, owner_id: str
    ) -> list[AnalyticsEvent]:
        link = await self.links.get_by_id_for_owner(link_id, owner_id)
        if link is None:
            raise TrackingLinkNotFound()
        return await self.events.list_by_link(link.id)

    async def list_events_for_owner(self, *, owner_id: str) -> list[AnalyticsEvent]:
        links = await self.links.list_by_owner(owner_id)
        if not links:
            return []
        return await self.events.list_by_links([link.id for link in links])

    async def resolve(
        self,
        *,
        slug: str,
        event_type: EventType,
        session_id: str | None,
        device_category: str | None,
        browser: str | None,
        os: str | None,
        referrer_domain: str | None,
        utm_source: str | None,
        utm_medium: str | None,
        utm_campaign: str | None,
        page_number: int | None,
    ) -> ResolvedDocument:
        link = await self.links.get_by_slug(slug)
        if link is None:
            raise TrackingLinkNotFound()

        # Expiry/revocation are checked before any network fetch, so an
        # expired or revoked link fails fast with no wasted retries.
        now = datetime.now(UTC)
        if link.revoked_at is not None:
            raise TrackingLinkRevoked()
        if link.expires_at is not None and _as_utc(link.expires_at) <= now:
            raise TrackingLinkExpired()

        resume = await self.resumes.get_by_id(link.resume_id)
        if resume is None:
            raise ResumeNotFound()

        document = await self._fetch_with_retry(resume.source_url)

        try:
            await self.events.create(
                link_id=link.id,
                resume_id=resume.id,
                event_type=event_type,
                occurred_at=now,
                session_id=session_id,
                device_category=device_category,
                browser=browser,
                os=os,
                referrer_domain=referrer_domain,
                utm_source=utm_source,
                utm_medium=utm_medium,
                utm_campaign=utm_campaign,
                page_number=page_number,
                dwell_time_seconds=None,
            )
        except Exception:
            logger.warning(
                "Failed to record analytics event for link %s", link.id, exc_info=True
            )

        return ResolvedDocument(
            content=document.content, content_type=document.content_type
        )

    async def _fetch_with_retry(self, url: str) -> FetchedDocument:
        attempts = self.settings.resume_fetch_max_retries + 1
        last_error: Exception | None = None

        for attempt in range(attempts):
            try:
                return await fetch_document(
                    url,
                    timeout_seconds=self.settings.resume_fetch_timeout_seconds,
                    max_bytes=self.settings.resume_fetch_max_bytes,
                )
            except httpx.HTTPStatusError as error:
                if error.response.status_code not in RETRYABLE_STATUS_CODES:
                    raise ResumeFetchFailed(
                        details={"status_code": error.response.status_code}
                    ) from error
                last_error = error
            except httpx.TransportError as error:
                last_error = error
            except ValueError as error:
                raise ResumeFetchFailed(msg=str(error)) from error

            if attempt < attempts - 1:
                backoff = self.settings.resume_fetch_retry_backoff_seconds * (
                    attempt + 1
                )
                logger.info(
                    "Resume fetch attempt %d/%d failed, retrying in %.1fs",
                    attempt + 1,
                    attempts,
                    backoff,
                )
                await asyncio.sleep(backoff)

        logger.warning(
            "Resume fetch failed after %d attempts: %s", attempts, last_error
        )
        raise ResumeFetchFailed() from last_error


def _generate_slug(length: int) -> str:
    return secrets.token_urlsafe(length)[:length]


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)
