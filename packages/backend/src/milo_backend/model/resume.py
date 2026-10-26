from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class Resume(BaseModel):
    id: str
    owner_id: str
    title: str
    source_url: str
    created_at: datetime
    updated_at: datetime
