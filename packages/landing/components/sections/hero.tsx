import { ArrowDown } from "lucide-react";

import { WaitlistForm } from "@/components/sections/waitlist-form";
import { Badge } from "@/components/ui/card";
import { Container } from "@/components/ui/section";
import { siteConfig } from "@/lib/site";

export function Hero() {
  return (
    <section className="grain relative isolate overflow-hidden pt-32 pb-24 sm:pt-40 sm:pb-32">
      {/* Warm horizon glow, anchored behind the headline. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[38rem] bg-[radial-gradient(60%_50%_at_50%_40%,rgba(192,141,99,0.16),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-56 -z-10 h-[32rem] bg-[radial-gradient(45%_45%_at_60%_50%,rgba(63,207,142,0.10),transparent_70%)]"
      />

      <Container>
        <Badge>
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal-400 opacity-70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-signal-400" />
          </span>
          {siteConfig.status}
        </Badge>

        <h1 className="mt-8 max-w-3xl font-display text-5xl leading-[0.98] text-balance text-sand-50 sm:text-6xl md:text-7xl">
          Know when your resume gets seen.
        </h1>

        <p className="mt-7 max-w-xl text-lg leading-relaxed text-sand-500">
          Share your resume through Milo and see when it&rsquo;s viewed, downloaded, and where the
          traffic came from.
        </p>

        <p className="mt-4 max-w-xl text-base leading-relaxed text-sand-700">
          Your resume stays where it already lives. Milo provides the analytics layer.
        </p>

        <div className="mt-10 max-w-xl">
          <WaitlistForm source="hero" size="lg" />
        </div>

        <a
          href="#story"
          className="mt-16 inline-flex items-center gap-2 text-sm text-sand-700 transition-colors hover:text-sand-300"
        >
          <ArrowDown className="size-4" aria-hidden="true" />
          See how it works
        </a>
      </Container>
    </section>
  );
}
