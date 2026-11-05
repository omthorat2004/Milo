"""Email everyone on the waitlist (packages/landing's MongoDB `waitlist`
collection, the same cluster/database this backend already uses).

Dry-run by default: prints who would receive the email and does not touch
SMTP. Pass --send to actually send. A second collection,
`waitlist_email_log`, records which address already got which subject, so
re-running the same command after a crash or interruption skips anyone
already sent instead of emailing them twice, an email can't be unsent.

Delivery goes through `deliver_email`, the same inline path registration/reset
emails use, one recipient at a time. An address is only written to the log if
delivery succeeded, so re-running the command retries the failures.

Usage:
    poetry run python scripts/email_waitlist.py \\
        --subject "Milo is opening up" \\
        --text-body-file announcement.txt \\
        --html-body-file announcement.html
                                            # dry run: prints recipients only

    poetry run python scripts/email_waitlist.py --subject "..." \\
        --text-body-file announcement.txt --send
                                            # asks for confirmation, then queues

    poetry run python scripts/email_waitlist.py --subject "..." \\
        --text-body-file announcement.txt --send --limit 3
                                            # queue only the first 3, for a test send

    poetry run python scripts/email_waitlist.py --subject "..." \\
        --text-body-file announcement.txt --send --yes
                                            # skips the confirmation prompt
"""

from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

from milo_backend.core import (
    connect,
    deliver_email,
    disconnect,
    get_database,
    get_settings,
)

WAITLIST_COLLECTION = "waitlist"
LOG_COLLECTION = "waitlist_email_log"


async def main() -> None:
    args = _parse_args()
    settings = get_settings()

    text_body = Path(args.text_body_file).read_text()
    html_body = Path(args.html_body_file).read_text() if args.html_body_file else None

    await connect(settings)
    try:
        database = get_database()
        waitlist = database[WAITLIST_COLLECTION]
        log = database[LOG_COLLECTION]

        if args.to:
            # Test-send path: targets this one address regardless of whether it's
            # actually on the waitlist, so a template can be previewed before a
            # real send.
            emails = [args.to]
        else:
            emails = sorted(
                {doc["email"] async for doc in waitlist.find({}, {"email": 1})}
            )
        already_sent = {
            doc["email"]
            async for doc in log.find(
                {"subject": args.subject, "email": {"$in": emails}}, {"email": 1}
            )
        }
        pending = [email for email in emails if email not in already_sent]
        if args.limit is not None:
            pending = pending[: args.limit]

        print(
            f"Waitlist: {len(emails)} address(es), {len(already_sent)} already sent this subject."
        )
        print(f"Subject: {args.subject!r}")
        print(
            f"{len(pending)} recipient(s) {'would be' if not args.send else 'will be'} queued:"
        )
        for email in pending:
            print(f"  {email}")

        if not pending:
            print("Nothing to send.")
            return

        if not args.send:
            print(
                "\nDry run only, nothing was sent. Pass --send to actually queue delivery."
            )
            return

        if not args.yes:
            answer = input(
                f"\nThis queues a real email to {len(pending)} address(es) via "
                f"{settings.email_delivery.value} delivery. Type 'yes' to continue: "
            )
            if answer.strip().lower() != "yes":
                print("Aborted.")
                return

        sent = 0
        for email in pending:
            delivered = await deliver_email(
                to=email,
                subject=args.subject,
                text_body=text_body,
                html_body=html_body or text_body,
                settings=settings,
            )
            if not delivered:
                print(f"  FAILED: {email}")
                continue
            sent += 1
            await log.update_one(
                {"email": email, "subject": args.subject},
                {"$setOnInsert": {"email": email, "subject": args.subject}},
                upsert=True,
            )

        print(f"Sent {sent} of {len(pending)} email(s).")
    finally:
        await disconnect()


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--subject", required=True, help="Email subject line.")
    parser.add_argument(
        "--text-body-file", required=True, help="Path to a plain-text email body."
    )
    parser.add_argument(
        "--html-body-file",
        default=None,
        help="Optional path to an HTML email body. Falls back to the text body if omitted.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Only queue the first N pending recipients.",
    )
    parser.add_argument(
        "--to",
        default=None,
        help="Send only to this address, ignoring the waitlist collection. For "
        "previewing a template before a real send.",
    )
    parser.add_argument(
        "--send",
        action="store_true",
        help="Actually queue delivery. Without this, the script only prints who would receive it.",
    )
    parser.add_argument(
        "--yes", action="store_true", help="Skip the confirmation prompt."
    )
    return parser.parse_args()


if __name__ == "__main__":
    asyncio.run(main())
