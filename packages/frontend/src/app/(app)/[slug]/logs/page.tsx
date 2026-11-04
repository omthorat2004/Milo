import { LinkLogs } from "@/components/app/link-logs";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <LinkLogs slug={slug} />;
}
