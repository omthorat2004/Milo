import { LinkSettings } from "@/components/app/link-settings";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <LinkSettings linkId={id} />;
}
