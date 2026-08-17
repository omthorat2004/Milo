import { AppNav } from "@/components/app/app-nav";

export default async function ResourceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <AppNav resourceId={id} />
      <main className="px-5 pt-8 pb-24 sm:px-8 lg:pb-12">{children}</main>
    </>
  );
}
