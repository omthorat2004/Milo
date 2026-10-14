"use client";

import { useId, useState } from "react";

import { OtpForm } from "@/components/app/otp-form";
import { Button } from "@/components/ui/button";
import { useLoginMutation, useRegisterMutation } from "@/hooks/use-auth-mutations";
import { getAuthErrorMessage } from "@/lib/auth.api";
import { cn } from "@/lib/utils";

type Mode = "login" | "register";

type Props = {
  mode: Mode;
  className?: string;
};

type PendingVerification = { email: string; resendAfterSeconds: number };

export function AuthForm({ mode, className }: Props) {
  const emailId = useId();
  const passwordId = useId();
  const nameId = useId();
  const noticeId = useId();

  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const mutation = mode === "register" ? registerMutation : loginMutation;

  const [pending, setPending] = useState<PendingVerification | null>(null);

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email"));
    const password = String(data.get("password"));

    if (mode === "register") {
      registerMutation.mutate(
        { name: String(data.get("name")), email, password },
        {
          onSuccess: (challenge) =>
            setPending({ email: challenge.email, resendAfterSeconds: challenge.resend_after_seconds }),
        },
      );
    } else {
      loginMutation.mutate({ email, password });
    }
  }

  if (mode === "register" && pending) {
    return (
      <OtpForm email={pending.email} resendAfterSeconds={pending.resendAfterSeconds} className={className} />
    );
  }

  const notice = mutation.isError
    ? getAuthErrorMessage(mutation.error, "Something went wrong. Try again.")
    : null;

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      {mode === "register" ? (
        <Field id={nameId} label="Name" name="name" type="text" autoComplete="name" required />
      ) : null}

      <Field
        id={emailId}
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
      />

      <Field
        id={passwordId}
        label="Password"
        name="password"
        type="password"
        autoComplete={mode === "register" ? "new-password" : "current-password"}
        required
        hint={mode === "register" ? "At least 12 characters." : undefined}
      />

      <Button
        type="submit"
        className="w-full"
        disabled={mutation.isPending}
        aria-describedby={notice ? noticeId : undefined}
      >
        {mode === "register"
          ? mutation.isPending
            ? "Creating account…"
            : "Create account"
          : mutation.isPending
            ? "Logging in…"
            : "Log in"}
      </Button>

      {notice ? (
        <p
          id={noticeId}
          role="status"
          className="rounded-lg border border-clay-400/25 bg-clay-400/5 px-4 py-3 text-sm text-foreground-muted"
        >
          {notice}
        </p>
      ) : null}
    </form>
  );
}

type FieldProps = {
  id: string;
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
};

function Field({ id, label, hint, ...props }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-foreground-muted">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={cn(
          "mt-2 h-11 w-full rounded-lg border border-surface-border bg-surface px-4 text-base",
          "text-foreground placeholder:text-foreground-muted",
          "transition-colors focus:border-signal-400/60 focus:outline-none",
        )}
      />
      {hint ? <p className="mt-1.5 text-xs text-foreground-muted">{hint}</p> : null}
    </div>
  );
}
