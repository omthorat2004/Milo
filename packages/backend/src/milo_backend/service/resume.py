from __future__ import annotations

import logging
from datetime import UTC, datetime

from milo_backend.core import Settings, ensure_public_url
from milo_backend.dao.resume import ResumeDAO
from milo_backend.exception.resume import InvalidResumeUrl, ResumeNotFound
from milo_backend.model.resume import Resume

logger = logging.getLogger("milo.resume")


class ResumeService:
    def __init__(self, *, resumes: ResumeDAO, settings: Settings) -> None:
        self.resumes = resumes
        self.settings = settings

    async def create(self, *, owner_id: str, title: str, source_url: str) -> Resume:
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
