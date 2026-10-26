from __future__ import annotations

import pytest

from milo_backend.core import Settings
from milo_backend.exception.resume import InvalidResumeUrl, ResumeNotFound
from milo_backend.service.resume import ResumeService
from tests.fakes import FakeResumeDAO


@pytest.fixture
def settings() -> Settings:
    return Settings(
        _env_file=None,
        jwt_secret_key="x" * 32,
        otp_hash_secret="y" * 32,
        resume_url_max_length=200,
    )


@pytest.fixture
def service(settings: Settings) -> ResumeService:
    return ResumeService(resumes=FakeResumeDAO(), settings=settings)


@pytest.fixture(autouse=True)
def fake_url_guard(monkeypatch: pytest.MonkeyPatch) -> None:
    """Service tests exercise ResumeService's own logic, not the SSRF guard's
    DNS resolution (that's verified separately, see backend-architecture.md's
    `_url_guard.py` entry) — a live DNS lookup in a unit test is slow and
    network-flaky, exactly what docs/testing.md says `service` tests avoid."""

    async def _fake_ensure_public_url(url: str) -> None:
        if "127.0.0.1" in url or "localhost" in url:
            raise ValueError("blocked for test")

    monkeypatch.setattr(
        "milo_backend.service.resume.ensure_public_url", _fake_ensure_public_url
    )


async def test_create_resume_rejects_private_host(service: ResumeService) -> None:
    with pytest.raises(InvalidResumeUrl):
        await service.create(
            owner_id="owner-1",
            title="My resume",
            source_url="http://127.0.0.1/resume.pdf",
        )


async def test_create_resume_rejects_oversized_url(service: ResumeService) -> None:
    long_url = "https://example.com/" + "a" * 500
    with pytest.raises(InvalidResumeUrl):
        await service.create(owner_id="owner-1", title="My resume", source_url=long_url)


async def test_create_and_get_resume(service: ResumeService) -> None:
    resume = await service.create(
        owner_id="owner-1",
        title="My resume",
        source_url="https://example.com/resume.pdf",
    )

    fetched = await service.get(resume_id=resume.id, owner_id="owner-1")

    assert fetched.title == "My resume"
    assert fetched.source_url == "https://example.com/resume.pdf"


async def test_get_resume_not_owned_raises(service: ResumeService) -> None:
    resume = await service.create(
        owner_id="owner-1",
        title="My resume",
        source_url="https://example.com/resume.pdf",
    )

    with pytest.raises(ResumeNotFound):
        await service.get(resume_id=resume.id, owner_id="someone-else")


async def test_list_mine_scopes_to_owner(service: ResumeService) -> None:
    await service.create(
        owner_id="owner-1", title="Mine", source_url="https://example.com/a.pdf"
    )
    await service.create(
        owner_id="owner-2", title="Not mine", source_url="https://example.com/b.pdf"
    )

    mine = await service.list_mine(owner_id="owner-1")

    assert [resume.title for resume in mine] == ["Mine"]


async def test_update_resume_title_only(service: ResumeService) -> None:
    resume = await service.create(
        owner_id="owner-1",
        title="Old title",
        source_url="https://example.com/resume.pdf",
    )

    updated = await service.update(
        resume_id=resume.id, owner_id="owner-1", title="New title", source_url=None
    )

    assert updated.title == "New title"
    assert updated.source_url == "https://example.com/resume.pdf"


async def test_update_resume_rejects_private_url(service: ResumeService) -> None:
    resume = await service.create(
        owner_id="owner-1",
        title="Old title",
        source_url="https://example.com/resume.pdf",
    )

    with pytest.raises(InvalidResumeUrl):
        await service.update(
            resume_id=resume.id,
            owner_id="owner-1",
            title=None,
            source_url="http://localhost/x",
        )


async def test_update_resume_not_owned_raises(service: ResumeService) -> None:
    resume = await service.create(
        owner_id="owner-1",
        title="Old title",
        source_url="https://example.com/resume.pdf",
    )

    with pytest.raises(ResumeNotFound):
        await service.update(
            resume_id=resume.id,
            owner_id="someone-else",
            title="New title",
            source_url=None,
        )
