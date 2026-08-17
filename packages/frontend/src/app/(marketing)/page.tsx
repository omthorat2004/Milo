import { ShippingLog, shippingLog } from "@milo/ui/shipping-log";
import Link from "next/link";

import { LinkOnly } from "@/components/marketing/link-only";
import { RawStory } from "@/components/marketing/raw-story";
import { Button } from "@/components/ui/button";

export default function MarketingHomePage() {
  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
        <h1 className="max-w-3xl font-display text-5xl leading-[0.98] text-balance text-sand-50 sm:text-6xl">
          Know when your resume gets seen.
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-sand-500">
          Share your resume through Milo and see when it&rsquo;s viewed, downloaded, and where the
          traffic came from. Never who.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button href="/register">Get started</Button>
          <Button href="/features" variant="secondary">
            See what it does
          </Button>
        </div>
      </section>

      <RawStory />

      <LinkOnly />

      <section className="mx-auto w-full max-w-4xl border-t border-sand-300/8 px-5 py-20 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-display text-3xl text-sand-50">Built in the open</h2>
          <Link href="/path" className="text-sm text-signal-400 hover:text-signal-300">
            See the full path →
          </Link>
        </div>
        <p className="mt-4 max-w-xl text-sand-500">
          The last few things that shipped, dated the day they landed.
        </p>

        <ShippingLog entries={shippingLog} variant="compact" limit={3} className="mt-12" />
      </section>
    </>
  );
}
