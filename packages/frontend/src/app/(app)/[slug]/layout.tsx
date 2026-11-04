import { AppNav } from "@/components/app/app-nav";

export default async function ResourceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <>
      <AppNav resourceId={slug} />
      {/* Extra top padding below lg reserves space for the fixed mobile icon row
       * (Profile/back-link + ThemeToggle in app-nav.tsx), which otherwise floats
       * directly over PageHeader's top-left eyebrow/title at phone width. */}
      <main className="px-5 pt-20 pb-24 sm:px-8 lg:pt-8 lg:pb-12">{children}</main>
    </>
  );
}
