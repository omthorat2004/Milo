from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def _never_send_real_email(monkeypatch: pytest.MonkeyPatch) -> None:
    """Tests must never send a real email. `AuthService` awaits
    `deliver_email`, which calls the real `send_email` with SMTP config from
    the settings object it is given, so without this every `register` /
    `request_password_reset` call in `test_auth.py` could send a real email
    through whatever SMTP credentials `.env` has configured.

    Patched at `service.auth`'s import of the name (where it is actually
    called from), not `core._email` where it is defined: `from X import Y`
    binds a new reference into the importing module's namespace, so patching
    the origin doesn't reach it.

    A second patch, on the lowest-level network call (`core._email.send_email`),
    is a safety net, not the primary mechanism: if a future call site is added
    somewhere this fixture doesn't cover, the test fails loudly instead of
    silently sending real email. `deliver_email` swallows exceptions, so the
    safety net only trips for code that calls `send_email` directly.
    """

    async def _noop(**_kwargs: object) -> bool:
        return True

    monkeypatch.setattr("milo_backend.service.auth.deliver_email", _noop)

    async def _refuse_to_send(**_kwargs: object) -> None:
        raise RuntimeError(
            "A test tried to send a real email. deliver_email should have been "
            "mocked before this was ever reached, see this fixture's docstring."
        )

    monkeypatch.setattr("milo_backend.core._email.send_email", _refuse_to_send)
