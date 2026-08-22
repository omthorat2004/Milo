from __future__ import annotations

from starlette.responses import Response

from milo_backend.core._settings import Settings, get_settings

ACCESS_TOKEN_COOKIE = "milo_access_token"
REFRESH_TOKEN_COOKIE = "milo_refresh_token"


def set_auth_cookies(
    response: Response,
    *,
    access_token: str,
    refresh_token: str,
    settings: Settings | None = None,
    refresh_path: str = "/",
) -> Response:
    config = settings or get_settings()

    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=access_token,
        max_age=int(config.access_token_expiry.total_seconds()),
        path="/",
        domain=config.cookie_domain,
        httponly=config.cookie_httponly,
        secure=bool(config.cookie_secure),
        samesite=config.cookie_samesite,
    )

    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=refresh_token,
        max_age=int(config.refresh_token_expiry.total_seconds()),
        path=refresh_path,
        domain=config.cookie_domain,
        httponly=config.cookie_httponly,
        secure=bool(config.cookie_secure),
        samesite=config.cookie_samesite,
    )

    return response


def clear_auth_cookies(
    response: Response,
    *,
    settings: Settings | None = None,
    refresh_path: str = "/",
) -> Response:
    config = settings or get_settings()

    for key, path in ((ACCESS_TOKEN_COOKIE, "/"), (REFRESH_TOKEN_COOKIE, refresh_path)):
        response.delete_cookie(
            key=key,
            path=path,
            domain=config.cookie_domain,
            httponly=config.cookie_httponly,
            secure=bool(config.cookie_secure),
            samesite=config.cookie_samesite,
        )

    return response
