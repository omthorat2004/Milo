from __future__ import annotations

from http import HTTPStatus

from milo_backend.exception.base import AppException


class ResumeNotFound(AppException):
    status_code = HTTPStatus.NOT_FOUND
    code = "resume_not_found"
    msg = "No resume matches those details."


class InvalidResumeUrl(AppException):
    status_code = HTTPStatus.UNPROCESSABLE_ENTITY
    code = "invalid_resume_url"
    msg = "That resume URL can't be used."


class ResumeFetchFailed(AppException):
    status_code = HTTPStatus.BAD_GATEWAY
    code = "resume_fetch_failed"
    msg = "We couldn't load this resume right now. Try again shortly."
