import Link from "next/link";

const worksWith = [
  "LinkedIn messages and connection notes",
  "Cold emails and follow-ups",
  "Referrals, where someone forwards your link internally",
  "Your portfolio site, GitHub README and email signature",
  'Application forms with a "portfolio or resume URL" field',
] as const;

/**
 * The limitation, stated before anyone can discover it themselves.
 *
 * Milo can only see what happens on a page it serves. A PDF that leaves your
 * hands reports nothing back, and the trick that would change that, embedding
 * remote content inside the file, is exactly the invisible tracking this
 * product refuses to do.
 */
export function LinkOnly() {
  return (
    <section className="border-t border-sand-300/8 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-4xl px-5 sm:px-8">
        <p className="font-mono text-xs tracking-[0.22em] text-signal-400 uppercase">
          What Milo solves today
        </p>
        <h2 className="mt-5 font-display text-3xl leading-[1.1] text-balance text-sand-50 sm:text-4xl">
          Milo works on the link, not the file.
        </h2>

        <div className="mt-6 space-y-4 text-lg leading-relaxed text-sand-500">
          <p>
            You share <span className="text-sand-200">milo.app/r/abc123</span> instead of attaching
            the PDF. That link is a page Milo serves, so opening it, turning a page and downloading
            are all things Milo can actually see.
          </p>
          <p>
            Attach the PDF to an email or upload it into a job portal and Milo sees nothing. A file
            that leaves your hands stops reporting back. There is a trick that would change that,
            embedding remote content inside the PDF so opening it pings a server, and Milo will not
            use it. Most readers block it anyway, and it is precisely the invisible tracking this
            product exists to avoid.
          </p>
          <p className="text-sand-300">
            So this is the honest scope right now: Milo helps everywhere you control what you send.
          </p>
        </div>

        <ul className="mt-8 grid gap-2.5 sm:grid-cols-2">
          {worksWith.map((item) => (
            <li
              key={item}
              className="rounded-lg border border-sand-300/12 bg-ink-850/60 px-4 py-3 text-sm text-sand-300"
            >
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-6 text-sm text-sand-700">
          Portals that demand a file upload are outside what Milo can measure. Upload the file
          there, and use the link everywhere else.{" "}
          <Link href="/path" className="text-signal-400 hover:text-signal-300">
            Follow what ships next
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
