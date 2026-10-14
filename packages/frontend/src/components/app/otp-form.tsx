"use client";

import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { useResendOtpMutation, useVerifyOtpMutation } from "@/hooks/use-auth-mutations";
import { getAuthErrorMessage } from "@/lib/auth.api";
import { cn } from "@/lib/utils";

type Props = {
  email: string;
  resendAfterSeconds: number;
  className?: string;
};

export function OtpForm({ email, resendAfterSeconds, className }: Props) {
  const codeId = useId();
  const noticeId = useId();

  const verifyMutation = useVerifyOtpMutation();
  const resendMutation = useResendOtpMutation();

  const [cooldown, setCooldown] = useState(resendAfterSeconds);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code"));
    verifyMutation.mutate({ email, code });
  }

  function handleResend() {
    resendMutation.mutate(
      { email },
      { onSuccess: (pending) => setCooldown(pending.resend_after_seconds) },
    );
  }

  const error = verifyMutation.isError
    ? getAuthErrorMessage(verifyMutation.error, "Could not verify that code. Try again.")
    : resendMutation.isError
      ? getAuthErrorMessage(resendMutation.error, "Could not resend the code. Try again.")
      : null;

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      <div>
        <label htmlFor={codeId} className="block text-sm text-foreground-muted">
          Verification code
        </label>
        <input
          id={codeId}
          name="code"
          type="text"
          inputMode="numeric"
          pattern="\d{4,10}"
          autoComplete="one-time-code"
          placeholder="123456"
          required
          className={cn(
            "mt-2 h-11 w-full rounded-lg border border-surface-border bg-surface px-4 text-base tracking-[0.3em]",
            "text-foreground placeholder:text-foreground-muted placeholder:tracking-normal",
            "transition-colors focus:border-signal-400/60 focus:outline-none",
          )}
        />
        <p className="mt-1.5 text-xs text-foreground-muted">We sent a code to {email}.</p>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={verifyMutation.isPending}
        aria-describedby={error ? noticeId : undefined}
      >
        {verifyMutation.isPending ? "Verifying…" : "Verify"}
      </Button>

      <button
        type="button"
        onClick={handleResend}
        disabled={cooldown > 0 || resendMutation.isPending}
        className="block text-sm text-foreground-muted transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-55"
      >
        {cooldown > 0
          ? `Resend code in ${cooldown}s`
          : resendMutation.isPending
            ? "Sending…"
            : "Resend code"}
      </button>

      {error ? (
        <p
          id={noticeId}
          role="status"
          className="rounded-lg border border-clay-400/25 bg-clay-400/5 px-4 py-3 text-sm text-foreground-muted"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
