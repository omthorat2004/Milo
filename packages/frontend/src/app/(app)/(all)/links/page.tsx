import type { Metadata } from "next";

import { EmptyState } from "@/components/app/empty-state";
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
        action={<Button>Create a link</Button>}
      />

      <div className="mt-10 overflow-hidden rounded-card border border-sand-300/12">
        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-sand-300/10 bg-ink-900 px-5 py-3 font-mono text-[11px] tracking-[0.16em] text-sand-700 uppercase sm:grid">
          <span>Resume</span>
          <span>Views</span>
          <span>Downloads</span>
          <span>Created</span>
        </div>

        <EmptyState
          title="No links yet"
          description="Paste the public URL of a resume you already host and Milo gives you a short link to share instead."
          action={<Button>Create your first link</Button>}
          className="rounded-none border-0 bg-ink-900/40"
        />
      </div>

      <p className="mt-6 text-sm text-sand-700">
        Creating links needs an account, and accounts are not open yet.
      </p>
    </div>
  );
}
