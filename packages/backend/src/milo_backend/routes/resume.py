from __future__ import annotations

from fastapi import APIRouter, Request, Response, status

from milo_backend.core import get_settings, limiter
from milo_backend.dependencies import CurrentUser, ResumeServiceDep
from milo_backend.model.resume import Resume
from milo_backend.schemas.resume import (
    CreateResumeRequest,
    ResumeResponse,
    UpdateResumeRequest,
)

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.post("", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(lambda: get_settings().rate_limit_create_resume)
async def create_resume(
    request: Request,
    response: Response,
    payload: CreateResumeRequest,
    user: CurrentUser,
    service: ResumeServiceDep,
) -> ResumeResponse:
    resume = await service.create(
        owner_id=user.id, title=payload.title, source_url=payload.source_url
    )
    return _public(resume)


@router.get("", response_model=list[ResumeResponse])
async def list_resumes(
    user: CurrentUser, service: ResumeServiceDep
) -> list[ResumeResponse]:
    resumes = await service.list_mine(owner_id=user.id)
    return [_public(resume) for resume in resumes]


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: str, user: CurrentUser, service: ResumeServiceDep
) -> ResumeResponse:
    resume = await service.get(resume_id=resume_id, owner_id=user.id)
    return _public(resume)


@router.patch("/{resume_id}", response_model=ResumeResponse)
@limiter.limit(lambda: get_settings().rate_limit_update_resume)
async def update_resume(
    request: Request,
    response: Response,
    resume_id: str,
    payload: UpdateResumeRequest,
    user: CurrentUser,
    service: ResumeServiceDep,
) -> ResumeResponse:
    resume = await service.update(
        resume_id=resume_id,
        owner_id=user.id,
        title=payload.title,
        source_url=payload.source_url,
    )
    return _public(resume)


def _public(resume: Resume) -> ResumeResponse:
    return ResumeResponse(
        id=resume.id,
        title=resume.title,
        source_url=resume.source_url,
        created_at=resume.created_at,
        updated_at=resume.updated_at,
    )
