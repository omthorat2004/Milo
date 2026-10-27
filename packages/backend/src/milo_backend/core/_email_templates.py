from __future__ import annotations

import html

from milo_backend.core._settings import Settings

# Hex values mirror packages/styles/globals.css's light-mode tokens (ink-950, sand-50/200/500,
# signal-400). Email clients can't read CSS custom properties, so these are pinned copies, not a
# second source of truth to maintain by hand. Keep them in sync if the palette changes.
_INK_950 = "#060807"
_SAND_50 = "#faf4ea"
_SAND_200 = "#ddcbb4"
_SAND_500 = "#9c8a73"
_SIGNAL_400 = "#3fcf8e"

_FONT_STACK = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"
_MONO_STACK = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"


def verification_text(*, name: str, code: str, settings: Settings) -> str:
    minutes = settings.otp_expire_minutes
    return (
        f"Hi {name},\n\n"
        f"Your Milo verification code is {code}.\n"
        f"It expires in {minutes} minutes.\n\n"
        "If you did not create a Milo account, ignore this email.\n"
    )


def verification_html(*, name: str, code: str, settings: Settings) -> str:
    minutes = settings.otp_expire_minutes
    safe_name = html.escape(name)
    spaced_code = " ".join(html.escape(digit) for digit in code)

    return f"""\
<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background-color:{_SAND_50};font-family:{_FONT_STACK};color:{_INK_950};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
      <tr>
        <td style="padding-bottom:28px;">
          <span style="font-size:20px;font-weight:600;letter-spacing:-0.01em;color:{_INK_950};">Milo</span>
        </td>
      </tr>
      <tr>
        <td style="font-size:15px;line-height:1.6;">
          <p style="margin:0 0 8px;">Hi {safe_name},</p>
          <p style="margin:0 0 24px;">Here's your verification code:</p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:24px 0;background-color:#ffffff;border:1px solid {_SAND_200};border-radius:12px;">
          <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:{_SIGNAL_400};font-family:{_MONO_STACK};">{spaced_code}</span>
        </td>
      </tr>
      <tr>
        <td style="padding-top:20px;font-size:13px;color:{_SAND_500};line-height:1.6;">
          <p style="margin:0 0 4px;">This code expires in {minutes} minutes.</p>
          <p style="margin:0;">Didn't request this? You can safely ignore this email. No account was created or changed.</p>
        </td>
      </tr>
    </table>
  </body>
</html>"""
