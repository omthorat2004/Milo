from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def _never_send_real_email(monkeypatch: pytest.MonkeyPatch) -> None:
    """Tests must never send a real email. `AuthService` calls
    `queue_email`, which enqueues a Celery task that, in eager mode (the
    dev/test default, `celery_task_always_eager`), runs inline on the same
    call stack and calls the real `send_email` using `get_settings()`'s
    actual SMTP config, a test's own `Settings(...)` object passed to
    `AuthService` has no effect on it, since `_send_email_task` reads the
    global settings singleton, not whatever a test constructed.

    This was unmocked before writing this fixture, so every `register`/
    `request_password_reset` call in `test_auth.py` was silently sending a
    real email through whatever SMTP credentials `.env` actually has
    configured. Patched at `service.auth`'s import of the name (where it's
    actually called from), not `core._celery` where it's defined, `from X
    import Y` binds a new reference into the importing module's namespace,
    patching the origin doesn't reach it.

    A second patch, on the lowest-level network call (`core._email.send_email`),
    is a safety net, not the primary mechanism: if a future second call site
    for `queue_email` is added somewhere this fixture doesn't cover, this
    makes that test fail loudly instead of silently sending real email again.
    """
    monkeypatch.setattr("milo_backend.service.auth.queue_email", lambda **_kwargs: None)

    async def _refuse_to_send(**_kwargs: object) -> None:
        raise RuntimeError(
            "A test tried to send a real email. queue_email should have been "
            "mocked before this was ever reached, see this fixture's docstring."
        )

    monkeypatch.setattr("milo_backend.core._celery.send_email", _refuse_to_send)
