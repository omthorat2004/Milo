from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from milo_backend.app import create_app
from milo_backend.core import Settings, get_settings
from milo_backend.dependencies.service import get_auth_service
from milo_backend.service.auth import AuthService
from tests.fakes import FakeEmailVerificationDAO, FakePasswordResetDAO, FakeUserDAO

CREDENTIALS = {"email": "ada@example.com", "password": "supersecret"}
EXTENSION = {"X-Milo-Client": "extension"}


@pytest.fixture
def client() -> Iterator[TestClient]:
    settings = Settings(
        _env_file=None,
        jwt_secret_key="x" * 32,
        otp_hash_secret="y" * 32,
        password_min_length=8,
        rate_limit_enabled=False,
    )
    service = AuthService(
        users=FakeUserDAO(),
        verifications=FakeEmailVerificationDAO(),
        password_resets=FakePasswordResetDAO(),
        settings=settings,
    )
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_auth_service] = lambda: service
    # No `with`: skips the lifespan, which would connect to MongoDB.
    test_client = TestClient(app)
    test_client.app_service = service  # type: ignore[attr-defined]
    yield test_client


async def _verified_user(client: TestClient) -> None:
    service: AuthService = client.app_service  # type: ignore[attr-defined]
    await service.register(name="Ada", **CREDENTIALS)
    user = await service.users.get_by_email(CREDENTIALS["email"])
    assert user is not None
    await service.users.mark_email_verified(user.id, now=datetime.now(UTC))


async def test_web_login_keeps_tokens_in_cookies_only(client: TestClient) -> None:
    await _verified_user(client)

    response = client.post("/auth/login", json=CREDENTIALS)

    assert response.status_code == 200
    assert "access_token" not in response.json()
    assert "milo_access_token" in response.cookies


async def test_extension_login_returns_tokens_and_no_cookies(
    client: TestClient,
) -> None:
    await _verified_user(client)

    response = client.post("/auth/login", json=CREDENTIALS, headers=EXTENSION)

    body = response.json()
    assert response.status_code == 200
    assert body["access_token"] and body["refresh_token"]
    assert "milo_access_token" not in response.cookies


async def test_bearer_token_authenticates_and_refresh_rotates(
    client: TestClient,
) -> None:
    await _verified_user(client)
    tokens = client.post("/auth/login", json=CREDENTIALS, headers=EXTENSION).json()

    me = client.get(
        "/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    assert me.status_code == 200
    assert me.json()["user"]["email"] == CREDENTIALS["email"]

    refreshed = client.post(
        "/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
        headers=EXTENSION,
    )
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"]


async def test_extension_refresh_without_body_is_rejected(client: TestClient) -> None:
    response = client.post("/auth/refresh", headers=EXTENSION)

    assert response.status_code == 401


async def test_garbage_bearer_token_is_rejected(client: TestClient) -> None:
    response = client.get("/auth/me", headers={"Authorization": "Bearer nope"})

    assert response.status_code == 401


async def test_forgot_password_response_is_identical_for_known_and_unknown_emails(
    client: TestClient,
) -> None:
    await _verified_user(client)

    known = client.post("/auth/forgot-password", json={"email": CREDENTIALS["email"]})
    # A second request inside the cooldown is silently dropped server-side,
    # and must still look exactly like the first.
    repeated = client.post(
        "/auth/forgot-password", json={"email": CREDENTIALS["email"]}
    )
    unknown = client.post("/auth/forgot-password", json={"email": "nobody@example.com"})

    assert known.status_code == repeated.status_code == unknown.status_code == 200
    assert known.json() == repeated.json() == unknown.json()
    assert known.json()["resend_after_seconds"] == 60
