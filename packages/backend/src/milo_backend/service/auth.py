from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime

import jwt

from milo_backend.core import (
    Settings,
    create_token,
    decode_token,
    generate_otp,
    hash_otp,
    hash_password,
    send_email,
    verify_otp,
    verify_password,
)
from milo_backend.dao.auth import EmailVerificationDAO, UserDAO
from milo_backend.exception.auth import (
    EmailAlreadyVerified,
    EmailNotVerified,
    InvalidCredentials,
    InvalidToken,
    ResendTooSoon,
    TooManyVerificationAttempts,
    UserAlreadyExists,
    UserNotFound,
    VerificationCodeExpired,
    VerificationCodeInvalid,
    VerificationNotFound,
    WeakPassword,
)
from milo_backend.model.email_verification import EmailVerification, VerificationStatus
from milo_backend.model.user import User

logger = logging.getLogger("milo.auth")


@dataclass(frozen=True)
class TokenPair:
    access_token: str
    refresh_token: str


@dataclass(frozen=True)
class VerificationChallenge:
    email: str
    expires_at: datetime
    resend_after: datetime

    def expires_in_seconds(self, now: datetime) -> int:
        return max(0, int((self.expires_at - now).total_seconds()))

    def resend_after_seconds(self, now: datetime) -> int:
        return max(0, int((self.resend_after - now).total_seconds()))


class AuthService:
    def __init__(
        self,
        *,
        users: UserDAO,
        verifications: EmailVerificationDAO,
        settings: Settings,
    ) -> None:
        self.users = users
        self.verifications = verifications
        self.settings = settings

    async def register(
        self, *, name: str, email: str, password: str
    ) -> VerificationChallenge:
        address = _normalise(email)
        self._check_password(password)

        existing = await self.users.get_by_email(address)
        if existing is not None and existing.email_verified:
            raise UserAlreadyExists()

        now = datetime.now(UTC)

        if existing is not None:
            user = existing
        else:
            created = await self.users.create(
                name=name.strip(),
                email=address,
                password_hash=hash_password(password),
                now=now,
            )
            if created is None:
                raise UserAlreadyExists()
            user = created

        return await self._issue_challenge(user, now=now)

    async def start_verification(self, *, email: str) -> VerificationChallenge:
        address = _normalise(email)

        user = await self.users.get_by_email(address)
        if user is None:
            raise UserNotFound()
        if user.email_verified:
            raise EmailAlreadyVerified()

        return await self._issue_challenge(user, now=datetime.now(UTC))

    async def verify_otp(self, *, email: str, code: str) -> tuple[User, TokenPair]:
        address = _normalise(email)
        now = datetime.now(UTC)

        user = await self.users.get_by_email(address)
        if user is None:
            raise VerificationNotFound()
        if user.email_verified:
            raise EmailAlreadyVerified()

        record = await self.verifications.get_by_user_id(user.id)
        if record is None:
            raise VerificationNotFound()
        if record.status is VerificationStatus.VERIFIED:
            raise EmailAlreadyVerified()
        if _expires_at(record, settings=self.settings) <= now:
            raise VerificationCodeExpired()
        if record.attempts >= self.settings.otp_max_attempts:
            raise TooManyVerificationAttempts()

        if not verify_otp(code, record.code_hash, settings=self.settings):
            attempts = await self.verifications.increment_attempts(user.id)
            remaining = max(0, self.settings.otp_max_attempts - attempts)
            if remaining == 0:
                raise TooManyVerificationAttempts()
            raise VerificationCodeInvalid(details={"attempts_remaining": remaining})

        await self.users.mark_email_verified(user.id, now=now)
        await self.verifications.mark_verified(user.id, now=now)
        await self.users.record_login(user.id, now=now)

        verified = user.model_copy(
            update={"email_verified": True, "last_login_at": now}
        )
        logger.info("Email verified for user %s", user.id)

        return verified, self._issue_tokens(verified)

    async def login(self, *, email: str, password: str) -> tuple[User, TokenPair]:
        address = _normalise(email)

        user = await self.users.get_by_email(address)
        if user is None:
            raise InvalidCredentials()
        if not verify_password(password, user.password_hash):
            raise InvalidCredentials()
        if not user.email_verified:
            raise EmailNotVerified(details={"email": user.email})

        now = datetime.now(UTC)
        await self.users.record_login(user.id, now=now)

        return user, self._issue_tokens(user)

    async def refresh(self, *, refresh_token: str) -> tuple[User, TokenPair]:
        payload = self._decode(refresh_token, expected_type="refresh")

        user = await self.users.get_by_id(str(payload.get("sub", "")))
        if user is None:
            raise InvalidToken()
        if not user.email_verified:
            raise EmailNotVerified(details={"email": user.email})

        return user, self._issue_tokens(user)

    async def resolve_access_token(self, *, access_token: str) -> User:
        payload = self._decode(access_token, expected_type="access")

        user = await self.users.get_by_id(str(payload.get("sub", "")))
        if user is None:
            raise InvalidToken()

        return user

    async def _issue_challenge(
        self, user: User, *, now: datetime
    ) -> VerificationChallenge:
        existing = await self.verifications.get_by_user_id(user.id)
        if existing is not None:
            ready_at = _last_sent_at(existing) + self.settings.otp_resend_cooldown
            if now < ready_at:
                raise ResendTooSoon(
                    details={
                        "retry_after_seconds": int((ready_at - now).total_seconds())
                    }
                )

        code = generate_otp(settings=self.settings)
        expires_at = now + self.settings.otp_expiry

        await self.verifications.upsert_pending(
            user_id=user.id,
            code_hash=hash_otp(code, settings=self.settings),
            now=now,
        )

        await send_email(
            to=user.email,
            subject=f"{code} is your Milo verification code",
            text_body=_verification_text(
                name=user.name, code=code, settings=self.settings
            ),
            html_body=_verification_html(
                name=user.name, code=code, settings=self.settings
            ),
            settings=self.settings,
        )

        logger.info("Verification code issued for user %s", user.id)

        return VerificationChallenge(
            email=user.email,
            expires_at=expires_at,
            resend_after=now + self.settings.otp_resend_cooldown,
        )

    def _issue_tokens(self, user: User) -> TokenPair:
        return TokenPair(
            access_token=create_token(
                subject=user.id,
                token_type="access",
                expires_in=self.settings.access_token_expiry,
                settings=self.settings,
            ),
            refresh_token=create_token(
                subject=user.id,
                token_type="refresh",
                expires_in=self.settings.refresh_token_expiry,
                settings=self.settings,
            ),
        )

    def _decode(self, token: str, *, expected_type: str) -> dict[str, object]:
        try:
            return decode_token(
                token,
                expected_type="refresh" if expected_type == "refresh" else "access",
                settings=self.settings,
            )
        except jwt.PyJWTError as error:
            raise InvalidToken() from error

    def _check_password(self, password: str) -> None:
        if len(password) < self.settings.password_min_length:
            raise WeakPassword(
                msg=f"Use at least {self.settings.password_min_length} characters.",
                details={"min_length": self.settings.password_min_length},
            )
        if len(password) > self.settings.password_max_length:
            raise WeakPassword(
                msg=f"Use at most {self.settings.password_max_length} characters.",
                details={"max_length": self.settings.password_max_length},
            )


def _normalise(email: str) -> str:
    return email.strip().lower()


def _expires_at(record: EmailVerification, *, settings: Settings) -> datetime:
    return _last_sent_at(record) + settings.otp_expiry


def _last_sent_at(record: EmailVerification) -> datetime:
    return _as_utc(record.last_sent_at)


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def _verification_text(*, name: str, code: str, settings: Settings) -> str:
    minutes = settings.otp_expire_minutes
    return (
        f"Hi {name},\n\n"
        f"Your Milo verification code is {code}.\n"
        f"It expires in {minutes} minutes.\n\n"
        "If you did not create a Milo account, ignore this email.\n"
    )


def _verification_html(*, name: str, code: str, settings: Settings) -> str:
    minutes = settings.otp_expire_minutes
    return (
        '<html><body style="font-family:system-ui,sans-serif;color:#1c1917">'
        f"<p>Hi {name},</p>"
        "<p>Your Milo verification code is</p>"
        f'<p style="font-size:28px;letter-spacing:6px;font-weight:600">{code}</p>'
        f"<p>It expires in {minutes} minutes.</p>"
        '<p style="color:#78716c;font-size:13px">If you did not create a Milo account, '
        "ignore this email.</p>"
        "</body></html>"
    )
