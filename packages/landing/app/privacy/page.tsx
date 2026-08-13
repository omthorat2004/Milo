import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/section";
import { collectedSignals, neverCollected, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Milo records when someone opens a resume, what it deliberately does not record, and how long any of it is kept.",
};

const sections = [
  {
    heading: "Who this page is for",
    body: [
      "Two groups of people are involved when a Milo link is opened: the candidate who created it, and the visitor who opens it. This page is for both.",
      "The visitor never agreed to anything. That constraint shapes every decision below.",
    ],
  },
  {
    heading: "Why anything is collected at all",
    body: [
      "A candidate sharing a resume cannot tell a role that ignored their application from one that read it three times. Milo exists to answer that question and only that question.",
      "So the rule is: collect what is needed to describe how a document performed, and nothing that describes the person reading it.",
    ],
  },
  {
    heading: "Anonymous sessions",
    body: [
      "When a resume link is opened, Milo creates a random session identifier. It is scoped to a single resume, it is not derived from anything about the visitor or their device, and it cannot be linked to a session on any other resume or any other site.",
      "The session exists so that one person refreshing a page is not counted as four different viewers. That is its whole purpose.",
    ],
  },
  {
    heading: "Location",
    body: [
      "Milo does not perform IP geolocation, does not request GPS permission, and does not display or store city or country. There is no location field anywhere in the system.",
    ],
  },
  {
    heading: "IP addresses",
    body: [
      "Like every web service, Milo's servers receive an IP address with each request; it is how the internet delivers a response. Milo does not show it to the resume owner, does not use it to derive location, and does not keep it as part of the analytics record.",
      "Where an address is needed to limit abuse, it is hashed with a rotating salt so the value cannot be reversed or correlated across days.",
    ],
  },
  {
    heading: "Retention",
    body: [
      "Analytics events are kept while the resume exists in your account. Deleting a resume deletes its events and sessions.",
      "Milo is in private beta and the retention window may tighten before launch. It will not loosen without this page changing first.",
    ],
  },
  {
    heading: "Your resume file",
    body: [
      "Milo stores the URL you provide and metadata about it. The PDF itself stays with whoever already hosts it. Milo does not copy it into its own storage.",
      "That also means anyone with the original URL can still reach the file directly. Milo adds analytics; it is not access control.",
    ],
  },
  {
    heading: "This marketing site",
    body: [
      "The page you are reading now runs no analytics, no tag manager, and no third-party scripts. The only data it collects is an email address, and only if you type one into the waitlist form.",
      "That email is used to send one message when Milo opens up. Reply and ask, and it is deleted.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <article className="pt-32 pb-24 sm:pt-40">
      <Container className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.22em] text-signal-400 uppercase">Privacy</p>
        <h1 className="mt-5 font-display text-4xl leading-[1.05] text-balance text-sand-50 sm:text-5xl">
          What {siteConfig.name} knows, and what it refuses to.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-sand-500">
          Plain language, no legal theatre. This describes how the product is built, not a set of
          promises about laws we are not qualified to interpret for you.
        </p>

        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          <div className="rounded-card border border-signal-400/20 bg-signal-900/20 p-6">
            <h2 className="font-display text-lg text-sand-50">Recorded on a resume view</h2>
            <ul className="mt-4 space-y-2 text-sm text-sand-300">
              {collectedSignals.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-card border border-sand-300/12 bg-ink-850/60 p-6">
            <h2 className="font-display text-lg text-sand-50">Never recorded</h2>
            <ul className="mt-4 space-y-2 text-sm text-sand-500">
              {neverCollected.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 space-y-12">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-2xl text-sand-50">{section.heading}</h2>
              {section.body.map((paragraph, index) => (
                <p key={index} className="mt-4 leading-relaxed text-sand-500">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <p className="mt-16 border-t border-sand-300/10 pt-8 text-sm text-sand-700">
          Questions about any of this?{" "}
          <Link href="/#waitlist" className="text-signal-400 hover:text-signal-300">
            Join the waitlist
          </Link>{" "}
          and reply to the first email, it reaches a person.
        </p>
      </Container>
    </article>
  );
}
