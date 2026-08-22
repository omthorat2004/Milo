from __future__ import annotations

import secrets
from datetime import timedelta
from enum import StrEnum
from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

ENV_FILES = (".env", ".env.development", ".env.local")

MIN_SECRET_LENGTH = 32


class Environment(StrEnum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


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
    access_token_expire_minutes: int = Field(default=15, ge=1, le=1_440)
    refresh_token_expire_days: int = Field(default=30, ge=1, le=365)

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
    def ip_salt(self) -> str:
        if self.ip_hash_salt is None:
            raise RuntimeError("IP_HASH_SALT is not configured.")
        return self.ip_hash_salt.get_secret_value()

    @property
    def jwt_secret(self) -> str:
        if self.jwt_secret_key is None:
            raise RuntimeError("JWT_SECRET_KEY is not configured.")
        return self.jwt_secret_key.get_secret_value()

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

        if self.ip_hash_salt is None:
            self.ip_hash_salt = SecretStr(secrets.token_urlsafe(32))

        if self.jwt_secret_key is None:
            if self.is_production:
                raise ValueError(
                    "JWT_SECRET_KEY must be set in production. "
                    "Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(48))'"
                )
            self.jwt_secret_key = SecretStr(secrets.token_urlsafe(48))

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

        if self.is_production:
            secret = (
                self.jwt_secret_key.get_secret_value() if self.jwt_secret_key else ""
            )
            if len(secret) < MIN_SECRET_LENGTH:
                raise ValueError(
                    f"JWT_SECRET_KEY must be at least {MIN_SECRET_LENGTH} characters in production."
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

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
