"use client";

import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import type { WaitlistSource } from "@/lib/waitlist/schema";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "done" | "error";

type Props = {
  source: WaitlistSource;
  className?: string;
  /** Larger type and taller field for the closing section. */
  size?: "md" | "lg";
};

export function WaitlistForm({ source, className, size = "md" }: Props) {
  const emailId = useId();
  const statusId = useId();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    setStatus("submitting");
    setMessage("");

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source,
          company: form.get("company") ?? "",
        }),
      });

      const payload: unknown = await response.json();
      const text = readMessage(payload);

      if (!response.ok) {
        setStatus("error");
        setMessage(text ?? "Something went wrong. Try again.");
        return;
      }

      setStatus("done");
      setMessage(text ?? "You're on the list.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Network error. Check your connection and try again.");
    }
  }

  if (status === "done") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-full border border-signal-400/30 bg-signal-900/40 px-5 py-3.5",
          className,
        )}
        role="status"
      >
        <Check className="size-4 shrink-0 text-signal-400" aria-hidden="true" />
        <p className="text-sm text-signal-200">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("w-full", className)} noValidate>
      <div
        className={cn(
          "flex flex-col gap-2.5 sm:flex-row",
          size === "lg" ? "sm:gap-3" : "sm:gap-2.5",
        )}
      >
        <label htmlFor={emailId} className="sr-only">
          Email address
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status === "error") setStatus("idle");
          }}
          aria-describedby={message ? statusId : undefined}
          aria-invalid={status === "error"}
          className={cn(
            "w-full min-w-0 flex-1 rounded-full border bg-ink-850/80 text-sand-100",
            // sand-500 rather than sand-700: the dimmer token fell below 4.5:1
            // against the field background.
            "placeholder:text-sand-500 focus:outline-none",
            "transition-colors duration-200",
            status === "error"
              ? "border-clay-400/70"
              : "border-sand-300/20 focus:border-signal-400/60",
            // 16px minimum on the font size, or iOS Safari zooms on focus.
            size === "lg" ? "h-14 px-6 text-base" : "h-11 px-5 text-sm",
          )}
        />

        {/* Honeypot, hidden from people, irresistible to bots. */}
        <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden opacity-0">
          <label htmlFor={`${emailId}-company`}>Company</label>
          <input
            id={`${emailId}-company`}
            name="company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <Button type="submit" size={size === "lg" ? "lg" : "md"} disabled={status === "submitting"}>
          {status === "submitting" ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Joining
            </>
          ) : (
            <>
              Join the waitlist
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </div>

      <p
        id={statusId}
        role={status === "error" ? "alert" : undefined}
        className={cn("mt-3 text-[13px]", status === "error" ? "text-clay-400" : "text-sand-500")}
      >
        {message || "No spam. One email when Milo opens up, then nothing."}
      </p>
    </form>
  );
}

function readMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;
  const value = record.message ?? record.error;
  return typeof value === "string" ? value : null;
}
