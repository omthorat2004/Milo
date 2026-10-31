from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class PasswordReset(BaseModel):
    id: str
    user_id: str
    code_hash: str
    attempts: int = 0
    created_at: datetime
    last_sent_at: datetime
    used_at: datetime | None = None
