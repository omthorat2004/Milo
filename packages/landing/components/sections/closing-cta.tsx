import { WaitlistForm } from "@/components/sections/waitlist-form";
import { Container } from "@/components/ui/section";

type Props = {
  /**
   * Rendered only when `featureFlags.showWaitlistCount` is on. It stays off
   * until the number is worth showing, early counts undersell the product.
   */
  waitlistCount: number | null;
};

export function ClosingCta({ waitlistCount }: Props) {
  return (
    <section
      id="waitlist"
      className="grain relative isolate overflow-hidden border-t border-sand-300/8 py-28 sm:py-36"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[26rem] bg-[radial-gradient(50%_60%_at_50%_100%,rgba(63,207,142,0.14),transparent_70%)]"
      />

      <Container className="text-center">
        <h2 className="mx-auto max-w-2xl font-display text-4xl leading-[1.05] text-balance text-sand-50 sm:text-5xl">
          Stop guessing whether anyone opened it.
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-sand-500">
          Milo is in private beta. Leave your email and we&rsquo;ll send one message when tracking
          links open up, no drip sequence, no newsletter.
        </p>

        <div className="mx-auto mt-10 max-w-lg">
          <WaitlistForm source="closing" size="lg" />
        </div>

        {waitlistCount !== null ? (
          <p className="mt-8 font-mono text-xs tracking-[0.16em] text-sand-700 uppercase">
            {waitlistCount.toLocaleString()} people waiting
          </p>
        ) : null}
      </Container>
    </section>
  );
}
