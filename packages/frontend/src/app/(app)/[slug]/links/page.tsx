import { LinkSettings } from "@/components/app/link-settings";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <LinkSettings slug={slug} />;
}
