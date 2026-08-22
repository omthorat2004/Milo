from __future__ import annotations

import logging
from http import HTTPStatus
from typing import cast

from fastapi import FastAPI
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ExceptionHandler

from milo_backend.exception.base import AppException

logger = logging.getLogger("milo.exception")

UNHANDLED_PAYLOAD = {"code": "internal_error", "msg": "Something went wrong."}


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    logger.warning(
        "%s %s -> %s %s",
        request.method,
        request.url.path,
        exc.status_code,
        exc.code,
    )
    return JSONResponse(status_code=exc.status_code, content=exc.to_dict())


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(
        "Unhandled %s on %s %s",
        type(exc).__name__,
        request.method,
        request.url.path,
        exc_info=exc,
    )
    return JSONResponse(
        status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
        content=UNHANDLED_PAYLOAD,
    )


async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    logger.warning("%s %s -> 429 rate_limited", request.method, request.url.path)

    response = JSONResponse(
        status_code=HTTPStatus.TOO_MANY_REQUESTS,
        content={
            "code": "rate_limited",
            "msg": "Too many requests. Try again shortly.",
        },
    )
    request.app.state.limiter._inject_headers(response, request.state.view_rate_limit)
    return response


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(
        RateLimitExceeded, cast(ExceptionHandler, rate_limit_handler)
    )
    app.add_exception_handler(
        AppException, cast(ExceptionHandler, app_exception_handler)
    )
    app.add_exception_handler(
        Exception, cast(ExceptionHandler, unhandled_exception_handler)
    )
