from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from milo_backend.model.analytics_event import EventType


class AnalyticsEventResponse(BaseModel):
    id: str
    link_id: str
    event_type: EventType
    occurred_at: datetime
    session_id: str | None
    device_category: str | None
    browser: str | None
    os: str | None
    referrer_domain: str | None
    utm_source: str | None
    utm_medium: str | None
    utm_campaign: str | None
    page_number: int | None
    dwell_time_seconds: float | None
