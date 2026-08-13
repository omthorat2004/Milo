import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features",
  description: "What Milo measures, and what it deliberately refuses to.",
};

const measured = [
  [
    "Views and unique viewers",
    "One recruiter opening your resume five times counts as one viewer, not five.",
  ],
  ["Per-page attention", "How long each page held someone, and where they stopped reading."],
  [
    "Downloads",
    "Recorded before the file is handed over. Repeat clicks in a short window count once.",
  ],
  ["Traffic source", "UTM tags first, referrer domain second, Direct when neither is available."],
  ["Device category", "Desktop, mobile or tablet, plus browser and OS."],
  [
    "Your file stays put",
    "Milo stores the URL and the analytics. It never uploads or copies your PDF.",
  ],
] as const;

const refused = [
  "Names, emails or LinkedIn profiles of viewers",
  "IP addresses shown to you, or kept beyond a request",
  "City, country or any location derived from an address",
  "Device fingerprints",
  "Tracking across other websites",
] as const;

export default function FeaturesPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-20 sm:px-8 sm:py-28">
      <p className="font-mono text-xs tracking-[0.22em] text-signal-400 uppercase">Features</p>
      <h1 className="mt-5 font-display text-4xl leading-[1.05] text-balance text-sand-50 sm:text-5xl">
        Everything you get. Nothing you shouldn&rsquo;t.
      </h1>

      <div className="mt-14 grid gap-4 sm:grid-cols-2">
        {measured.map(([title, body]) => (
          <div key={title} className="rounded-card border border-sand-300/12 bg-ink-850/70 p-6">
            <h2 className="font-display text-lg text-sand-50">{title}</h2>
            <p className="mt-2.5 text-sm leading-relaxed text-sand-500">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-card border border-sand-300/12 bg-ink-850/40 p-7">
        <h2 className="font-display text-xl text-sand-50">What Milo will not do</h2>
        <p className="mt-2 text-sm text-sand-700">
          These are not gaps waiting to be filled. There is no identity field in the schema.
        </p>
        <ul className="mt-5 space-y-2.5">
          {refused.map((item) => (
            <li key={item} className="text-sm text-sand-500">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
