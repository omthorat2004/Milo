import type { Metadata } from "next";

import { LinkForm } from "@/components/app/link-form";
import { PageHeader } from "@/components/app/page-header";

export const metadata: Metadata = { title: "New link" };

export default function NewLinkPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Tracking links"
        title="Create a link"
        description="Paste the public URL of a resume you already host. Milo generates a short link that records views and downloads, never who made them."
      />

      <div className="mt-10 max-w-lg">
        <LinkForm mode="create" />
      </div>
    </div>
  );
}
