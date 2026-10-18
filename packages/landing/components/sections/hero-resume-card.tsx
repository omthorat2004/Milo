/**
 * A purely decorative floating resume mockup for the hero's right side.
 *
 * Every row is an abstract bar, never real invented text, on purpose: it's a
 * small visual joke that lands with the product's own privacy claim, the
 * resume reads as a resume without Milo (or us) needing to know whose it is.
 * Entirely aria-hidden, the headline and body copy already carry the meaning.
 *
 * No Three.js here deliberately, the page already has one <Canvas> (the story
 * section below), and the three-js-scenes skill's hard rule is one per page.
 */
export function HeroResumeCard() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-[38%] right-6 hidden w-72 -translate-y-1/2 lg:block xl:right-16"
    >
      <div className="animate-breathe motion-reduce:animate-none">
        <div className="relative -rotate-3 rounded-card border border-sand-300/50 bg-sand-50/95 p-5 shadow-2xl shadow-ink-950/40 backdrop-blur-sm">
          {/* Header: name + title, abstracted. */}
          <div className="h-3 w-28 rounded-full bg-ink-950/70" />
          <div className="mt-2 h-2 w-20 rounded-full bg-signal-500/70" />
          <div className="mt-4 h-px w-full bg-sand-300" />

          {/* Two experience rows. */}
          {[0, 1].map((row) => (
            <div key={row} className="mt-4">
              <div className="flex items-center justify-between">
                <div className="h-2 w-24 rounded-full bg-ink-950/55" />
                <div className="h-1.5 w-10 rounded-full bg-sand-300" />
              </div>
              <div className="mt-2 h-1.5 w-32 rounded-full bg-sand-300" />
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-sand-200" />
              <div className="mt-1.5 h-1.5 w-2/3 rounded-full bg-sand-200" />
            </div>
          ))}

          {/* Skill chips. */}
          <div className="mt-5 flex flex-wrap gap-1.5">
            {[14, 10, 16, 8].map((width, index) => (
              <div
                key={index}
                className="h-4 rounded-full bg-sand-200"
                style={{ width: `${width * 4}px` }}
              />
            ))}
          </div>
        </div>

        {/* The core product claim, visualised: a view landing on a loop. */}
        <div className="absolute -top-3 -right-3 flex animate-view-pulse items-center gap-1.5 rounded-full border border-signal-400/30 bg-ink-950 px-3 py-1.5 text-xs font-medium text-sand-50 shadow-lg shadow-signal-400/20">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal-400 opacity-70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-signal-400" />
          </span>
          Viewed
        </div>
      </div>
    </div>
  );
}
