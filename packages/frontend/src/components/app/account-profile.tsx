"use client";

import { LogOut } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { PasswordField } from "@/components/app/auth-form";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import {
  useForgotPasswordMutation,
  useLogoutMutation,
  useResetPasswordMutation,
} from "@/hooks/use-auth-mutations";
import { getAuthErrorMessage } from "@/lib/auth.api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

export function AccountProfile() {
  const user = useAuthStore((state) => state.user);
  const logout = useLogoutMutation();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Your account details on this device."
      />

      <section className="max-w-lg space-y-4 rounded-card border border-surface-border bg-surface/60 p-5 text-sm">
        <Row label="Name">{user?.name}</Row>
        <Row label="Email">{user?.email}</Row>
      </section>

      {user ? <ChangePasswordSection email={user.email} /> : null}

      <section className="max-w-lg rounded-card border border-surface-border bg-surface/60 p-5">
        <h2 className="font-mono text-[11px] tracking-[0.18em] text-foreground-muted uppercase">
          Session
        </h2>
        <p className="mt-3 text-sm text-foreground-muted">
          Signed in on this device. Logging out clears this session and sends you back to login.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOut className="size-4" aria-hidden="true" />
          {logout.isPending ? "Logging out…" : "Log out"}
        </Button>
      </section>
    </div>
  );
}

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Reuses the same OTP mechanics as /forgot-password rather than a
 * current-password check: the backend never gained a "verify old password"
 * endpoint, and a mailed code is the proof-of-ownership model this codebase
 * already settled on for every other password change. The only difference
 * here is the email is the signed-in user's own, never typed, and a
 * successful change stays on this page instead of redirecting to /dashboard.
 */
function ChangePasswordSection({ email }: { email: string }) {
  const codeId = useId();
  const passwordId = useId();
  const noticeId = useId();

  const [step, setStep] = useState<"idle" | "code">("idle");
  const [cooldown, setCooldown] = useState(0);
  const [justChanged, setJustChanged] = useState(false);

  const forgotPassword = useForgotPasswordMutation();
  const resetPassword = useResetPasswordMutation();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function handleSendCode() {
    setJustChanged(false);
    forgotPassword.mutate(
      { email },
      {
        onSuccess: () => {
          setCooldown(RESEND_COOLDOWN_SECONDS);
          setStep("code");
        },
      },
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    resetPassword.mutate(
      { email, code: String(data.get("code")), newPassword: String(data.get("password")) },
      {
        onSuccess: () => {
          setStep("idle");
          setJustChanged(true);
        },
      },
    );
  }

  const error = resetPassword.isError
    ? getAuthErrorMessage(resetPassword.error, "Could not change your password. Try again.")
    : null;

  return (
    <section className="max-w-lg rounded-card border border-surface-border bg-surface/60 p-5">
      <h2 className="font-mono text-[11px] tracking-[0.18em] text-foreground-muted uppercase">
        Password
      </h2>

      {step === "idle" ? (
        <>
          <p className="mt-3 text-sm text-foreground-muted">
            Changing your password requires a code sent to {email}, the same verification used to
            reset a forgotten one.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={handleSendCode}
            disabled={forgotPassword.isPending}
          >
            {forgotPassword.isPending ? "Sending…" : "Send verification code"}
          </Button>
          {justChanged ? (
            <p
              role="status"
              className="mt-3 rounded-lg border border-signal-400/25 bg-signal-400/5 px-4 py-3 text-xs text-foreground-muted"
            >
              Password changed.
            </p>
          ) : null}
        </>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm text-foreground-muted">
            Enter the code sent to {email} with your new password.
          </p>

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

          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={resetPassword.isPending}>
              {resetPassword.isPending ? "Changing…" : "Change password"}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setStep("idle")}>
              Cancel
            </Button>
          </div>

          <button
            type="button"
            onClick={handleSendCode}
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
              className="rounded-lg border border-clay-400/25 bg-clay-400/5 px-4 py-3 text-xs text-foreground-muted"
            >
              {error}
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-foreground-muted">{label}</span>
      <span className="min-w-0 truncate text-foreground">{children}</span>
    </div>
  );
}
