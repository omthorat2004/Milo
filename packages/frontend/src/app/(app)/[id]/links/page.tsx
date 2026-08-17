import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow={`Resume · ${id}`}
        title="Links"
        description="Scoped to one resume rather than your whole account."
      />

      <EmptyState
        title="Not built yet"
        description="Per-resume views land once resumes and tracking links exist. Until then the global pages show everything."
        className="mt-10"
      />
    </div>
  );
}
