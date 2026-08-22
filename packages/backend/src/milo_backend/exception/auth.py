from __future__ import annotations

from http import HTTPStatus

from milo_backend.exception.base import AppException


class UserAlreadyExists(AppException):
    status_code = HTTPStatus.CONFLICT
    code = "user_already_exists"
    msg = "An account with that email already exists."


class UserNotFound(AppException):
    status_code = HTTPStatus.NOT_FOUND
    code = "user_not_found"
    msg = "No account matches those details."
