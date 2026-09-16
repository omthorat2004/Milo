from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr


class User(BaseModel):
    id: str
    name: str
    email: EmailStr
    password_hash: str
    email_verified: bool = False
    created_at: datetime
    updated_at: datetime
    last_login_at: datetime | None = None
