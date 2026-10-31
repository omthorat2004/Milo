from __future__ import annotations

import logging
import re
from datetime import UTC, datetime

import httpx

from milo_backend.core import (
    Settings,
    ensure_is_pdf_document,
    ensure_public_url,
    fetch_document,
)
from milo_backend.dao.resume import ResumeDAO
from milo_backend.exception.resume import InvalidResumeUrl, ResumeNotFound
from milo_backend.model.resume import Resume

logger = logging.getLogger("milo.resume")

# Google Drive's own "Share" button produces a /view URL, a browser preview
# page, not the file. A candidate pasting exactly what Drive gave them
# shouldn't have to go hand-edit it into a direct-download link themselves,
# so known share-link shapes are rewritten to their direct-download
# equivalent before validation ever runs. Scoped to Drive only, the one
# share-link shape this has actually come up for; add another host's
# pattern here if/when that happens too, not speculatively.
_GOOGLE_DRIVE_SHARE_RE = re.compile(r"^https://drive\.google\.com/file/d/([\w-]+)/view")


def _normalize_source_url(source_url: str) -> str:
    match = _GOOGLE_DRIVE_SHARE_RE.match(source_url)
    if match:
        file_id = match.group(1)
        return f"https://drive.google.com/uc?export=download&id={file_id}"
    return source_url


class ResumeService:
    def __init__(self, *, resumes: ResumeDAO, settings: Settings) -> None:
        self.resumes = resumes
        self.settings = settings

    async def create(self, *, owner_id: str, title: str, source_url: str) -> Resume:
        source_url = _normalize_source_url(source_url)
        await self._validate_source_url(source_url)

        now = datetime.now(UTC)
        resume = await self.resumes.create(
            owner_id=owner_id, title=title, source_url=source_url, now=now
        )
        logger.info("Resume %s created for owner %s", resume.id, owner_id)
        return resume

    async def get(self, *, resume_id: str, owner_id: str) -> Resume:
        resume = await self.resumes.get_by_id_for_owner(resume_id, owner_id)
        if resume is None:
            raise ResumeNotFound()
        return resume

    async def list_mine(self, *, owner_id: str) -> list[Resume]:
        return await self.resumes.list_by_owner(owner_id)

    async def update(
        self,
        *,
        resume_id: str,
        owner_id: str,
        title: str | None,
        source_url: str | None,
    ) -> Resume:
        if source_url is not None:
            source_url = _normalize_source_url(source_url)
            await self._validate_source_url(source_url)

        resume = await self.resumes.update(
            resume_id,
            owner_id,
            title=title,
            source_url=source_url,
            now=datetime.now(UTC),
        )
        if resume is None:
            raise ResumeNotFound()

        logger.info("Resume %s updated for owner %s", resume.id, owner_id)
        return resume

    async def _validate_source_url(self, source_url: str) -> None:
        if len(source_url) > self.settings.resume_url_max_length:
            raise InvalidResumeUrl(
                msg=f"Use a URL of at most {self.settings.resume_url_max_length} characters.",
                details={"max_length": self.settings.resume_url_max_length},
            )

        try:
            await ensure_public_url(source_url)
        except ValueError as error:
            raise InvalidResumeUrl(msg=str(error)) from error

        # Confirm the URL actually serves a PDF now, rather than letting a
        # bad link (a Google Drive /view page, a login wall, a 404) through
        # creation only to fail later when someone opens a tracking link.
        # Same fetch primitive and limits resolving a tracking link uses, so
        # creation can't be used to probe a larger/slower payload than
        # viewing can.
        try:
            document = await fetch_document(
                source_url,
                timeout_seconds=self.settings.resume_fetch_timeout_seconds,
                max_bytes=self.settings.resume_fetch_max_bytes,
            )
            ensure_is_pdf_document(document.content_type, document.content)
        except httpx.HTTPStatusError as error:
            raise InvalidResumeUrl(
                msg="Milo couldn't fetch that URL.",
                details={"status_code": error.response.status_code},
            ) from error
        except httpx.TransportError as error:
            raise InvalidResumeUrl(msg="Milo couldn't reach that URL.") from error
        except ValueError as error:
            raise InvalidResumeUrl(msg=str(error)) from error
