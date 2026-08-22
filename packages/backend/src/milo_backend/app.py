from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.middleware import SlowAPIMiddleware

from milo_backend.core import connect, disconnect, get_settings, limiter
from milo_backend.exception.handlers import register_exception_handlers


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None,None]:
    await connect()
    try:
        yield
    finally:
        await disconnect()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Milo API",
        description="Privacy-conscious resume analytics.",
        version="0.1.0",
        lifespan=lifespan,
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
    )

    app.state.limiter = limiter

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["Retry-After", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
    )

    if settings.rate_limit_enabled:
        app.add_middleware(SlowAPIMiddleware)

    register_exception_handlers(app)

    return app


app = create_app()
