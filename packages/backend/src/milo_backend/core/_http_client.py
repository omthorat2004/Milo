from __future__ import annotations

from dataclasses import dataclass

import httpx


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
    body exceeds `max_bytes`. Callers decide what's retryable.
    """
    async with (
        httpx.AsyncClient(
            follow_redirects=True, max_redirects=3, timeout=timeout_seconds
        ) as client,
        client.stream("GET", url) as response,
    ):
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
