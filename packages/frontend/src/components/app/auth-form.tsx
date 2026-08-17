"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mode = "login" | "register";

type Props = {
  mode: Mode;
  className?: string;
};

export function AuthForm({ mode, className }: Props) {
  const emailId = useId();
  const passwordId = useId();
  const nameId = useId();
  const noticeId = useId();

  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      {mode === "register" ? (
        <Field id={nameId} label="Name" name="name" type="text" autoComplete="name" />
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

      <Button type="submit" className="w-full" aria-describedby={submitted ? noticeId : undefined}>
        {mode === "register" ? "Create account" : "Log in"}
      </Button>

      {submitted ? (
        <p
          id={noticeId}
          role="status"
          className="rounded-lg border border-clay-400/25 bg-clay-400/5 px-4 py-3 text-sm text-sand-300"
        >
          Accounts are not open yet, so this form does not submit anywhere. Nothing you typed was
          sent or stored.
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
      <label htmlFor={id} className="block text-sm text-sand-300">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={cn(
          "mt-2 h-11 w-full rounded-lg border border-sand-300/20 bg-ink-850/80 px-4 text-base",
          "text-sand-100 placeholder:text-sand-500",
          "transition-colors focus:border-signal-400/60 focus:outline-none",
        )}
      />
      {hint ? <p className="mt-1.5 text-xs text-sand-700">{hint}</p> : null}
    </div>
  );
}
