from __future__ import annotations

import asyncio
import logging
from collections.abc import Coroutine
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from celery import Celery

from milo_backend.core._email import send_email
from milo_backend.core._settings import get_settings

logger = logging.getLogger("milo.celery")


def _run_async[T](coro: Coroutine[Any, Any, T]) -> T:
    """Run `coro` to completion, whether or not we're already inside a
    running event loop.

    In production the Celery worker is a separate process with no event loop,
    so the plain `asyncio.run` path is all that's ever exercised. But
    `celery_task_always_eager` defaults to true outside production (see
    Settings), which runs this task inline on the caller's call stack, and
    the caller is always an async FastAPI route handler, already inside
    a running event loop. `asyncio.run` refuses to nest, so that path needs
    its own loop on a separate thread instead.
    """
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)

    with ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(asyncio.run, coro).result()


def _build_celery() -> Celery:
    settings = get_settings()
    app = Celery(
        "milo_backend",
        broker=settings.celery_broker_url,
        backend=settings.celery_result_backend,
    )
    app.conf.task_default_queue = "milo"
    app.conf.task_always_eager = settings.celery_task_always_eager
    # Eager mode is dev-only (see Settings.celery_task_always_eager); surface the
    # real exception there instead of swallowing it into a stored task result.
    app.conf.task_eager_propagates = True
    return app


celery_app = _build_celery()


@celery_app.task(
    name="milo.send_email", bind=True, max_retries=3, default_retry_delay=5
)
def _send_email_task(
    self, *, to: str, subject: str, text_body: str, html_body: str
) -> None:
    settings = get_settings()
    try:
        _run_async(
            send_email(
                to=to,
                subject=subject,
                text_body=text_body,
                html_body=html_body,
                settings=settings,
            )
        )
    except Exception as error:
        logger.warning("Email delivery to %s failed, retrying: %s", to, error)
        raise self.retry(exc=error) from error


def queue_email(*, to: str, subject: str, text_body: str, html_body: str) -> None:
    """Enqueue an email for delivery via Celery rather than blocking the request on SMTP."""
    _send_email_task.delay(
        to=to, subject=subject, text_body=text_body, html_body=html_body
    )
