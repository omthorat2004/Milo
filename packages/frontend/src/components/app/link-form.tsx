"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { useCreateTrackingLinkMutation } from "@/hooks/use-link-mutations";
import { getLinkErrorMessage } from "@/lib/links.api";
import { cn } from "@/lib/utils";

export function LinkForm({ className }: { className?: string }) {
  const router = useRouter();
  const createTrackingLink = useCreateTrackingLinkMutation();

  const titleId = useId();
  const urlId = useId();
  const expiryId = useId();

  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    const trimmedUrl = sourceUrl.trim();

    if (!trimmedTitle || !trimmedUrl) {
      setError("Title and resume URL are both required.");
      return;
    }

    try {
      void new URL(trimmedUrl);
    } catch {
      setError("That doesn't look like a full URL — include https://.");
      return;
    }

    const parsedExpiry = expiresInDays.trim() ? Number(expiresInDays) : null;

    createTrackingLink.mutate(
      { title: trimmedTitle, sourceUrl: trimmedUrl, expiresInDays: parsedExpiry },
      {
        onSuccess: (link) => router.push(`/${link.id}/dashboard`),
        onError: (mutationError) => {
          setError(getLinkErrorMessage(mutationError, "Couldn't create this link. Try again."));
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      <Field
        id={titleId}
        label="Title"
        hint="How you'll tell this link apart from the others — the role, company, or audience."
        inputProps={{
          value: title,
          onChange: (event) => setTitle(event.target.value),
          placeholder: "Backend engineer — Acme",
          required: true,
          maxLength: 80,
        }}
      />

      <Field
        id={urlId}
        label="Resume URL"
        hint="Wherever the PDF already lives — Google Drive, Dropbox, your own site. Milo stores the URL, not the file."
        inputProps={{
          value: sourceUrl,
          onChange: (event) => setSourceUrl(event.target.value),
          placeholder: "https://drive.google.com/file/d/…/view",
          type: "url",
          required: true,
        }}
      />

      <Field
        id={expiryId}
        label="Expires after (days)"
        hint="Optional. Leave blank for a link that never expires."
        inputProps={{
          value: expiresInDays,
          onChange: (event) => setExpiresInDays(event.target.value),
          placeholder: "30",
          type: "number",
          min: 1,
        }}
      />

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={createTrackingLink.isPending}>
          {createTrackingLink.isPending ? "Creating…" : "Create link"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      {error ? (
        <p
          role="status"
          className="rounded-lg border border-clay-400/25 bg-clay-400/5 px-4 py-3 text-sm text-foreground-muted"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
};

function Field({ id, label, hint, inputProps }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-foreground-muted">
        {label}
      </label>
      <input
        id={id}
        {...inputProps}
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
