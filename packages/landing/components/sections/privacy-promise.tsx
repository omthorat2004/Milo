import { Check, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container, Section, SectionHeading } from "@/components/ui/section";
import { collectedSignals, neverCollected } from "@/lib/site";

export function PrivacyPromise() {
  return (
    <Section id="privacy" className="border-t border-sand-300/8">
      <Container>
        <SectionHeading
          eyebrow="Privacy"
          title="Milo tells you how, not who."
          description="A recruiter opening your resume did not sign up for anything. The only honest way to build this is to collect the minimum that answers your question and nothing beyond it."
        />

        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          <div className="rounded-card border border-signal-400/20 bg-signal-900/20 p-7">
            <h3 className="font-display text-xl text-sand-50">What Milo records</h3>
            <ul className="mt-6 space-y-3">
              {collectedSignals.map((signal) => (
                <li key={signal} className="flex gap-3 text-sm text-sand-300">
                  <Check className="mt-0.5 size-4 shrink-0 text-signal-400" aria-hidden="true" />
                  {signal}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-card border border-sand-300/12 bg-ink-850/60 p-7">
            <h3 className="font-display text-xl text-sand-50">What Milo will not do</h3>
            <ul className="mt-6 space-y-3">
              {neverCollected.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-sand-500">
                  <X className="mt-0.5 size-4 shrink-0 text-clay-400" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Button variant="secondary" asChild>
            <Link href="/privacy">Read the full privacy page</Link>
          </Button>
          <p className="text-sm text-sand-700">
            Written in plain language, without legal claims we cannot back up.
          </p>
        </div>
      </Container>
    </Section>
  );
}
