import { ClosingCta } from "@/components/sections/closing-cta";
import { DashboardPreview } from "@/components/sections/dashboard-preview";
import { Features } from "@/components/sections/features";
import { Hero } from "@/components/sections/hero";
import { HowItWorks } from "@/components/sections/how-it-works";
import { PrivacyPromise } from "@/components/sections/privacy-promise";
import { Story } from "@/components/sections/story";
import { featureFlags } from "@/lib/site";
import { getWaitlistStore } from "@/lib/waitlist/store";

export default async function HomePage() {
  // Read directly from the store rather than over HTTP — this is a server
  // component, and the count endpoint is intentionally operator-only.
  const waitlistCount = featureFlags.showWaitlistCount
    ? await getWaitlistStore()
        .count()
        .catch(() => null)
    : null;

  return (
    <>
      <Hero />
      <Story />
      <HowItWorks />
      <DashboardPreview />
      <Features />
      <PrivacyPromise />
      <ClosingCta waitlistCount={waitlistCount} />
    </>
  );
}
