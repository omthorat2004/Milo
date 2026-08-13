/**
 * The scrollytelling script.
 *
 * One array drives both the HTML copy and the 3D scene: each act owns a slice
 * of scroll progress (0..1 across the whole story section), and the renderer
 * derives every camera move and object state from that number. Adding a beat
 * means adding an entry here, not editing the scene.
 */

export type StoryActId = "hosted" | "shared" | "link" | "signal" | "insight";

export type StoryAct = {
  id: StoryActId;
  /** Small label above the headline. */
  eyebrow: string;
  headline: string;
  body: string;
};

export const storyActs: readonly StoryAct[] = [
  {
    id: "hosted",
    eyebrow: "01 · Today",
    headline: "Your resume already lives somewhere.",
    body: "On your site, in Drive, on GitHub. Milo does not move it, copy it, or store it. It stays exactly where you put it.",
  },
  {
    id: "shared",
    eyebrow: "02 · The problem",
    headline: "You send it, and it goes dark.",
    body: "Forty applications, one inbox, no reply. You cannot tell the roles that never opened it from the ones that read it twice.",
  },
  {
    id: "link",
    eyebrow: "03 · The change",
    headline: "Share one Milo link instead.",
    body: "milo.app/r/abc123 opens your real PDF in a clean viewer. Same document, same host. Now with a signal attached.",
  },
  {
    id: "signal",
    eyebrow: "04 · The signal",
    headline: "Every open sends one pulse back.",
    body: "Opened at 10:42. Came from LinkedIn. Desktop. Read page two for ninety seconds. Downloaded. That is the entire record.",
  },
  {
    id: "insight",
    eyebrow: "05 · The point",
    headline: "You see the pattern, never the person.",
    body: "Milo answers how your resume is performing. It will never tell you who read it, no names, no company, no location. That is not a missing feature. It is the design.",
  },
] as const;

/** Inclusive-exclusive scroll range owned by an act. */
export function actRange(index: number, total: number): [number, number] {
  return [index / total, (index + 1) / total];
}
