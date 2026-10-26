from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class TrackingLink(BaseModel):
    id: str
    resume_id: str
    owner_id: str
    slug: str
    created_at: datetime
    expires_at: datetime | None = None
    revoked_at: datetime | None = None
