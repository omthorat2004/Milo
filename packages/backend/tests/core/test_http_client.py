from __future__ import annotations

import httpx
import pytest

from milo_backend.core import _http_client
from milo_backend.core._http_client import fetch_document

URL = "https://files.example.com/resume.pdf"


@pytest.fixture(autouse=True)
def _offline(monkeypatch: pytest.MonkeyPatch) -> None:
    """No DNS lookups: the guard is covered elsewhere, these tests are about size."""

    async def _public(_url: str) -> None:
        return None

    monkeypatch.setattr(_http_client, "ensure_public_url", _public)


def _serve(monkeypatch: pytest.MonkeyPatch, handler: httpx.MockTransport) -> None:
    real = httpx.AsyncClient

    def _client(**kwargs: object) -> httpx.AsyncClient:
        return real(transport=handler, **kwargs)  # type: ignore[arg-type]

    monkeypatch.setattr(_http_client.httpx, "AsyncClient", _client)


class _NeverRead(httpx.AsyncByteStream):
    """A body that fails the test if anything tries to download it."""

    async def __aiter__(self):  # type: ignore[no-untyped-def]
        raise AssertionError(
            "The body was read even though Content-Length was too big."
        )
        yield b""


async def test_oversized_content_length_is_refused_before_reading_the_body(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            headers={"content-length": str(5 * 1_000_000_000)},
            stream=_NeverRead(),
        )

    _serve(monkeypatch, httpx.MockTransport(handler))

    with pytest.raises(ValueError, match="larger than 25 MB"):
        await fetch_document(URL, timeout_seconds=5, max_bytes=25_000_000)


async def test_body_past_the_cap_is_cut_off_without_a_content_length(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def chunks():  # type: ignore[no-untyped-def]
        for _ in range(10):
            yield b"x" * 1_000_000

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=chunks())

    _serve(monkeypatch, httpx.MockTransport(handler))

    with pytest.raises(ValueError, match="larger than 5 MB"):
        await fetch_document(URL, timeout_seconds=5, max_bytes=5_000_000)


async def test_a_normal_pdf_is_returned(monkeypatch: pytest.MonkeyPatch) -> None:
    body = b"%PDF-1.7 small resume"

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, headers={"content-type": "application/pdf"}, content=body
        )

    _serve(monkeypatch, httpx.MockTransport(handler))

    document = await fetch_document(URL, timeout_seconds=5, max_bytes=25_000_000)

    assert document.content == body
