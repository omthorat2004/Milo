from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=1, max_length=1_024)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=1_024)


class StartVerificationRequest(BaseModel):
    email: EmailStr


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=10, pattern=r"^\d+$")


class AuthUser(BaseModel):
    id: str
    name: str
    email: EmailStr
    email_verified: bool


class AuthResponse(BaseModel):
    user: AuthUser


class VerificationPendingResponse(BaseModel):
    email: EmailStr
    expires_in_seconds: int
    resend_after_seconds: int
    msg: str = "We sent you a verification code."
