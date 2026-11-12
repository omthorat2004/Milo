"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useSyncExternalStore } from "react";

import { PasswordField } from "@/components/app/auth-form";
import { Button } from "@/components/ui/button";
import { useForgotPasswordMutation, useResetPasswordMutation } from "@/hooks/use-auth-mutations";
import { getAuthErrorMessage } from "@/lib/auth.api";
import {
  clearResetCooldown,
  loadResetCooldown,
  saveResetCooldown,
  secondsLeft,
} from "@/lib/reset-cooldown";
import { cn } from "@/lib/utils";

type Step = "email" | "reset";

/**
 * Two steps in one component, not two pages: there's no server-side "pending
 * reset" state worth resolving on mount the way /verify's OTP step does
 * (useResolveVerificationMutation), since the backend's forgot-password
 * response is deliberately the same whether or not the email has an
 * account, there's nothing to ask it after a refresh without leaking that.
 *
 * What survives a refresh lives in sessionStorage instead (see
 * lib/reset-cooldown): the email and when the resend button unlocks. The
 * timer length comes from the server's resend_after_seconds, so it always
 * matches the server's real cooldown.
 */
export function ForgotPasswordForm({ className }: { className?: string }) {
  // False on the server and during hydration, true afterwards. sessionStorage
  // only exists in the browser, so the saved reset is read once, by a form
  // remounted after hydration, instead of in the useState initialisers of the
  // first render (which would make server and client markup disagree).
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  return (
    <ForgotPasswordSteps
      key={hydrated ? "client" : "server"}
      restore={hydrated}
      className={className}
    />
  );
}

function subscribeNever(): () => void {
  return () => {};
}

function ForgotPasswordSteps({ className, restore }: { className?: string; restore: boolean }) {
  const router = useRouter();
  const emailId = useId();
  const codeId = useId();
  const passwordId = useId();
  const noticeId = useId();

  const [saved] = useState(() => (restore ? loadResetCooldown() : null));
  const [step, setStep] = useState<Step>(saved ? "reset" : "email");
  const [email, setEmail] = useState(saved?.email ?? "");
  const [cooldown, setCooldown] = useState(saved ? secondsLeft(saved.until) : 0);

  const forgotPassword = useForgotPasswordMutation();
  const resetPassword = useResetPasswordMutation();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!resetPassword.isSuccess) return;
    clearResetCooldown();
    router.replace("/dashboard");
  }, [resetPassword.isSuccess, router]);

  function startCooldown(address: string, seconds: number) {
    saveResetCooldown(address, seconds);
    setCooldown(seconds);
  }

  function handleEmailSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedEmail = String(new FormData(event.currentTarget).get("email"));
    setEmail(submittedEmail);
    forgotPassword.mutate(
      { email: submittedEmail },
      {
        onSuccess: (result) => {
          startCooldown(submittedEmail, result.resend_after_seconds);
          setStep("reset");
        },
      },
    );
  }

  function handleResend() {
    forgotPassword.mutate(
      { email },
      { onSuccess: (result) => startCooldown(email, result.resend_after_seconds) },
    );
  }

  function handleResetSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    resetPassword.mutate({
      email,
      code: String(data.get("code")),
      newPassword: String(data.get("password")),
    });
  }

  if (step === "email") {
    return (
      <form onSubmit={handleEmailSubmit} className={cn("space-y-4", className)}>
        <div>
          <label htmlFor={emailId} className="block text-sm text-foreground-muted">
            Email
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            className={cn(
              "mt-2 h-11 w-full rounded-lg border border-surface-border bg-surface px-4 text-base",
              "text-foreground placeholder:text-foreground-muted",
              "transition-colors focus:border-signal-400/60 focus:outline-none",
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
          {forgotPassword.isPending ? "Sending…" : "Send reset code"}
        </Button>
      </form>
    );
  }

  const error = resetPassword.isError
    ? getAuthErrorMessage(resetPassword.error, "Could not reset your password. Try again.")
    : null;

  return (
    <form onSubmit={handleResetSubmit} className={cn("space-y-4", className)}>
      <p className="text-sm text-foreground-muted">
        If an account exists for {email}, we sent a reset code. Enter it below with a new password.
      </p>

      <div>
        <label htmlFor={codeId} className="block text-sm text-foreground-muted">
          Reset code
        </label>
        <input
          id={codeId}
          name="code"
          type="text"
          inputMode="numeric"
          pattern="\d{4,10}"
          minLength={6}
          autoComplete="one-time-code"
          placeholder="123456"
          required
          className={cn(
            "mt-2 h-11 w-full rounded-lg border border-surface-border bg-surface px-4 text-base tracking-[0.3em]",
            "text-foreground placeholder:tracking-normal placeholder:text-foreground-muted",
            "transition-colors focus:border-signal-400/60 focus:outline-none",
          )}
        />
      </div>

      <PasswordField
        id={passwordId}
        label="New password"
        name="password"
        autoComplete="new-password"
        required
        minLength={12}
        hint="At least 12 characters."
      />

      <Button
        type="submit"
        className="w-full"
        disabled={resetPassword.isPending}
        aria-describedby={error ? noticeId : undefined}
      >
        {resetPassword.isPending ? "Resetting…" : "Reset password"}
      </Button>

      <button
        type="button"
        onClick={handleResend}
        disabled={cooldown > 0 || forgotPassword.isPending}
        className="block text-sm text-foreground-muted transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-55"
      >
        {cooldown > 0
          ? `Resend code in ${cooldown}s`
          : forgotPassword.isPending
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
