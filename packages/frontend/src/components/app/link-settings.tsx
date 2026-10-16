"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { LinkForm } from "@/components/app/link-form";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { useLinksStore } from "@/stores/links-store";

export function LinkSettings({ linkId }: { linkId: string }) {
  const router = useRouter();
  const link = useLinksStore((state) => state.links.find((candidate) => candidate.id === linkId));
  const updateLink = useLinksStore((state) => state.updateLink);
  const deleteLink = useLinksStore((state) => state.deleteLink);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow={`Resume · ${link.label}`}
        title="Edit link"
        description="Update where this link points, how it's labeled, or its short slug."
      />

      <div className="mt-10 max-w-lg">
        <LinkForm mode="edit" link={link} />
      </div>

      <section className="mt-10 max-w-lg rounded-card border border-surface-border bg-surface/60 p-5">
        <h2 className="font-mono text-[11px] tracking-[0.18em] text-foreground-muted uppercase">
          Status
        </h2>
        <p className="mt-3 text-sm text-foreground-muted">
          {link.status === "active"
            ? "This link is live. Opening it records an event and redirects to the resume."
            : "This link is paused. Opening it won't record an event or redirect anywhere."}
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => updateLink(link.id, { status: link.status === "active" ? "paused" : "active" })}
        >
          {link.status === "active" ? "Pause link" : "Reactivate link"}
        </Button>
      </section>

      <section className="mt-6 max-w-lg rounded-card border border-clay-400/25 bg-clay-400/5 p-5">
        <h2 className="font-mono text-[11px] tracking-[0.18em] text-clay-400 uppercase">
          Delete link
        </h2>
        <p className="mt-3 text-sm text-foreground-muted">
          Permanently deletes this link and every event recorded against it. This can&apos;t be undone.
        </p>
        <Button
          type="button"
          size="sm"
          className="mt-4 bg-clay-400 text-ink-950 shadow-none hover:bg-clay-400/90 active:bg-clay-400"
          onClick={() => setConfirmingDelete(true)}
        >
          Delete link
        </Button>
      </section>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this link?"
        description={`"${link.label}" and its recorded events will be deleted. This can't be undone.`}
        confirmLabel="Delete link"
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          deleteLink(link.id);
          router.push("/links");
        }}
      />
    </div>
  );
}
