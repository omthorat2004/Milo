from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, StringConstraints, model_validator

from milo_backend.schemas.auth import Name


def _strip(value: object) -> object:
    return value.strip() if isinstance(value, str) else value


ResumeUrl = Annotated[
    str,
    BeforeValidator(_strip),
    StringConstraints(min_length=1, max_length=4_096),
]


class CreateResumeRequest(BaseModel):
    title: Name
    source_url: ResumeUrl


class UpdateResumeRequest(BaseModel):
    title: Name | None = None
    source_url: ResumeUrl | None = None

    @model_validator(mode="after")
    def _require_a_field(self) -> UpdateResumeRequest:
        if self.title is None and self.source_url is None:
            raise ValueError("Provide at least one of title or source_url.")
        return self


class ResumeResponse(BaseModel):
    id: str
    title: str
    source_url: str
    created_at: datetime
    updated_at: datetime
