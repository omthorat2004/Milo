from __future__ import annotations

from typing import Annotated
from urllib.parse import urlsplit

from fastapi import APIRouter, Query, Request, Response, status

from milo_backend.core import Settings, get_settings, limiter
from milo_backend.dependencies import CurrentUser, LinkServiceDep
from milo_backend.model.analytics_event import AnalyticsEvent, EventType
from milo_backend.schemas.analytics_event import AnalyticsEventResponse
from milo_backend.schemas.tracking_link import (
    CreateTrackingLinkRequest,
    DwellBeaconRequest,
    TrackingLinkResponse,
    UpdateTrackingLinkRequest,
)
from milo_backend.service.tracking_link import LinkOverview

router = APIRouter(tags=["tracking-links"])


@router.post(
    "/resumes/{resume_id}/links",
    response_model=TrackingLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit(lambda: get_settings().rate_limit_create_link)
async def create_tracking_link(
    request: Request,
    response: Response,
    resume_id: str,
    payload: CreateTrackingLinkRequest,
    user: CurrentUser,
    service: LinkServiceDep,
) -> TrackingLinkResponse:
    overview = await service.create_link(
        resume_id=resume_id,
        owner_id=user.id,
        expires_in_days=payload.expires_in_days,
    )
    return _public(overview, settings=get_settings())


@router.get("/resumes/{resume_id}/links", response_model=list[TrackingLinkResponse])
async def list_tracking_links(
    resume_id: str, user: CurrentUser, service: LinkServiceDep
) -> list[TrackingLinkResponse]:
    overviews = await service.list_links(resume_id=resume_id, owner_id=user.id)
    settings = get_settings()
    return [_public(overview, settings=settings) for overview in overviews]


@router.get("/links", response_model=list[TrackingLinkResponse])
async def list_my_tracking_links(
    user: CurrentUser, service: LinkServiceDep
) -> list[TrackingLinkResponse]:
    overviews = await service.list_my_links(owner_id=user.id)
    settings = get_settings()
    return [_public(overview, settings=settings) for overview in overviews]


@router.get("/links/{link_id}", response_model=TrackingLinkResponse)
async def get_tracking_link(
    link_id: str, user: CurrentUser, service: LinkServiceDep
) -> TrackingLinkResponse:
    overview = await service.get_link(link_id=link_id, owner_id=user.id)
    return _public(overview, settings=get_settings())


@router.get("/links/{link_id}/events", response_model=list[AnalyticsEventResponse])
async def list_tracking_link_events(
    link_id: str, user: CurrentUser, service: LinkServiceDep
) -> list[AnalyticsEventResponse]:
    events = await service.list_events_for_link(link_id=link_id, owner_id=user.id)
    return [_public_event(event) for event in events]


@router.patch("/links/{link_id}", response_model=TrackingLinkResponse)
@limiter.limit(lambda: get_settings().rate_limit_update_link)
async def update_tracking_link(
    request: Request,
    response: Response,
    link_id: str,
    payload: UpdateTrackingLinkRequest,
    user: CurrentUser,
    service: LinkServiceDep,
) -> TrackingLinkResponse:
    overview = await service.update_expiry(
        link_id=link_id, owner_id=user.id, expires_in_days=payload.expires_in_days
    )
    return _public(overview, settings=get_settings())


@router.delete("/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_tracking_link(
    link_id: str, user: CurrentUser, service: LinkServiceDep
) -> None:
    await service.revoke_link(link_id=link_id, owner_id=user.id)


@router.get("/events", response_model=list[AnalyticsEventResponse])
async def list_my_events(
    user: CurrentUser, service: LinkServiceDep
) -> list[AnalyticsEventResponse]:
    events = await service.list_events_for_owner(owner_id=user.id)
    return [_public_event(event) for event in events]


@router.get("/l/{slug}")
@limiter.limit(lambda: get_settings().rate_limit_resolve_link)
async def resolve_tracking_link(
    request: Request,
    response: Response,
    slug: str,
    service: LinkServiceDep,
    session_id: Annotated[str | None, Query(alias="sid")] = None,
    device_category: str | None = None,
    browser: str | None = None,
    os_name: Annotated[str | None, Query(alias="os")] = None,
    utm_source: str | None = None,
    utm_medium: str | None = None,
    utm_campaign: str | None = None,
    page_number: Annotated[int | None, Query(ge=1)] = None,
    download: bool = False,
) -> Response:
    document = await service.resolve(
        slug=slug,
        event_type=EventType.DOWNLOAD if download else EventType.VIEW,
        session_id=session_id,
        device_category=device_category,
        browser=browser,
        os=os_name,
        referrer_domain=_referrer_domain(request.headers.get("referer")),
        utm_source=utm_source,
        utm_medium=utm_medium,
        utm_campaign=utm_campaign,
        page_number=page_number,
    )

    disposition = "attachment" if download else "inline"
    return Response(
        content=document.content,
        media_type=document.content_type,
        headers={"Content-Disposition": disposition},
    )


@router.post("/l/{slug}/dwell", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(lambda: get_settings().rate_limit_dwell_beacon)
async def record_dwell_beacon(
    request: Request,
    response: Response,
    slug: str,
    payload: DwellBeaconRequest,
    service: LinkServiceDep,
) -> None:
    """Fed by `navigator.sendBeacon` as a viewer leaves the resume page, so the
    client never reads this response: best-effort, always 204."""
    await service.record_dwell(
        slug=slug,
        session_id=payload.session_id,
        page_number=payload.page_number,
        dwell_seconds=payload.dwell_seconds,
    )


def _public(overview: LinkOverview, *, settings: Settings) -> TrackingLinkResponse:
    link = overview.link
    return TrackingLinkResponse(
        id=link.id,
        slug=link.slug,
        share_url=f"{settings.public_base_url}/l/{link.slug}",
        resume_id=link.resume_id,
        resume_title=overview.resume_title,
        resume_source_url=overview.resume_source_url,
        created_at=link.created_at,
        expires_at=link.expires_at,
        revoked_at=link.revoked_at,
    )


def _public_event(event: AnalyticsEvent) -> AnalyticsEventResponse:
    return AnalyticsEventResponse(
        id=event.id,
        link_id=event.link_id,
        event_type=event.event_type,
        occurred_at=event.occurred_at,
        session_id=event.session_id,
        device_category=event.device_category,
        browser=event.browser,
        os=event.os,
        referrer_domain=event.referrer_domain,
        utm_source=event.utm_source,
        utm_medium=event.utm_medium,
        utm_campaign=event.utm_campaign,
        page_number=event.page_number,
        dwell_time_seconds=event.dwell_time_seconds,
    )


def _referrer_domain(referer: str | None) -> str | None:
    if not referer:
        return None
    return urlsplit(referer).hostname
