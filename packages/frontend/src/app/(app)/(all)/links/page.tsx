import type { Metadata } from "next";

import { LinksTable } from "@/components/app/links-table";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Links" };

export default function LinksPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Tracking links"
        title="Links"
        description="One link per resume, or one per application if you want to tell them apart. Your PDF stays where it already lives; Milo stores the URL, not the file."
        action={<Button href="/links/new">Create a link</Button>}
      />

      <div className="mt-10 overflow-hidden rounded-card border border-surface-border">
        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-surface-border bg-surface px-5 py-3 font-mono text-[11px] tracking-[0.16em] text-foreground-muted uppercase sm:grid">
          <span>Resume</span>
          <span>Views</span>
          <span>Downloads</span>
          <span>Created</span>
          <span className="sr-only">Actions</span>
        </div>

        <LinksTable />
      </div>
    </div>
  );
}
