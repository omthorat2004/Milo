import { BarChart3, Link2, Send } from "lucide-react";

import { Container, Section, SectionHeading } from "@/components/ui/section";

const steps = [
  {
    icon: Link2,
    title: "Paste the URL your resume already has",
    body: "Your site, GitHub, Drive, Dropbox, anywhere public. Milo stores the link and some metadata. It never uploads or keeps a copy of your PDF.",
    code: "https://yoursite.com/resume.pdf",
  },
  {
    icon: Send,
    title: "Share the Milo link instead",
    body: "One short link per resume. Put a different one in each application, or add UTM tags to tell LinkedIn from a referral.",
    code: "milo.app/r/abc123",
  },
  {
    icon: BarChart3,
    title: "Watch how it performs",
    body: "Views, unique viewers, downloads, which pages held attention and for how long. Aggregate patterns, never identities.",
    code: "12 views · 8 viewers · 3 downloads",
  },
] as const;

export function HowItWorks() {
  return (
    <Section id="how-it-works">
      <Container>
        <SectionHeading
          eyebrow="How it works"
          title="Three steps, and nothing moves."
          description="Milo is an analytics layer over a file you already host. Setup is one form, and there is nothing to install."
        />

        <ol className="mt-16 grid gap-px overflow-hidden rounded-card border border-sand-300/12 bg-sand-300/10 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="bg-ink-900 p-8">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full border border-signal-400/25 bg-signal-900/40">
                  <step.icon className="size-4 text-signal-400" aria-hidden="true" />
                </span>
                <span className="font-mono text-xs tracking-[0.2em] text-sand-700">
                  0{index + 1}
                </span>
              </div>

              <h3 className="mt-6 font-display text-xl leading-snug text-sand-50">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-sand-500">{step.body}</p>

              <p className="mt-6 truncate rounded-lg border border-sand-300/10 bg-ink-850 px-3 py-2 font-mono text-xs text-sand-300">
                {step.code}
              </p>
            </li>
          ))}
        </ol>
        {/*
          State the boundary before a visitor discovers it themselves. Milo can
          only see a page it serves, so an attached or uploaded PDF reports
          nothing back.
        */}
        <div className="mt-8 rounded-card border border-sand-300/12 bg-ink-850/50 p-6">
          <h3 className="font-display text-lg text-sand-50">
            Milo works on the link, not the file
          </h3>
          <p className="mt-2.5 text-sm leading-relaxed text-sand-500">
            Share the Milo link and every open, page turn and download is measurable. Attach the raw
            PDF to an email or upload it to a job portal and Milo sees nothing: a file that leaves
            your hands stops reporting back. Embedding a tracker inside the PDF would change that,
            and it is exactly the invisible tracking Milo refuses to do. So use the link in LinkedIn
            messages, cold emails, referrals, your portfolio and your signature.
          </p>
        </div>
      </Container>
    </Section>
  );
}
