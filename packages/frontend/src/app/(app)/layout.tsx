import { PrivateProvider } from "@/components/providers/private-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PrivateProvider>
      <div className="min-h-dvh lg:pl-60">{children}</div>
    </PrivateProvider>
  );
}
