import type { Metadata } from "next";

import { ResumeViewer } from "@/components/app/resume-viewer";

export const metadata: Metadata = { title: "Shared resume" };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <ResumeViewer slug={slug} />;
}
