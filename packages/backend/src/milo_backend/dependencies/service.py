from __future__ import annotations

from typing import Annotated

from fastapi import Cookie, Depends

from milo_backend.core import ACCESS_TOKEN_COOKIE, Settings, get_database, get_settings
from milo_backend.dao.auth import EmailVerificationDAO, UserDAO
from milo_backend.exception.auth import InvalidToken
from milo_backend.model.user import User
from milo_backend.service.auth import AuthService

SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_auth_service(settings: SettingsDep) -> AuthService:
    db = get_database()
    return AuthService(
        users=UserDAO(db),
        verifications=EmailVerificationDAO(db),
        settings=settings,
    )


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


async def get_current_user(
    service: AuthServiceDep,
    access_token: Annotated[str | None, Cookie(alias=ACCESS_TOKEN_COOKIE)] = None,
) -> User:
    if not access_token:
        raise InvalidToken()

    return await service.resolve_access_token(access_token=access_token)


CurrentUser = Annotated[User, Depends(get_current_user)]


async def ensure_indexes(*, settings: Settings) -> None:
    db = get_database()
    await UserDAO(db).create_indexes()
    await EmailVerificationDAO(db).create_indexes(
        ttl_seconds=settings.otp_record_ttl_seconds
    )
