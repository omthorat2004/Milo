import { LinkDashboard } from "@/components/app/link-dashboard";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <LinkDashboard linkId={id} />;
}
