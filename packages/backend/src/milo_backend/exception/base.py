from __future__ import annotations

from http import HTTPStatus
from typing import Any


class AppException(Exception):
    status_code: int = HTTPStatus.INTERNAL_SERVER_ERROR
    code: str = "internal_error"
    msg: str = "Something went wrong."

    def __init__(
        self,
        msg: str | None = None,
        *,
        code: str | None = None,
        status_code: int | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.msg = msg or type(self).msg
        self.code = code or type(self).code
        self.status_code = status_code or type(self).status_code
        self.details = details or {}
        super().__init__(self.msg)

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {"code": self.code, "msg": self.msg}
        if self.details:
            payload["details"] = self.details
        return payload

    def __repr__(self) -> str:
        return (
            f"{type(self).__name__}(status_code={self.status_code}, code={self.code!r})"
        )
