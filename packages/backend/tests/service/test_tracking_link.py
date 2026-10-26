from __future__ import annotations

from datetime import UTC, datetime, timedelta

import httpx
import pytest

from milo_backend.core import FetchedDocument, Settings
from milo_backend.exception.resume import ResumeFetchFailed, ResumeNotFound
from milo_backend.exception.tracking_link import (
    TrackingLinkExpired,
    TrackingLinkNotFound,
    TrackingLinkRevoked,
)
from milo_backend.model.analytics_event import EventType
from milo_backend.service.tracking_link import LinkService
from tests.fakes import FakeAnalyticsEventDAO, FakeResumeDAO, FakeTrackingLinkDAO

OWNER = "owner-1"


@pytest.fixture
def settings() -> Settings:
    return Settings(
        _env_file=None,
        jwt_secret_key="x" * 32,
        otp_hash_secret="y" * 32,
        resume_fetch_max_retries=2,
        resume_fetch_retry_backoff_seconds=0,
        tracking_link_slug_length=8,
    )


@pytest.fixture
def resumes() -> FakeResumeDAO:
    return FakeResumeDAO()


@pytest.fixture
def links() -> FakeTrackingLinkDAO:
    return FakeTrackingLinkDAO()


@pytest.fixture
def events() -> FakeAnalyticsEventDAO:
    return FakeAnalyticsEventDAO()


@pytest.fixture
def service(
    links: FakeTrackingLinkDAO,
    resumes: FakeResumeDAO,
    events: FakeAnalyticsEventDAO,
    settings: Settings,
) -> LinkService:
    return LinkService(links=links, resumes=resumes, events=events, settings=settings)


async def _resume(resumes: FakeResumeDAO, *, owner_id: str = OWNER):
    return await resumes.create(
        owner_id=owner_id,
        title="My resume",
        source_url="https://example.com/resume.pdf",
        now=datetime.now(UTC),
    )


def _resolve_kwargs(slug: str, **overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "slug": slug,
        "event_type": EventType.VIEW,
        "session_id": None,
        "device_category": None,
        "browser": None,
        "os": None,
        "referrer_domain": None,
        "utm_source": None,
        "utm_medium": None,
        "utm_campaign": None,
        "page_number": None,
    }
    base.update(overrides)
    return base


async def test_create_link_for_owned_resume(
    service: LinkService, resumes: FakeResumeDAO
) -> None:
    resume = await _resume(resumes)

    overview = await service.create_link(
        resume_id=resume.id, owner_id=OWNER, expires_in_days=None
    )

    assert overview.resume_title == "My resume"
    assert overview.link.expires_at is None


async def test_create_link_for_unowned_resume_raises(
    service: LinkService, resumes: FakeResumeDAO
) -> None:
    resume = await _resume(resumes, owner_id=OWNER)

    with pytest.raises(ResumeNotFound):
        await service.create_link(
            resume_id=resume.id, owner_id="someone-else", expires_in_days=None
        )


async def test_create_link_sets_expiry_from_days(
    service: LinkService, resumes: FakeResumeDAO
) -> None:
    resume = await _resume(resumes)

    overview = await service.create_link(
        resume_id=resume.id, owner_id=OWNER, expires_in_days=7
    )

    assert overview.link.expires_at is not None


async def test_resolve_unknown_slug_raises_not_found(service: LinkService) -> None:
    with pytest.raises(TrackingLinkNotFound):
        await service.resolve(**_resolve_kwargs("missing"))


async def test_resolve_expired_link_raises_before_any_fetch(
    service: LinkService,
    resumes: FakeResumeDAO,
    links: FakeTrackingLinkDAO,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    resume = await _resume(resumes)
    now = datetime.now(UTC)
    await links.create(
        resume_id=resume.id,
        owner_id=OWNER,
        slug="expired1",
        now=now,
        expires_at=now - timedelta(hours=1),
    )

    async def _fail_if_called(*args: object, **kwargs: object) -> FetchedDocument:
        raise AssertionError("an expired link must never trigger a fetch")

    monkeypatch.setattr(
        "milo_backend.service.tracking_link.fetch_document", _fail_if_called
    )

    with pytest.raises(TrackingLinkExpired):
        await service.resolve(**_resolve_kwargs("expired1"))


async def test_resolve_revoked_link_raises(
    service: LinkService, resumes: FakeResumeDAO, links: FakeTrackingLinkDAO
) -> None:
    resume = await _resume(resumes)
    now = datetime.now(UTC)
    link = await links.create(
        resume_id=resume.id, owner_id=OWNER, slug="revoked1", now=now, expires_at=None
    )
    assert link is not None
    await links.revoke(link.id, OWNER, now=now)

    with pytest.raises(TrackingLinkRevoked):
        await service.resolve(**_resolve_kwargs("revoked1"))


async def test_resolve_retries_transient_failure_then_succeeds(
    service: LinkService,
    resumes: FakeResumeDAO,
    links: FakeTrackingLinkDAO,
    events: FakeAnalyticsEventDAO,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    resume = await _resume(resumes)
    link = await links.create(
        resume_id=resume.id,
        owner_id=OWNER,
        slug="ok1",
        now=datetime.now(UTC),
        expires_at=None,
    )
    assert link is not None

    attempts = {"n": 0}

    async def _flaky_fetch(
        url: str, *, timeout_seconds: float, max_bytes: int
    ) -> FetchedDocument:
        attempts["n"] += 1
        if attempts["n"] < 2:
            request = httpx.Request("GET", url)
            response = httpx.Response(503, request=request)
            raise httpx.HTTPStatusError("boom", request=request, response=response)
        return FetchedDocument(
            content=b"%PDF-1.4", content_type="application/pdf", status_code=200
        )

    monkeypatch.setattr(
        "milo_backend.service.tracking_link.fetch_document", _flaky_fetch
    )

    result = await service.resolve(
        **_resolve_kwargs("ok1", session_id="sess-1", page_number=1)
    )

    assert result.content == b"%PDF-1.4"
    assert attempts["n"] == 2

    recorded = await events.list_by_link(link.id)
    assert len(recorded) == 1
    assert recorded[0].event_type is EventType.VIEW


async def test_resolve_non_retryable_status_fails_immediately(
    service: LinkService,
    resumes: FakeResumeDAO,
    links: FakeTrackingLinkDAO,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    resume = await _resume(resumes)
    await links.create(
        resume_id=resume.id,
        owner_id=OWNER,
        slug="notfound1",
        now=datetime.now(UTC),
        expires_at=None,
    )

    attempts = {"n": 0}

    async def _always_404(
        url: str, *, timeout_seconds: float, max_bytes: int
    ) -> FetchedDocument:
        attempts["n"] += 1
        request = httpx.Request("GET", url)
        response = httpx.Response(404, request=request)
        raise httpx.HTTPStatusError("not found", request=request, response=response)

    monkeypatch.setattr(
        "milo_backend.service.tracking_link.fetch_document", _always_404
    )

    with pytest.raises(ResumeFetchFailed):
        await service.resolve(**_resolve_kwargs("notfound1"))

    assert attempts["n"] == 1


async def test_update_expiry_on_revoked_link_raises_not_found(
    service: LinkService, resumes: FakeResumeDAO, links: FakeTrackingLinkDAO
) -> None:
    resume = await _resume(resumes)
    now = datetime.now(UTC)
    link = await links.create(
        resume_id=resume.id, owner_id=OWNER, slug="revoked2", now=now, expires_at=None
    )
    assert link is not None
    await links.revoke(link.id, OWNER, now=now)

    with pytest.raises(TrackingLinkNotFound):
        await service.update_expiry(link_id=link.id, owner_id=OWNER, expires_in_days=30)


async def test_update_expiry_sets_new_expiry(
    service: LinkService, resumes: FakeResumeDAO, links: FakeTrackingLinkDAO
) -> None:
    resume = await _resume(resumes)
    link = await links.create(
        resume_id=resume.id,
        owner_id=OWNER,
        slug="setexp1",
        now=datetime.now(UTC),
        expires_at=None,
    )
    assert link is not None

    overview = await service.update_expiry(
        link_id=link.id, owner_id=OWNER, expires_in_days=7
    )

    assert overview.link.expires_at is not None


async def test_update_expiry_clears_expiry(
    service: LinkService, resumes: FakeResumeDAO, links: FakeTrackingLinkDAO
) -> None:
    resume = await _resume(resumes)
    now = datetime.now(UTC)
    link = await links.create(
        resume_id=resume.id,
        owner_id=OWNER,
        slug="clearexp1",
        now=now,
        expires_at=now + timedelta(days=1),
    )
    assert link is not None

    overview = await service.update_expiry(
        link_id=link.id, owner_id=OWNER, expires_in_days=None
    )

    assert overview.link.expires_at is None


async def test_record_dwell_unknown_slug_noops(
    service: LinkService, events: FakeAnalyticsEventDAO
) -> None:
    await service.record_dwell(
        slug="missing", session_id=None, page_number=1, dwell_seconds=12.0
    )

    assert await events.list_by_links(["anything"]) == []


async def test_record_dwell_records_event(
    service: LinkService,
    resumes: FakeResumeDAO,
    links: FakeTrackingLinkDAO,
    events: FakeAnalyticsEventDAO,
) -> None:
    resume = await _resume(resumes)
    link = await links.create(
        resume_id=resume.id,
        owner_id=OWNER,
        slug="dwell1",
        now=datetime.now(UTC),
        expires_at=None,
    )
    assert link is not None

    await service.record_dwell(
        slug="dwell1", session_id="s1", page_number=2, dwell_seconds=45.0
    )

    recorded = await events.list_by_link(link.id)
    assert len(recorded) == 1
    assert recorded[0].page_number == 2
    assert recorded[0].dwell_time_seconds == 45.0
