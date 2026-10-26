from __future__ import annotations

from datetime import UTC, datetime

import pytest

from milo_backend.core import Settings
from milo_backend.exception.auth import (
    EmailNotVerified,
    InvalidCredentials,
    ResendTooSoon,
    TooManyVerificationAttempts,
    UserAlreadyExists,
    VerificationCodeInvalid,
    WeakPassword,
)
from milo_backend.service.auth import AuthService
from tests.fakes import FakeEmailVerificationDAO, FakeUserDAO


@pytest.fixture
def settings() -> Settings:
    return Settings(
        _env_file=None,
        jwt_secret_key="x" * 32,
        otp_hash_secret="y" * 32,
        otp_max_attempts=3,
        otp_resend_cooldown_seconds=60,
        password_min_length=8,
    )


@pytest.fixture
def service(settings: Settings) -> AuthService:
    return AuthService(
        users=FakeUserDAO(), verifications=FakeEmailVerificationDAO(), settings=settings
    )


async def test_register_issues_challenge_and_normalises_email(
    service: AuthService,
) -> None:
    challenge = await service.register(
        name="Ada", email=" ADA@Example.com ", password="supersecret"
    )
    assert challenge.email == "ada@example.com"


async def test_register_rejects_weak_password(service: AuthService) -> None:
    with pytest.raises(WeakPassword):
        await service.register(name="Ada", email="ada@example.com", password="short")


async def test_register_twice_unverified_hits_resend_cooldown_not_conflict(
    service: AuthService,
) -> None:
    """Registering again with a pending-but-unverified email is a resend
    attempt, not `user_already_exists` — see backend-architecture.md."""
    await service.register(name="Ada", email="ada@example.com", password="supersecret")

    with pytest.raises(ResendTooSoon):
        await service.register(
            name="Ada", email="ada@example.com", password="supersecret"
        )


async def test_register_existing_verified_email_conflicts(service: AuthService) -> None:
    await service.register(name="Ada", email="ada@example.com", password="supersecret")
    user = await service.users.get_by_email("ada@example.com")
    assert user is not None
    await service.users.mark_email_verified(user.id, now=datetime.now(UTC))

    with pytest.raises(UserAlreadyExists):
        await service.register(
            name="Ada", email="ada@example.com", password="supersecret"
        )


async def test_login_wrong_password(service: AuthService) -> None:
    await service.register(name="Ada", email="ada@example.com", password="supersecret")
    user = await service.users.get_by_email("ada@example.com")
    assert user is not None
    await service.users.mark_email_verified(user.id, now=datetime.now(UTC))

    with pytest.raises(InvalidCredentials):
        await service.login(email="ada@example.com", password="wrong-password")


async def test_login_unverified_email(service: AuthService) -> None:
    await service.register(name="Ada", email="ada@example.com", password="supersecret")

    with pytest.raises(EmailNotVerified):
        await service.login(email="ada@example.com", password="supersecret")


async def test_login_success_issues_tokens(service: AuthService) -> None:
    await service.register(name="Ada", email="ada@example.com", password="supersecret")
    user = await service.users.get_by_email("ada@example.com")
    assert user is not None
    await service.users.mark_email_verified(user.id, now=datetime.now(UTC))

    logged_in, tokens = await service.login(
        email="ada@example.com", password="supersecret"
    )

    assert logged_in.email == "ada@example.com"
    assert tokens.access_token
    assert tokens.refresh_token


async def test_verify_otp_wrong_code_reports_attempts_remaining(
    service: AuthService,
) -> None:
    await service.register(name="Ada", email="ada@example.com", password="supersecret")

    with pytest.raises(VerificationCodeInvalid) as exc_info:
        await service.verify_otp(email="ada@example.com", code="000000")

    assert exc_info.value.details["attempts_remaining"] == 2


async def test_verify_otp_locks_out_after_max_attempts(service: AuthService) -> None:
    await service.register(name="Ada", email="ada@example.com", password="supersecret")

    with pytest.raises(VerificationCodeInvalid):
        await service.verify_otp(email="ada@example.com", code="000000")
    with pytest.raises(VerificationCodeInvalid):
        await service.verify_otp(email="ada@example.com", code="000000")
    with pytest.raises(TooManyVerificationAttempts):
        await service.verify_otp(email="ada@example.com", code="000000")


async def test_verify_otp_success_marks_verified_and_issues_tokens(
    service: AuthService, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "milo_backend.service.auth.generate_otp", lambda *, settings: "123456"
    )

    await service.register(name="Ada", email="ada@example.com", password="supersecret")
    user, tokens = await service.verify_otp(email="ada@example.com", code="123456")

    assert user.email_verified is True
    assert tokens.access_token
