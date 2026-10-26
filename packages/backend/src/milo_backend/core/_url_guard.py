from __future__ import annotations

import asyncio
import ipaddress
import socket
from urllib.parse import urlsplit

ALLOWED_SCHEMES = frozenset({"http", "https"})


async def ensure_public_url(url: str) -> None:
    """Raise ValueError if `url` is not a resolvable, public http(s) address.

    Guards against SSRF when fetching a user-supplied resume URL: rejects
    non-http(s) schemes and any host that resolves to a private, loopback,
    link-local, multicast, reserved, or unspecified address.
    """
    parts = urlsplit(url)

    if parts.scheme not in ALLOWED_SCHEMES:
        raise ValueError(f"Unsupported URL scheme: {parts.scheme!r}")

    host = parts.hostname
    if not host:
        raise ValueError("URL has no host.")

    try:
        infos = await asyncio.get_running_loop().getaddrinfo(host, None)
    except socket.gaierror as error:
        raise ValueError(f"Could not resolve host: {host!r}") from error

    if not infos:
        raise ValueError(f"Could not resolve host: {host!r}")

    for info in infos:
        address = str(info[4][0])
        if _is_disallowed_ip(address):
            raise ValueError(f"Host resolves to a non-public address: {host!r}")


def _is_disallowed_ip(address: str) -> bool:
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return True

    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )
