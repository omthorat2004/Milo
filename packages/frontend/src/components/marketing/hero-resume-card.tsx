/**
 * A purely decorative resume mockup for the marketing hero's right side.
 *
 * Every row is an abstract bar, never real invented text, on purpose, it's a
 * small visual echo of the product's own privacy claim: the resume reads as a
 * resume without Milo (or us) needing to know whose it is. Entirely
 * aria-hidden, the headline and body copy already carry the meaning.
 *
 * Deliberately a different treatment from packages/landing's version of the
 * same idea (a tilted card with a "Viewed" badge arriving on a loop): this
 * one sits upright and shows a reading line travelling down the page, for
 * "being read right now" rather than "a view just landed". No Three.js here,
 * this page already has one <Canvas> (RawStory, further down), and the
 * three-js-scenes skill's hard rule is one per page.
 */
export function HeroResumeCard() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 right-6 hidden w-64 -translate-y-1/2 lg:block xl:right-16"
    >
      <div className="relative overflow-hidden rounded-card border border-surface-border bg-surface/80 p-5 opacity-90 shadow-2xl shadow-ink-950/40 backdrop-blur-sm">
        {/* Header: name + title, abstracted. */}
        <div className="h-3 w-24 rounded-full bg-foreground/60" />
        <div className="mt-2 h-2 w-16 rounded-full bg-signal-400/70" />
        <div className="mt-4 h-px w-full bg-surface-border" />

        {/* Two experience rows. */}
        {[0, 1].map((row) => (
          <div key={row} className="mt-4">
            <div className="flex items-center justify-between">
              <div className="h-2 w-20 rounded-full bg-foreground/45" />
              <div className="h-1.5 w-8 rounded-full bg-surface-border" />
            </div>
            <div className="mt-2 h-1.5 w-28 rounded-full bg-surface-border" />
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-surface-border/70" />
          </div>
        ))}

        {/* The core product claim, visualised: a page being read, on a loop. */}
        <div className="absolute inset-x-5 h-px animate-scan-line bg-gradient-to-r from-transparent via-signal-400 to-transparent shadow-[0_0_8px_1px] shadow-signal-400/70 motion-reduce:hidden" />
      </div>
    </div>
  );
}
