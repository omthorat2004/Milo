from __future__ import annotations

import secrets
from datetime import timedelta
from enum import StrEnum
from functools import lru_cache
from typing import Annotated, Literal

from pydantic import EmailStr, Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

ENV_FILES = (".env", ".env.development", ".env.local")

MIN_SECRET_LENGTH = 32

LOCAL_SMTP_HOSTS = frozenset({"localhost", "127.0.0.1", "::1", "mailpit", "mailhog"})


class Environment(StrEnum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class EmailDelivery(StrEnum):
    SMTP = "smtp"
    CONSOLE = "console"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILES,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    environment: Environment = Environment.DEVELOPMENT

    mongodb_uri: str = "mongodb://127.0.0.1:27017"
    mongodb_db: str = "milo"
    mongodb_timeout_ms: int = Field(default=10_000, ge=1_000, le=60_000)

    jwt_secret_key: SecretStr | None = None
    jwt_algorithm: Literal["HS256", "HS384", "HS512"] = "HS256"
    jwt_issuer: str = "milo"
    jwt_audience: str = "milo-app"
    access_token_expire_minutes: int = Field(default=15, ge=1, le=1_440)
    refresh_token_expire_days: int = Field(default=30, ge=1, le=365)

    password_min_length: int = Field(default=12, ge=8, le=128)
    password_max_length: int = Field(default=128, ge=64, le=1_024)

    smtp_host: str = "localhost"
    smtp_port: int = Field(default=1025, ge=1, le=65_535)
    smtp_username: str | None = None
    smtp_password: SecretStr | None = None
    smtp_start_tls: bool | None = None
    smtp_use_tls: bool = False
    smtp_timeout_seconds: int = Field(default=10, ge=1, le=120)

    email_delivery: EmailDelivery | None = None
    email_from_address: EmailStr = "no-reply@milo.app"
    email_from_name: str = "Milo"

    otp_length: int = Field(default=6, ge=4, le=10)
    otp_expire_minutes: int = Field(default=10, ge=1, le=60)
    otp_max_attempts: int = Field(default=5, ge=1, le=20)
    otp_resend_cooldown_seconds: int = Field(default=60, ge=0, le=3_600)
    otp_record_grace_seconds: int = Field(default=300, ge=0, le=3_600)
    otp_hash_secret: SecretStr | None = None

    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3001"]
    )
    cors_allow_credentials: bool = True

    cookie_httponly: bool = True
    cookie_samesite: Literal["lax", "strict", "none"] | None = None
    cookie_secure: bool | None = None
    cookie_domain: str | None = None

    rate_limit_enabled: bool = True
    rate_limit_default: str | None = "200/minute"
    rate_limit_register: str = "5/hour"
    rate_limit_login: str = "10/minute"
    rate_limit_verify_otp: str = "10/minute"
    rate_limit_resend_otp: str = "5/hour"
    rate_limit_verification_status: str = "30/minute"
    ip_hash_salt: SecretStr | None = None

    @property
    def is_production(self) -> bool:
        return self.environment is Environment.PRODUCTION

    @property
    def access_token_expiry(self) -> timedelta:
        return timedelta(minutes=self.access_token_expire_minutes)

    @property
    def refresh_token_expiry(self) -> timedelta:
        return timedelta(days=self.refresh_token_expire_days)

    @property
    def otp_expiry(self) -> timedelta:
        return timedelta(minutes=self.otp_expire_minutes)

    @property
    def otp_resend_cooldown(self) -> timedelta:
        return timedelta(seconds=self.otp_resend_cooldown_seconds)

    @property
    def otp_record_ttl_seconds(self) -> int:
        return self.otp_expire_minutes * 60 + self.otp_record_grace_seconds

    @property
    def ip_salt(self) -> str:
        if self.ip_hash_salt is None:
            raise RuntimeError("IP_HASH_SALT is not configured.")
        return self.ip_hash_salt.get_secret_value()

    @property
    def jwt_secret(self) -> str:
        if self.jwt_secret_key is None:
            raise RuntimeError("JWT_SECRET_KEY is not configured.")
        return self.jwt_secret_key.get_secret_value()

    @property
    def otp_secret(self) -> str:
        if self.otp_hash_secret is None:
            raise RuntimeError("OTP_HASH_SECRET is not configured.")
        return self.otp_hash_secret.get_secret_value()

    @property
    def smtp_credentials(self) -> tuple[str, str] | None:
        if self.smtp_username is None or self.smtp_password is None:
            return None
        return self.smtp_username, self.smtp_password.get_secret_value()

    @property
    def email_sender(self) -> str:
        return f"{self.email_from_name} <{self.email_from_address}>"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str) and not value.startswith("["):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @model_validator(mode="after")
    def _apply_environment_defaults(self) -> Settings:
        if self.cookie_secure is None:
            self.cookie_secure = self.is_production

        if self.cookie_samesite is None:
            self.cookie_samesite = "none" if self.is_production else "lax"

        if self.smtp_start_tls is None:
            self.smtp_start_tls = self.is_production

        if self.email_delivery is None:
            self.email_delivery = (
                EmailDelivery.SMTP if self.is_production else EmailDelivery.CONSOLE
            )

        if self.ip_hash_salt is None:
            self.ip_hash_salt = SecretStr(secrets.token_urlsafe(32))

        if self.jwt_secret_key is None:
            if self.is_production:
                raise ValueError(
                    "JWT_SECRET_KEY must be set in production. "
                    "Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(48))'"
                )
            self.jwt_secret_key = SecretStr(secrets.token_urlsafe(48))

        if self.otp_hash_secret is None:
            if self.is_production:
                raise ValueError(
                    "OTP_HASH_SECRET must be set in production. Without it every worker "
                    "hashes codes differently and verification fails at random. "
                    "Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(48))'"
                )
            self.otp_hash_secret = SecretStr(secrets.token_urlsafe(48))

        return self

    @model_validator(mode="after")
    def _reject_unsafe_combinations(self) -> Settings:
        if self.cors_allow_credentials and "*" in self.cors_origins:
            raise ValueError(
                "cors_origins cannot contain '*' while cors_allow_credentials is true. "
                "Browsers reject that combination, so list the origins explicitly."
            )

        if self.cookie_samesite == "none" and not self.cookie_secure:
            raise ValueError("cookie_samesite='none' requires cookie_secure=true.")

        if self.smtp_use_tls and self.smtp_start_tls:
            raise ValueError(
                "smtp_use_tls and smtp_start_tls are mutually exclusive. Implicit TLS "
                "wraps the connection from the first byte, STARTTLS upgrades a plain one."
            )

        if self.password_min_length > self.password_max_length:
            raise ValueError("password_min_length cannot exceed password_max_length.")

        if self.is_production:
            secret = (
                self.jwt_secret_key.get_secret_value() if self.jwt_secret_key else ""
            )
            if len(secret) < MIN_SECRET_LENGTH:
                raise ValueError(
                    f"JWT_SECRET_KEY must be at least {MIN_SECRET_LENGTH} characters in production."
                )

            otp_secret = (
                self.otp_hash_secret.get_secret_value() if self.otp_hash_secret else ""
            )
            if len(otp_secret) < MIN_SECRET_LENGTH:
                raise ValueError(
                    f"OTP_HASH_SECRET must be at least {MIN_SECRET_LENGTH} characters in production."
                )

            if not self.cookie_secure:
                raise ValueError("cookie_secure cannot be disabled in production.")

            insecure = [
                origin for origin in self.cors_origins if origin.startswith("http://")
            ]
            if insecure:
                raise ValueError(
                    f"cors_origins must use https in production: {insecure}"
                )

            if self.email_delivery is not EmailDelivery.SMTP:
                raise ValueError(
                    "EMAIL_DELIVERY must be 'smtp' in production. 'console' only writes "
                    "verification codes to the log, so nobody can finish signing up."
                )

            if self.smtp_host in LOCAL_SMTP_HOSTS:
                raise ValueError(
                    f"smtp_host cannot be a local mail catcher in production: {self.smtp_host}"
                )

            if not (self.smtp_start_tls or self.smtp_use_tls):
                raise ValueError(
                    "SMTP in production requires TLS. Set SMTP_START_TLS=true (port 587) "
                    "or SMTP_USE_TLS=true (port 465)."
                )

            if self.smtp_credentials is None:
                raise ValueError(
                    "SMTP_USERNAME and SMTP_PASSWORD are both required in production."
                )

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
