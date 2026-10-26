from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel


class EventType(StrEnum):
    VIEW = "view"
    DOWNLOAD = "download"


class AnalyticsEvent(BaseModel):
    """An anonymous, link-scoped signal. No visitor-identity field belongs here.

    Only the allowed-signal list from root CLAUDE.md: timestamp, anonymous
    session id, device category, browser, OS, referrer domain, UTM params,
    page number, dwell time, document opened/downloaded.
    """

    id: str
    link_id: str
    resume_id: str
    event_type: EventType
    occurred_at: datetime
    session_id: str | None = None
    device_category: str | None = None
    browser: str | None = None
    os: str | None = None
    referrer_domain: str | None = None
    utm_source: str | None = None
    utm_medium: str | None = None
    utm_campaign: str | None = None
    page_number: int | None = None
    dwell_time_seconds: float | None = None
