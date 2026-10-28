from __future__ import annotations

from dataclasses import dataclass

import httpx

from milo_backend.core._url_guard import ensure_public_url

MAX_REDIRECTS = 3


@dataclass(frozen=True)
class FetchedDocument:
    content: bytes
    content_type: str
    status_code: int


async def fetch_document(
    url: str, *, timeout_seconds: float, max_bytes: int
) -> FetchedDocument:
    """Fetch `url` and buffer its body, capped at `max_bytes`.

    Raises httpx.HTTPStatusError on a terminal 4xx/5xx and ValueError if the
    body exceeds `max_bytes`, a host resolves to a non-public address, or a
    redirect chain runs past MAX_REDIRECTS. Callers decide what's retryable.

    Redirects are followed manually, one hop at a time, re-running
    `ensure_public_url` on every hop rather than handing the chain to httpx's
    own `follow_redirects`. The one-time check at resume submission
    (service/resume.py) only proves the *original* host was public at that
    moment: a redirect target, or the same host resolving somewhere else by
    the time a tracking link is actually opened (DNS rebinding), would
    otherwise reach an internal address this function never re-checked.
    """
    current_url = url
    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
        for hop in range(MAX_REDIRECTS + 1):
            await ensure_public_url(current_url)

            async with client.stream("GET", current_url) as response:
                if response.is_redirect:
                    location = response.headers.get("location")
                    if not location:
                        raise ValueError("Redirect response had no Location header.")
                    if hop == MAX_REDIRECTS:
                        raise ValueError("Too many redirects.")
                    current_url = str(httpx.URL(current_url).join(location))
                    continue

                response.raise_for_status()

                chunks: list[bytes] = []
                size = 0
                async for chunk in response.aiter_bytes():
                    size += len(chunk)
                    if size > max_bytes:
                        raise ValueError("Document exceeds the maximum allowed size.")
                    chunks.append(chunk)

                return FetchedDocument(
                    content=b"".join(chunks),
                    content_type=response.headers.get(
                        "content-type", "application/octet-stream"
                    ),
                    status_code=response.status_code,
                )

        raise ValueError("Too many redirects.")
