from __future__ import annotations

from http import HTTPStatus

from milo_backend.exception.base import AppException


class TrackingLinkNotFound(AppException):
    status_code = HTTPStatus.NOT_FOUND
    code = "tracking_link_not_found"
    msg = "This link doesn't exist."


class TrackingLinkExpired(AppException):
    status_code = HTTPStatus.GONE
    code = "tracking_link_expired"
    msg = "This link has expired."


class TrackingLinkRevoked(AppException):
    status_code = HTTPStatus.GONE
    code = "tracking_link_revoked"
    msg = "This link was revoked by its owner."
