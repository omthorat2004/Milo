import { Clock, FileText, Gauge, Link2, MousePointerClick, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Container, Section, SectionHeading } from "@/components/ui/section";

const features = [
  {
    icon: FileText,
    title: "Your file, your host",
    body: "Milo stores the URL and the analytics, never the document. Move or replace the PDF and the tracking link keeps working.",
  },
  {
    icon: Gauge,
    title: "Views and unique viewers",
    body: "Separate a recruiter opening your resume four times from four different people opening it once.",
  },
  {
    icon: Clock,
    title: "Per-page attention",
    body: "Which page held someone the longest, and where they stopped reading. Deduplicated, so scrolling back does not inflate the count.",
  },
  {
    icon: MousePointerClick,
    title: "Download tracking",
    body: "Downloads are recorded before the file is handed over, and repeat clicks within a short window count once.",
  },
  {
    icon: Link2,
    title: "Source attribution",
    body: "UTM tags first, referrer domain second, Direct when neither is available. Honest about what it cannot know.",
  },
  {
    icon: ShieldCheck,
    title: "Anonymous by construction",
    body: "Sessions are anonymous and scoped to one resume. There is no identity field in the schema to fill in later.",
  },
] as const;

export function Features() {
  return (
    <Section id="features" className="border-t border-sand-300/8">
      <Container>
        <SectionHeading
          eyebrow="Features"
          title="Built for one job: the job hunt."
          description="No CRM, no lead scoring, no pitch-deck analytics. Milo does one thing for people applying to roles."
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <feature.icon className="size-5 text-signal-400" aria-hidden="true" />
              <h3 className="mt-5 font-display text-lg text-sand-50">{feature.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-sand-500">{feature.body}</p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
