from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class CreateTrackingLinkRequest(BaseModel):
    expires_in_days: int | None = Field(default=None, ge=1, le=3_650)


class UpdateTrackingLinkRequest(BaseModel):
    """The only editable field on a link. `null` clears the expiry (never expires)."""

    expires_in_days: int | None = Field(ge=1, le=3_650)


class DwellBeaconRequest(BaseModel):
    session_id: str | None = Field(default=None, max_length=128)
    page_number: int | None = Field(default=None, ge=1)
    dwell_seconds: float = Field(gt=0, le=24 * 60 * 60)


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
