from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from milo_backend.core._settings import Settings

TokenType = Literal["access", "refresh"]

_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def password_needs_rehash(password_hash: str) -> bool:
    try:
        return _hasher.check_needs_rehash(password_hash)
    except InvalidHashError:
        return True


def generate_otp(*, settings: Settings) -> str:
    return str(secrets.randbelow(10**settings.otp_length)).zfill(settings.otp_length)


def hash_otp(code: str, *, settings: Settings) -> str:
    return hmac.new(
        settings.otp_secret.encode(), code.encode(), hashlib.sha256
    ).hexdigest()


def verify_otp(code: str, code_hash: str, *, settings: Settings) -> bool:
    return hmac.compare_digest(hash_otp(code, settings=settings), code_hash)


def create_token(
    *,
    subject: str,
    token_type: TokenType,
    expires_in: timedelta,
    settings: Settings,
) -> str:
    issued_at = datetime.now(UTC)
    payload = {
        "sub": subject,
        "type": token_type,
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": issued_at,
        "exp": issued_at + expires_in,
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(
    token: str, *, expected_type: TokenType, settings: Settings
) -> dict[str, Any]:
    payload: dict[str, Any] = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
        audience=settings.jwt_audience,
        issuer=settings.jwt_issuer,
        options={"require": ["exp", "iat", "sub"]},
    )

    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError(f"Expected a {expected_type} token.")

    return payload
