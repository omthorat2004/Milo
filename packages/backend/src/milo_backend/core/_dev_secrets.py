from __future__ import annotations

import json
import secrets
from pathlib import Path

CACHE_PATH = Path(__file__).resolve().parents[3] / ".dev-secrets.json"


def get_or_create_dev_secret(name: str, *, length: int = 48) -> str:
    """
    Dev-only convenience: a secret auto-generated with no JWT_SECRET_KEY /
    OTP_HASH_SECRET set in the environment used to be minted fresh on every
    process start (`uvicorn --reload` restarts the whole worker on every file
    save), silently invalidating every cookie issued before that restart —
    both the access and refresh token fail signature verification at once,
    which looks like a random, constant 401 loop rather than a real bug.

    This persists the generated value to a local, gitignored JSON file next
    to the backend package root, so it survives restarts without requiring
    .env to be touched. Never used in production: get_settings()'s validator
    still raises if JWT_SECRET_KEY / OTP_HASH_SECRET are unset there.
    """
    cache: dict[str, str] = {}
    if CACHE_PATH.exists():
        try:
            cache = json.loads(CACHE_PATH.read_text())
        except (json.JSONDecodeError, OSError):
            cache = {}

    existing = cache.get(name)
    if isinstance(existing, str) and existing:
        return existing

    value = secrets.token_urlsafe(length)
    cache[name] = value
    try:
        CACHE_PATH.write_text(json.dumps(cache, indent=2))
    except OSError:
        pass  # Worst case it just regenerates next start, same as before this existed.

    return value
