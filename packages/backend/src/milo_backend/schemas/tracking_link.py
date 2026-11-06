from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class CreateTrackingLinkRequest(BaseModel):
    expires_in_days: int | None = Field(default=None, ge=1, le=3_650)


class UpdateTrackingLinkRequest(BaseModel):
    """The only editable field on a link. `null` clears the expiry (never expires)."""

    expires_in_days: int | None = Field(ge=1, le=3_650)


class PageDwell(BaseModel):
    page_number: int = Field(ge=1, le=1000)
    dwell_seconds: float = Field(gt=0, le=24 * 60 * 60)


class DwellBeaconRequest(BaseModel):
    """Time on each page of one visit, sent once when the viewer closes the tab. Totals are
    cumulative for the whole visit, so a repeat of the same beacon overwrites rather than adds."""

    visit_id: str = Field(min_length=1, max_length=128)
    pages: list[PageDwell] = Field(min_length=1, max_length=200)


class PageViewRequest(BaseModel):
    visit_id: str = Field(min_length=1, max_length=128)
    page_number: int = Field(ge=2, le=1000)
    session_id: str | None = Field(default=None, max_length=128)
    device_category: str | None = Field(default=None, max_length=32)
    browser: str | None = Field(default=None, max_length=64)
    os: str | None = Field(default=None, max_length=64)


class TrackingLinkResponse(BaseModel):
    id: str
    slug: str
    share_url: str
    resume_id: str
    resume_title: str
    resume_source_url: str
    created_at: datetime
    expires_at: datetime | None
    revoked_at: datetime | None
