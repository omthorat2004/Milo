from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel


class VerificationStatus(StrEnum):
    PENDING = "pending"
    VERIFIED = "verified"


class EmailVerification(BaseModel):
    id: str
    user_id: str
    code_hash: str
    status: VerificationStatus = VerificationStatus.PENDING
    attempts: int = 0
    created_at: datetime
    last_sent_at: datetime
    verified_at: datetime | None = None
