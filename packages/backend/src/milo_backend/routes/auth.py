from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Cookie, Header, Request, Response, status

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
    ExtensionAuthResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    StartVerificationRequest,
    VerificationPendingResponse,
    VerificationState,
    VerificationStatusRequest,
    VerificationStatusResponse,
    VerifyOtpRequest,
)
from milo_backend.service.auth import TokenPair, VerificationChallenge

router = APIRouter(prefix="/auth", tags=["auth"])

CLIENT_HEADER = "X-Milo-Client"
EXTENSION_CLIENT = "extension"


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


@router.post("/verify-email/status", response_model=VerificationStatusResponse)
@limiter.limit(lambda: get_settings().rate_limit_verification_status)
async def verification_status(
    request: Request,
    response: Response,
    payload: VerificationStatusRequest,
    service: AuthServiceDep,
) -> VerificationStatusResponse:
    snapshot = await service.verification_status(email=payload.email)
    return VerificationStatusResponse(
        email=snapshot.email,
        status=VerificationState(snapshot.state.value),
        expires_in_seconds=snapshot.expires_in_seconds,
        resend_after_seconds=snapshot.resend_after_seconds,
        attempts_remaining=snapshot.attempts_remaining,
    )


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


@router.post("/login", response_model=AuthResponse | ExtensionAuthResponse)
@limiter.limit(lambda: get_settings().rate_limit_login)
async def login(
    request: Request,
    response: Response,
    payload: LoginRequest,
    service: AuthServiceDep,
    settings: SettingsDep,
    client: Annotated[str | None, Header(alias=CLIENT_HEADER)] = None,
) -> AuthResponse | ExtensionAuthResponse:
    user, tokens = await service.login(email=payload.email, password=payload.password)
    if _is_extension(client):
        return _extension_body(user, tokens)
    _authenticate(response, tokens=tokens, settings=settings)
    return AuthResponse(user=_public(user))


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
@limiter.limit(lambda: get_settings().rate_limit_forgot_password)
async def forgot_password(
    request: Request,
    response: Response,
    payload: ForgotPasswordRequest,
    service: AuthServiceDep,
) -> ForgotPasswordResponse:
    """Always 200 with the same body, whether or not that email has an
    account, see AuthService.request_password_reset and
    ForgotPasswordResponse for why."""
    await service.request_password_reset(email=payload.email)
    return ForgotPasswordResponse()


@router.post("/reset-password", response_model=AuthResponse)
@limiter.limit(lambda: get_settings().rate_limit_reset_password)
async def reset_password(
    request: Request,
    response: Response,
    payload: ResetPasswordRequest,
    service: AuthServiceDep,
    settings: SettingsDep,
) -> AuthResponse:
    user, tokens = await service.confirm_password_reset(
        email=payload.email, code=payload.code, new_password=payload.new_password
    )
    _authenticate(response, tokens=tokens, settings=settings)
    return AuthResponse(user=_public(user))


@router.post("/refresh", response_model=AuthResponse | ExtensionAuthResponse)
@limiter.limit(lambda: get_settings().rate_limit_refresh)
async def refresh(
    request: Request,
    response: Response,
    service: AuthServiceDep,
    settings: SettingsDep,
    payload: RefreshRequest | None = None,
    refresh_token: Annotated[str | None, Cookie(alias=REFRESH_TOKEN_COOKIE)] = None,
    client: Annotated[str | None, Header(alias=CLIENT_HEADER)] = None,
) -> AuthResponse | ExtensionAuthResponse:
    if _is_extension(client):
        # The extension sends its stored refresh token in the body, never via cookie.
        if payload is None:
            raise InvalidToken()
        user, tokens = await service.refresh(refresh_token=payload.refresh_token)
        return _extension_body(user, tokens)

    if not refresh_token:
        raise InvalidToken()

    user, tokens = await service.refresh(refresh_token=refresh_token)
    _authenticate(response, tokens=tokens, settings=settings)
    return AuthResponse(user=_public(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(lambda: get_settings().rate_limit_logout)
async def logout(request: Request, response: Response, settings: SettingsDep) -> None:
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


def _is_extension(client: str | None) -> bool:
    return client == EXTENSION_CLIENT


def _extension_body(user: User, tokens: TokenPair) -> ExtensionAuthResponse:
    return ExtensionAuthResponse(
        user=_public(user),
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
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
