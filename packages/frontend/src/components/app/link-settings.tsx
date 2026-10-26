"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { CopyLinkButton } from "@/components/app/copy-link-button";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { useRevokeLinkMutation, useUpdateLinkExpiryMutation } from "@/hooks/use-link-mutations";
import { useLinkQuery } from "@/hooks/use-link-queries";
import { useUpdateResumeMutation } from "@/hooks/use-resume-mutations";
import { getLinkErrorMessage, linkStatus, type TrackingLink } from "@/lib/links.api";
import { getResumeErrorMessage } from "@/lib/resumes.api";
import { cn } from "@/lib/utils";

export function LinkSettings({ linkId }: { linkId: string }) {
  const router = useRouter();
  const linkQuery = useLinkQuery(linkId);
  const revokeLink = useRevokeLinkMutation();
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);

  if (linkQuery.isLoading) {
    return (
      <p className="mx-auto w-full max-w-5xl px-5 py-8 text-sm text-foreground-muted">Loading…</p>
    );
  }

  const link = linkQuery.data;

  if (!link) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <PageHeader eyebrow="Not found" title="Links" />
        <EmptyState
          title="This link doesn't exist"
          description="It may have been deleted. Here's the full list of what's left."
          action={<Button href="/links">Back to links</Button>}
          className="mt-10"
        />
      </div>
    );
  }

  const status = linkStatus(link);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow={`Resume · ${link.resume_title}`}
        title="Link details"
        description="Where this link points and when it expires."
      />

      <section className="mt-10 max-w-lg space-y-4 rounded-card border border-surface-border bg-surface/60 p-5 text-sm">
        <Row label="Share link">
          <CopyLinkButton value={link.share_url} />
        </Row>
        <Row label="Created">{new Date(link.created_at).toLocaleString()}</Row>
      </section>

      {status !== "revoked" ? <ResumeEditor link={link} /> : <ReadOnlyResume link={link} />}

      {status !== "revoked" ? <ExpiryEditor link={link} /> : null}

      {status !== "revoked" ? (
        <section className="mt-6 max-w-lg rounded-card border border-clay-400/25 bg-clay-400/5 p-5">
          <h2 className="font-mono text-[11px] tracking-[0.18em] text-clay-400 uppercase">
            Revoke link
          </h2>
          <p className="mt-3 text-sm text-foreground-muted">
            Stops this link from resolving immediately. Events already recorded are kept. This
            can&apos;t be undone.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-4 bg-clay-400 text-ink-950 shadow-none hover:bg-clay-400/90 active:bg-clay-400"
            onClick={() => setConfirmingRevoke(true)}
          >
            Revoke link
          </Button>
        </section>
      ) : (
        <section className="mt-6 max-w-lg rounded-card border border-surface-border bg-surface/40 p-5">
          <p className="text-sm text-foreground-muted">
            This link was revoked and no longer resolves.
          </p>
        </section>
      )}

      <ConfirmDialog
        open={confirmingRevoke}
        title="Revoke this link?"
        description={`"${link.resume_title}" will stop working immediately. This can't be undone.`}
        confirmLabel="Revoke link"
        onCancel={() => setConfirmingRevoke(false)}
        onConfirm={() => {
          revokeLink.mutate(link.id, { onSuccess: () => router.push("/links") });
          setConfirmingRevoke(false);
        }}
      />
    </div>
  );
}

function ReadOnlyResume({ link }: { link: TrackingLink }) {
  return (
    <section className="mt-6 max-w-lg space-y-4 rounded-card border border-surface-border bg-surface/60 p-5 text-sm">
      <Row label="Title">{link.resume_title}</Row>
      <Row label="Resume URL">
        <a
          href={link.resume_source_url}
          target="_blank"
          rel="noreferrer"
          className="truncate text-signal-400 hover:underline"
        >
          {link.resume_source_url}
        </a>
      </Row>
    </section>
  );
}

function ResumeEditor({ link }: { link: TrackingLink }) {
  const updateResume = useUpdateResumeMutation();
  const titleId = useId();
  const urlId = useId();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(link.resume_title);
  const [sourceUrl, setSourceUrl] = useState(link.resume_source_url);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <section className="mt-6 max-w-lg space-y-4 rounded-card border border-surface-border bg-surface/60 p-5 text-sm">
        <Row label="Title">{link.resume_title}</Row>
        <Row label="Resume URL">
          <a
            href={link.resume_source_url}
            target="_blank"
            rel="noreferrer"
            className="truncate text-signal-400 hover:underline"
          >
            {link.resume_source_url}
          </a>
        </Row>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setTitle(link.resume_title);
            setSourceUrl(link.resume_source_url);
            setError(null);
            setEditing(true);
          }}
        >
          Edit
        </Button>
      </section>
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    const trimmedUrl = sourceUrl.trim();
    if (!trimmedTitle || !trimmedUrl) {
      setError("Title and resume URL are both required.");
      return;
    }

    updateResume.mutate(
      {
        id: link.resume_id,
        input: { title: trimmedTitle, source_url: trimmedUrl },
      },
      {
        onSuccess: () => setEditing(false),
        onError: (mutationError) =>
          setError(getResumeErrorMessage(mutationError, "Couldn't save. Try again.")),
      },
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 max-w-lg space-y-4 rounded-card border border-surface-border bg-surface/60 p-5 text-sm"
    >
      <div>
        <label htmlFor={titleId} className="block text-sm text-foreground-muted">
          Title
        </label>
        <input
          id={titleId}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={80}
          required
          className={cn(
            "mt-2 h-11 w-full rounded-lg border border-surface-border bg-surface px-4 text-base",
            "text-foreground placeholder:text-foreground-muted",
            "transition-colors focus:border-signal-400/60 focus:outline-none",
          )}
        />
      </div>

      <div>
        <label htmlFor={urlId} className="block text-sm text-foreground-muted">
          Resume URL
        </label>
        <input
          id={urlId}
          type="url"
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          required
          className={cn(
            "mt-2 h-11 w-full rounded-lg border border-surface-border bg-surface px-4 text-base",
            "text-foreground placeholder:text-foreground-muted",
            "transition-colors focus:border-signal-400/60 focus:outline-none",
          )}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={updateResume.isPending}>
          {updateResume.isPending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>

      {error ? (
        <p
          role="status"
          className="rounded-lg border border-clay-400/25 bg-clay-400/5 px-4 py-3 text-xs text-foreground-muted"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}

function ExpiryEditor({ link }: { link: TrackingLink }) {
  const updateExpiry = useUpdateLinkExpiryMutation();
  const expiryId = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const expiresInDays = value.trim() ? Number(value) : null;
    updateExpiry.mutate(
      { linkId: link.id, expiresInDays },
      {
        onError: (mutationError) =>
          setError(getLinkErrorMessage(mutationError, "Couldn't update expiry. Try again.")),
      },
    );
  }

  return (
    <section className="mt-6 max-w-lg rounded-card border border-surface-border bg-surface/60 p-5">
      <h2 className="font-mono text-[11px] tracking-[0.18em] text-foreground-muted uppercase">
        Expiry
      </h2>
      <p className="mt-3 text-sm text-foreground-muted">
        Currently{" "}
        {link.expires_at
          ? `expires ${new Date(link.expires_at).toLocaleString()}`
          : "never expires"}
        .
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex items-end gap-3">
        <div>
          <label htmlFor={expiryId} className="block text-xs text-foreground-muted">
            New expiry (days from now, blank = never)
          </label>
          <input
            id={expiryId}
            type="number"
            min={1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="30"
            className={cn(
              "mt-2 h-10 w-32 rounded-lg border border-surface-border bg-surface px-3 text-sm",
              "text-foreground placeholder:text-foreground-muted",
              "transition-colors focus:border-signal-400/60 focus:outline-none",
            )}
          />
        </div>
        <Button type="submit" size="sm" disabled={updateExpiry.isPending}>
          {updateExpiry.isPending ? "Saving…" : "Update"}
        </Button>
      </form>

      {error ? (
        <p
          role="status"
          className="mt-3 rounded-lg border border-clay-400/25 bg-clay-400/5 px-4 py-3 text-xs text-foreground-muted"
        >
          {error}
        </p>
      ) : null}
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
