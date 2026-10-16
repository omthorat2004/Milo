import { LinkLogs } from "@/components/app/link-logs";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <LinkLogs linkId={id} />;
}
