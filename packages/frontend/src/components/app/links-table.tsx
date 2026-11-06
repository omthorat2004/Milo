"use client";

import { Eye, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { CopyLinkButton } from "@/components/app/copy-link-button";
import { EmptyState } from "@/components/app/empty-state";
import { LinkStatusBadge } from "@/components/app/link-status-badge";
import { Pagination } from "@/components/app/pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/use-pagination";
import { useRevokeLinkMutation } from "@/hooks/use-link-mutations";
import { useMyEventsQuery, useMyLinksQuery } from "@/hooks/use-link-queries";
import { computeSummary } from "@/lib/links-analytics";
import { linkStatus, type LinkStatus } from "@/lib/links.api";

const PAGE_SIZE = 10;

export function LinksTable() {
  const linksQuery = useMyLinksQuery();
  const eventsQuery = useMyEventsQuery();
  const revokeLink = useRevokeLinkMutation();
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);

  const eventsPending = eventsQuery.isPending;
  const links = linksQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const pendingRevokeLink = links.find((link) => link.id === pendingRevokeId) ?? null;
  const { page, pageCount, pageItems: pageLinks, setPage } = usePagination(links, PAGE_SIZE);

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
        {pageLinks.map((link) => {
          const summary = computeSummary(events.filter((event) => event.link_id === link.id));
          const status = linkStatus(link);

          return (
            <li
              key={link.id}
              className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_5.5rem] items-center gap-4 border-b border-surface-border px-5 py-4 last:border-0"
            >
              <div className="col-span-5 min-w-0 sm:col-span-1">
                <Link
                  href={`/${link.slug}/dashboard`}
                  className="block truncate font-display text-base text-foreground hover:text-signal-400"
                >
                  {link.resume_title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <LinkStatusBadge status={status} />
                  <CopyLinkButton value={link.share_url} />
                  {/* Below sm, the actions column further down this row is
                   * hidden entirely (there's no room for a separate
                   * right-aligned column), so the same icons render here
                   * instead, in line with the status/copy-link row rather
                   * than as an orphaned second row with dead space beside
                   * it. */}
                  <div className="flex items-center gap-1 sm:hidden">
                    <LinkRowActions
                      linkId={link.id}
                      slug={link.slug}
                      resumeTitle={link.resume_title}
                      status={status}
                      onRevoke={setPendingRevokeId}
                    />
                  </div>
                </div>
              </div>

              <span className="hidden text-sm text-foreground sm:block">
                {eventsPending ? <Skeleton className="h-4 w-6" /> : summary.views}
              </span>
              <span className="hidden text-sm text-foreground sm:block">
                {eventsPending ? <Skeleton className="h-4 w-6" /> : summary.downloads}
              </span>
              <span className="hidden text-sm text-foreground-muted sm:block">
                {new Date(link.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>

              <div className="hidden items-center gap-2 sm:col-span-1 sm:flex sm:justify-end">
                <LinkRowActions
                  linkId={link.id}
                  slug={link.slug}
                  resumeTitle={link.resume_title}
                  status={status}
                  onRevoke={setPendingRevokeId}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <Pagination page={page} pageCount={pageCount} onChange={setPage} />

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

function LinkRowActions({
  linkId,
  slug,
  resumeTitle,
  status,
  onRevoke,
}: {
  linkId: string;
  slug: string;
  resumeTitle: string;
  status: LinkStatus;
  onRevoke: (linkId: string) => void;
}) {
  return (
    <>
      <Link
        href={`/${slug}/links`}
        aria-label={`View details for ${resumeTitle}`}
        className="inline-flex size-9 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <Eye className="size-4" aria-hidden="true" />
      </Link>
      {status !== "revoked" ? (
        <button
          type="button"
          aria-label={`Revoke ${resumeTitle}`}
          onClick={() => onRevoke(linkId)}
          className="inline-flex size-9 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-clay-400/10 hover:text-clay-400"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </>
  );
}
