/**
 * The public build log behind /path.
 *
 * Every entry is something that actually shipped, dated the day it shipped.
 * The page derives day numbers, totals and cadence from this array, so adding a
 * feature means adding one entry here and nothing else.
 *
 * Write these for an engineer reading over your shoulder. Name the decision and
 * the constraint, not the marketing outcome. Keep it honest: the value of
 * publishing a dated log is entirely that the dates are real.
 */

export type ShipStatus = "shipped" | "building";

export type ShipEntry = {
  /** ISO date, YYYY-MM-DD. The day the work actually landed. */
  date: string;
  title: string;
  description: string;
  tags: readonly string[];
  status: ShipStatus;
};

/** Newest first. The page groups these by date for display. */
export const shippingLog: readonly ShipEntry[] = [
  {
    date: "2026-08-13",
    title: "Product app, and the design system underneath it",
    description:
      "Marketing shell for the app, with a story section where one beat index drives the copy feed, the figure pose and a WebGL backdrop of 54 cards rendered as a single InstancedMesh. Tokens and shared components moved into their own packages so both apps render from one source; Tailwind v4 needs explicit source globs to scan a linked package, verified against the built CSS rather than assumed.",
    tags: ["React", "Three.js", "Design system", "Monorepo"],
    status: "shipped",
  },
  {
    date: "2026-08-13",
    title: "Polyglot monorepo with a single task runner",
    description:
      "npm workspaces for TypeScript, Poetry for the FastAPI service, and a Makefile so one command lints both languages. CI splits into parallel JavaScript and Python jobs. Prettier is fenced out of the Python package, proven by dropping an identical malformed file into each and checking only one was flagged.",
    tags: ["Infrastructure", "CI", "Python"],
    status: "shipped",
  },
  {
    date: "2026-08-12",
    title: "Source-available licensing, notices generated not guessed",
    description:
      "Elastic License 2.0, diffed byte for byte against two official Elastic repositories rather than reproduced from memory. Third-party notices built from each dependency own license file, which surfaced that lucide-react carries ISC terms plus a separate MIT notice for Feather-derived code.",
    tags: ["Licensing", "Compliance"],
    status: "shipped",
  },
  {
    date: "2026-08-09",
    title: "Waitlist API, and a Mongo client that survives a cold start",
    description:
      "Zod validation at the boundary, rate limiting, and a honeypot that returns success so bots learn nothing. Duplicates are rejected by a unique index rather than a read-then-write check that would race. One cached client per serverless instance, and a rejected connect promise clears itself, since a memoised rejection makes a warm instance fail forever after the cluster is fixed.",
    tags: ["API", "MongoDB", "Security", "Reliability"],
    status: "shipped",
  },
  {
    date: "2026-08-09",
    title: "Landing page, and privacy enforced in the schema",
    description:
      "A scroll-driven WebGL story in five acts. Progress lives in a ref, not state, so the canvas runs at 60fps while React re-renders about five times across the section, and it degrades to a static composition under reduced-motion or without WebGL. There is no identity field to switch on later: IPs are hashed with a rotating salt for rate limiting only, and Permissions-Policy denies camera, microphone and geolocation at the HTTP layer.",
    tags: ["Three.js", "Performance", "Privacy", "Accessibility"],
    status: "shipped",
  },
];

export type ShipDay = {
  date: string;
  entries: readonly ShipEntry[];
};

/** Groups the log by date, preserving the newest-first order. */
export function groupByDay(entries: readonly ShipEntry[]): ShipDay[] {
  const days = new Map<string, ShipEntry[]>();

  for (const entry of entries) {
    const existing = days.get(entry.date);
    if (existing) existing.push(entry);
    else days.set(entry.date, [entry]);
  }

  return [...days.entries()].map(([date, dayEntries]) => ({ date, entries: dayEntries }));
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Stats shown at the top of /path, all derived rather than hardcoded. */
export function summarise(entries: readonly ShipEntry[]) {
  const dates = entries.map((entry) => entry.date).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];

  const shippingDays = new Set(dates).size;
  const elapsedDays =
    first && last
      ? Math.round(
          (Date.parse(`${last}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86_400_000,
        ) + 1
      : 0;

  return {
    total: entries.length,
    shippingDays,
    elapsedDays,
    firstShip: first,
  };
}

/**
 * What is coming, deliberately without dates.
 *
 * The whole value of a dated log is that the dates are real, so nothing here
 * claims a day. "Next" is what is actively being picked up, "soon" is queued,
 * "later" is wanted but unscheduled. A missed promise on this page would cost
 * more credibility than the promise ever bought.
 */
export type PlannedWhen = "next" | "soon" | "later";

export type PlannedEntry = {
  title: string;
  description: string;
  when: PlannedWhen;
  tags: readonly string[];
};

export const upcomingWork: readonly PlannedEntry[] = [
  {
    title: "Accounts and sessions",
    description:
      "Sign up, log in, log out, with authorisation checks on every protected route so no account can reach another's resumes by changing an id.",
    when: "next",
    tags: ["Auth", "Backend"],
  },
  {
    title: "Create a tracking link",
    description:
      "Paste the URL your resume already lives at and get back milo.app/r/abc123. URL validation with SSRF guards, since the server must never be tricked into fetching an internal address.",
    when: "next",
    tags: ["API", "Security"],
  },
  {
    title: "The viewer itself",
    description:
      "PDF.js rendering with page navigation, zoom and fullscreen, plus the download flow that records the event before handing the file over.",
    when: "soon",
    tags: ["Frontend", "PDF"],
  },
  {
    title: "Event pipeline and dashboard",
    description:
      "Anonymous sessions, deduplicated page views, dwell time per page, and the analytics that turn those into views, unique viewers, downloads and traffic source.",
    when: "soon",
    tags: ["Analytics", "MongoDB"],
  },
  {
    title: "Link controls",
    description:
      "Expiring links, one link per application, and UTM presets so a candidate can tell LinkedIn from a referral without hand-editing query strings.",
    when: "later",
    tags: ["Product"],
  },
];

export const whenLabel: Record<PlannedWhen, string> = {
  next: "Up next",
  soon: "Queued",
  later: "Wanted, unscheduled",
};
