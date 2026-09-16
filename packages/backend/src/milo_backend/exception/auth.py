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


class InvalidCredentials(AppException):
    status_code = HTTPStatus.UNAUTHORIZED
    code = "invalid_credentials"
    msg = "That email and password do not match."


class WeakPassword(AppException):
    status_code = HTTPStatus.UNPROCESSABLE_ENTITY
    code = "weak_password"
    msg = "That password is too short."


class EmailNotVerified(AppException):
    status_code = HTTPStatus.FORBIDDEN
    code = "email_not_verified"
    msg = "Verify your email address before logging in."


class EmailAlreadyVerified(AppException):
    status_code = HTTPStatus.CONFLICT
    code = "email_already_verified"
    msg = "That email address is already verified."


class VerificationNotFound(AppException):
    status_code = HTTPStatus.NOT_FOUND
    code = "verification_not_found"
    msg = "Request a new verification code."


class VerificationCodeInvalid(AppException):
    status_code = HTTPStatus.BAD_REQUEST
    code = "verification_code_invalid"
    msg = "That code is not correct."


class VerificationCodeExpired(AppException):
    status_code = HTTPStatus.BAD_REQUEST
    code = "verification_code_expired"
    msg = "That code has expired. Request a new one."


class TooManyVerificationAttempts(AppException):
    status_code = HTTPStatus.TOO_MANY_REQUESTS
    code = "too_many_verification_attempts"
    msg = "Too many incorrect codes. Request a new one."


class ResendTooSoon(AppException):
    status_code = HTTPStatus.TOO_MANY_REQUESTS
    code = "resend_too_soon"
    msg = "A code was just sent. Wait a moment before asking for another."


class InvalidToken(AppException):
    status_code = HTTPStatus.UNAUTHORIZED
    code = "invalid_token"
    msg = "Your session has expired. Log in again."
