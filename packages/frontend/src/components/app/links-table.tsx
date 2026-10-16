"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { CopyLinkButton } from "@/components/app/copy-link-button";
import { EmptyState } from "@/components/app/empty-state";
import { LinkStatusBadge } from "@/components/app/link-status-badge";
import { Button } from "@/components/ui/button";
import { computeSummary } from "@/lib/links-analytics";
import { useLinksStore } from "@/stores/links-store";

export function LinksTable() {
  const links = useLinksStore((state) => state.links);
  const events = useLinksStore((state) => state.events);
  const deleteLink = useLinksStore((state) => state.deleteLink);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const pendingDeleteLink = links.find((link) => link.id === pendingDeleteId) ?? null;

  if (links.length === 0) {
    return (
      <EmptyState
        title="No links yet"
        description="Paste the public URL of a resume you already host and Milo gives you a short link to share instead."
        action={<Button href="/links/new">Create your first link</Button>}
        className="rounded-none border-0 bg-surface/40"
      />
    );
  }

  return (
    <>
      <ul>
        {links.map((link) => {
          const summary = computeSummary(events.filter((event) => event.linkId === link.id));

          return (
            <li
              key={link.id}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-surface-border px-5 py-4 last:border-0 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]"
            >
              <div className="col-span-5 sm:col-span-1">
                <Link
                  href={`/${link.id}/dashboard`}
                  className="font-display text-base text-foreground hover:text-signal-400"
                >
                  {link.label}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <LinkStatusBadge status={link.status} />
                  <CopyLinkButton value={`milo.link/go/${link.slug}`} />
                </div>
              </div>

              <span className="hidden text-sm text-foreground sm:block">{summary.views}</span>
              <span className="hidden text-sm text-foreground sm:block">{summary.downloads}</span>
              <span className="hidden text-sm text-foreground-muted sm:block">
                {new Date(link.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>

              <div className="col-span-5 flex items-center gap-2 sm:col-span-1 sm:justify-end">
                <Link
                  href={`/${link.id}/links`}
                  aria-label={`Edit ${link.label}`}
                  className="inline-flex size-9 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  aria-label={`Delete ${link.label}`}
                  onClick={() => setPendingDeleteId(link.id)}
                  className="inline-flex size-9 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-clay-400/10 hover:text-clay-400"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={pendingDeleteLink !== null}
        title="Delete this link?"
        description={
          pendingDeleteLink
            ? `"${pendingDeleteLink.label}" and its recorded events will be deleted. This can't be undone.`
            : ""
        }
        confirmLabel="Delete link"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteLink) deleteLink(pendingDeleteLink.id);
          setPendingDeleteId(null);
        }}
      />
    </>
  );
}
