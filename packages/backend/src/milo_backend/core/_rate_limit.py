from __future__ import annotations

import hashlib
from datetime import UTC, datetime

from slowapi import Limiter
from starlette.requests import Request

from milo_backend.core._settings import get_settings

ANONYMOUS_KEY = "anonymous"


def client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        address = forwarded.split(",")[0].strip()
    elif request.client is not None:
        address = request.client.host
    else:
        address = ANONYMOUS_KEY

    settings = get_settings()
    day = datetime.now(UTC).date().isoformat()
    digest = hashlib.sha256(f"{settings.ip_salt}:{day}:{address}".encode()).hexdigest()
    return digest[:24]


def build_limiter() -> Limiter:
    settings = get_settings()
    defaults = [settings.rate_limit_default] if settings.rate_limit_default else []

    return Limiter(
        key_func=client_key,
        default_limits=defaults,
        enabled=settings.rate_limit_enabled,
        headers_enabled=True,
    )


limiter = build_limiter()
