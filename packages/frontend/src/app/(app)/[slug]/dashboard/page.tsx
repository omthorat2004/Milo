import { LinkDashboard } from "@/components/app/link-dashboard";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <LinkDashboard slug={slug} />;
}
