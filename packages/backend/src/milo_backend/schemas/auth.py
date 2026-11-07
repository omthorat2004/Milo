from __future__ import annotations

import re
from enum import StrEnum
from typing import Annotated

from pydantic import (
    AfterValidator,
    BaseModel,
    BeforeValidator,
    EmailStr,
    Field,
    StringConstraints,
)

CONTROL_CHARACTERS = re.compile(r"[\x00-\x1f\x7f]")

CODE_SEPARATORS = re.compile(r"[\s\-]")


def _clean_text(value: object) -> object:
    if not isinstance(value, str):
        return value
    return " ".join(CONTROL_CHARACTERS.sub("", value).split())


def _clean_code(value: object) -> object:
    if not isinstance(value, str):
        return value
    return CODE_SEPARATORS.sub("", value)


def _normalise_email(value: str) -> str:
    return value.strip().lower()


Name = Annotated[
    str,
    BeforeValidator(_clean_text),
    StringConstraints(min_length=1, max_length=80),
]

NormalisedEmail = Annotated[EmailStr, AfterValidator(_normalise_email)]

OtpCode = Annotated[
    str,
    BeforeValidator(_clean_code),
    StringConstraints(pattern=r"^\d{4,10}$"),
]

Password = Annotated[str, Field(min_length=1, max_length=1_024)]


class VerificationState(StrEnum):
    NONE = "none"
    PENDING = "pending"
    VERIFIED = "verified"


class RegisterRequest(BaseModel):
    name: Name
    email: NormalisedEmail
    password: Password


class LoginRequest(BaseModel):
    email: NormalisedEmail
    password: Password


class StartVerificationRequest(BaseModel):
    email: NormalisedEmail


class VerifyOtpRequest(BaseModel):
    email: NormalisedEmail
    code: OtpCode


class VerificationStatusRequest(BaseModel):
    email: NormalisedEmail


class ForgotPasswordRequest(BaseModel):
    email: NormalisedEmail


class ResetPasswordRequest(BaseModel):
    email: NormalisedEmail
    code: OtpCode
    new_password: Password


class AuthUser(BaseModel):
    id: str
    name: str
    email: EmailStr
    email_verified: bool


class AuthResponse(BaseModel):
    user: AuthUser


class ExtensionAuthResponse(AuthResponse):
    """Login/refresh body for the browser extension only (X-Milo-Client: extension).

    The web app never sees these: its tokens stay in HttpOnly cookies. The extension has no
    cookie jar tied to the API origin, so it keeps the pair in chrome.storage.local instead
    and sends the access token as a Bearer header.
    """

    access_token: str
    refresh_token: str


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1, max_length=4_096)


class VerificationStatusResponse(BaseModel):
    email: EmailStr
    status: VerificationState
    expires_in_seconds: int
    resend_after_seconds: int
    attempts_remaining: int


class VerificationPendingResponse(BaseModel):
    email: EmailStr
    expires_in_seconds: int
    resend_after_seconds: int
    msg: str = "We sent you a verification code."


class ForgotPasswordResponse(BaseModel):
    """Deliberately constant, no email echo, no timers: anything that varied
    by outcome would tell a caller whether that address has an account."""

    msg: str = "If an account exists for that email, we sent a password reset code."
