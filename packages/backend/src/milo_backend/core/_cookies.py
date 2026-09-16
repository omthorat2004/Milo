from __future__ import annotations

from starlette.responses import Response

from milo_backend.core._settings import Settings

ACCESS_TOKEN_COOKIE = "milo_access_token"
REFRESH_TOKEN_COOKIE = "milo_refresh_token"


def set_auth_cookies(
    response: Response,
    *,
    access_token: str,
    refresh_token: str,
    settings: Settings,
    refresh_path: str = "/",
) -> Response:
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=access_token,
        max_age=int(settings.access_token_expiry.total_seconds()),
        path="/",
        domain=settings.cookie_domain,
        httponly=settings.cookie_httponly,
        secure=bool(settings.cookie_secure),
        samesite=settings.cookie_samesite,
    )

    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=refresh_token,
        max_age=int(settings.refresh_token_expiry.total_seconds()),
        path=refresh_path,
        domain=settings.cookie_domain,
        httponly=settings.cookie_httponly,
        secure=bool(settings.cookie_secure),
        samesite=settings.cookie_samesite,
    )

    return response


def clear_auth_cookies(
    response: Response,
    *,
    settings: Settings,
    refresh_path: str = "/",
) -> Response:
    for key, path in ((ACCESS_TOKEN_COOKIE, "/"), (REFRESH_TOKEN_COOKIE, refresh_path)):
        response.delete_cookie(
            key=key,
            path=path,
            domain=settings.cookie_domain,
            httponly=settings.cookie_httponly,
            secure=bool(settings.cookie_secure),
            samesite=settings.cookie_samesite,
        )

    return response
