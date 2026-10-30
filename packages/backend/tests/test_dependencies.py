"""Guards security fixes in the backend's dependency set.

CVE-2026-114605 / GHSA-45c3-73f7-pv4m (dnspython < 2.9.0): a maliciously
crafted DNS wire-format message can cause ``dns.name.from_wire_parser()`` to
consume excessive CPU (denial of service). The backend pulls dnspython in
transitively (via email-validator and pymongo), so this test pins the installed
version to the fixed release to stop the vulnerability from silently returning.
"""

from importlib.metadata import PackageNotFoundError, version


def _as_tuple(version_str):
    return tuple(int(part) for part in version_str.split("."))


def test_dnspython_is_fixed_version():
    try:
        installed = version("dnspython")
    except PackageNotFoundError:
        raise AssertionError(
            "dnspython is not installed; cannot verify the CVE fix"
        )

    assert _as_tuple(installed) >= _as_tuple("2.9.0"), (
        f"dnspython {installed} is vulnerable to GHSA-45c3-73f7-pv4m; "
        "upgrade to >=2.9.0"
    )
