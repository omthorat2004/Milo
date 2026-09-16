from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Cookie, Request, Response, status

from milo_backend.core import (
    REFRESH_TOKEN_COOKIE,
    clear_auth_cookies,
    get_settings,
    limiter,
    set_auth_cookies,
)
from milo_backend.dependencies import AuthServiceDep, CurrentUser, SettingsDep
from milo_backend.exception.auth import InvalidToken
from milo_backend.model.user import User
from milo_backend.schemas.auth import (
    AuthResponse,
    AuthUser,
    LoginRequest,
    RegisterRequest,
    StartVerificationRequest,
    VerificationPendingResponse,
    VerifyOtpRequest,
)
from milo_backend.service.auth import TokenPair, VerificationChallenge

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=VerificationPendingResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit(lambda: get_settings().rate_limit_register)
async def register(
    request: Request,
    response: Response,
    payload: RegisterRequest,
    service: AuthServiceDep,
) -> VerificationPendingResponse:
    challenge = await service.register(
        name=payload.name,
        email=payload.email,
        password=payload.password,
    )
    return _pending(challenge)


@router.post(
    "/verify-email/start",
    response_model=VerificationPendingResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
@limiter.limit(lambda: get_settings().rate_limit_resend_otp)
async def start_email_verification(
    request: Request,
    response: Response,
    payload: StartVerificationRequest,
    service: AuthServiceDep,
) -> VerificationPendingResponse:
    challenge = await service.start_verification(email=payload.email)
    return _pending(challenge)


@router.post("/verify-otp", response_model=AuthResponse)
@limiter.limit(lambda: get_settings().rate_limit_verify_otp)
async def verify_otp(
    request: Request,
    response: Response,
    payload: VerifyOtpRequest,
    service: AuthServiceDep,
    settings: SettingsDep,
) -> AuthResponse:
    user, tokens = await service.verify_otp(email=payload.email, code=payload.code)
    _authenticate(response, tokens=tokens, settings=settings)
    return AuthResponse(user=_public(user))


@router.post("/login", response_model=AuthResponse)
@limiter.limit(lambda: get_settings().rate_limit_login)
async def login(
    request: Request,
    response: Response,
    payload: LoginRequest,
    service: AuthServiceDep,
    settings: SettingsDep,
) -> AuthResponse:
    user, tokens = await service.login(email=payload.email, password=payload.password)
    _authenticate(response, tokens=tokens, settings=settings)
    return AuthResponse(user=_public(user))


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    response: Response,
    service: AuthServiceDep,
    settings: SettingsDep,
    refresh_token: Annotated[str | None, Cookie(alias=REFRESH_TOKEN_COOKIE)] = None,
) -> AuthResponse:
    if not refresh_token:
        raise InvalidToken()

    user, tokens = await service.refresh(refresh_token=refresh_token)
    _authenticate(response, tokens=tokens, settings=settings)
    return AuthResponse(user=_public(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response, settings: SettingsDep) -> None:
    clear_auth_cookies(response, settings=settings)


@router.get("/me", response_model=AuthResponse)
async def me(user: CurrentUser) -> AuthResponse:
    return AuthResponse(user=_public(user))


def _authenticate(
    response: Response, *, tokens: TokenPair, settings: SettingsDep
) -> None:
    set_auth_cookies(
        response,
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        settings=settings,
    )


def _pending(challenge: VerificationChallenge) -> VerificationPendingResponse:
    now = datetime.now(UTC)
    return VerificationPendingResponse(
        email=challenge.email,
        expires_in_seconds=challenge.expires_in_seconds(now),
        resend_after_seconds=challenge.resend_after_seconds(now),
    )


def _public(user: User) -> AuthUser:
    return AuthUser(
        id=user.id,
        name=user.name,
        email=user.email,
        email_verified=user.email_verified,
    )
