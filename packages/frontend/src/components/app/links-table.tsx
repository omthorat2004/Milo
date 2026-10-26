"use client";

import { Eye, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { CopyLinkButton } from "@/components/app/copy-link-button";
import { EmptyState } from "@/components/app/empty-state";
import { LinkStatusBadge } from "@/components/app/link-status-badge";
import { Button } from "@/components/ui/button";
import { useRevokeLinkMutation } from "@/hooks/use-link-mutations";
import { useMyEventsQuery, useMyLinksQuery } from "@/hooks/use-link-queries";
import { computeSummary } from "@/lib/links-analytics";
import { linkStatus } from "@/lib/links.api";

export function LinksTable() {
  const linksQuery = useMyLinksQuery();
  const eventsQuery = useMyEventsQuery();
  const revokeLink = useRevokeLinkMutation();
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);

  const links = linksQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const pendingRevokeLink = links.find((link) => link.id === pendingRevokeId) ?? null;

  if (linksQuery.isLoading) {
    return <p className="px-5 py-8 text-sm text-foreground-muted">Loading links…</p>;
  }

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
          const summary = computeSummary(events.filter((event) => event.link_id === link.id));
          const status = linkStatus(link);

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
                  {link.resume_title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <LinkStatusBadge status={status} />
                  <CopyLinkButton value={link.share_url} />
                </div>
              </div>

              <span className="hidden text-sm text-foreground sm:block">{summary.views}</span>
              <span className="hidden text-sm text-foreground sm:block">{summary.downloads}</span>
              <span className="hidden text-sm text-foreground-muted sm:block">
                {new Date(link.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>

              <div className="col-span-5 flex items-center gap-2 sm:col-span-1 sm:justify-end">
                <Link
                  href={`/${link.id}/links`}
                  aria-label={`View details for ${link.resume_title}`}
                  className="inline-flex size-9 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                >
                  <Eye className="size-4" aria-hidden="true" />
                </Link>
                {status !== "revoked" ? (
                  <button
                    type="button"
                    aria-label={`Revoke ${link.resume_title}`}
                    onClick={() => setPendingRevokeId(link.id)}
                    className="inline-flex size-9 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-clay-400/10 hover:text-clay-400"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={pendingRevokeLink !== null}
        title="Revoke this link?"
        description={
          pendingRevokeLink
            ? `"${pendingRevokeLink.resume_title}" will stop working immediately. This can't be undone.`
            : ""
        }
        confirmLabel="Revoke link"
        onCancel={() => setPendingRevokeId(null)}
        onConfirm={() => {
          if (pendingRevokeLink) revokeLink.mutate(pendingRevokeLink.id);
          setPendingRevokeId(null);
        }}
      />
    </>
  );
}
