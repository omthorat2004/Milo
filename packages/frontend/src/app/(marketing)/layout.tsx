import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";

/**
 * Shell for every public, unauthenticated page.
 *
 * A route group, so these pages sit at /features and /path rather than
 * /marketing/features. The authenticated app will get its own group and its own
 * chrome without inheriting any of this.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
