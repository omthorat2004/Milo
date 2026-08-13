import { ShippingLog, shippingLog } from "@milo/ui/shipping-log";
import Link from "next/link";

import { Container, Section, SectionHeading } from "@/components/ui/section";

/**
 * Public build log on the marketing page.
 *
 * Shows only the most recent releases and links to the full history. The
 * component and its data come from @milo/ui, so this section and the product
 * app's /path page can never disagree about what shipped.
 */
export function ShippingPath() {
  return (
    <Section id="path" className="border-t border-sand-300/8">
      <Container>
        <SectionHeading
          eyebrow="Path"
          title="Built in the open, dated honestly."
          description="Milo is early and being built in the open. Every technical and product decision lands here as it gets made, dated the day it shipped, including the quiet weeks."
        />

        <ShippingLog entries={shippingLog} variant="compact" limit={4} className="mt-14" />

        <Link
          href="/path"
          className="mt-10 inline-flex text-sm text-signal-400 transition-colors hover:text-signal-300"
        >
          See everything that shipped →
        </Link>
      </Container>
    </Section>
  );
}
