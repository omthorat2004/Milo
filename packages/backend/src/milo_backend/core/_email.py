from __future__ import annotations

import logging
from email.message import EmailMessage

import aiosmtplib

from milo_backend.core._settings import EmailDelivery, Settings

logger = logging.getLogger("milo.email")


def build_message(
    *,
    to: str,
    subject: str,
    text_body: str,
    html_body: str | None,
    settings: Settings,
) -> EmailMessage:
    message = EmailMessage()
    message["From"] = settings.email_sender
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text_body)

    if html_body is not None:
        message.add_alternative(html_body, subtype="html")

    return message


async def send_email(
    *,
    to: str,
    subject: str,
    text_body: str,
    html_body: str | None = None,
    settings: Settings,
) -> None:
    message = build_message(
        to=to,
        subject=subject,
        text_body=text_body,
        html_body=html_body,
        settings=settings,
    )

    if settings.email_delivery is EmailDelivery.CONSOLE:
        logger.info("Email not sent, delivery is console.\n%s", message.as_string())
        return

    credentials = settings.smtp_credentials

    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=credentials[0] if credentials else None,
        password=credentials[1] if credentials else None,
        start_tls=bool(settings.smtp_start_tls),
        use_tls=settings.smtp_use_tls,
        timeout=settings.smtp_timeout_seconds,
    )

    logger.info("Delivered %r via %s", subject, settings.smtp_host)
