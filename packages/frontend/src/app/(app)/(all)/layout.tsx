import { AppNav } from "@/components/app/app-nav";

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppNav />
      <main className="px-5 pt-8 pb-24 sm:px-8 lg:pb-12">{children}</main>
    </>
  );
}
