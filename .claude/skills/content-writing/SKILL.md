---
name: content-writing
description: Writing or editing any user-facing copy in Milo — marketing pages (packages/landing), UI copy (headings, labels, empty states, error messages, button text), docs, and the shipping-log changelog. Use whenever drafting or revising text a real person reads, not just code comments. Covers SEO structure, plain understandable language, and a hard rule against em dashes and generic AI-sounding phrasing.
---

# Writing content for Milo

This governs words, not code: marketing copy, page headings and body text, UI labels/empty
states/error messages, the `/path` shipping log, and any docs meant for a human reader. It does not
cover code comments or commit messages.

## Hard rules

**No em dashes (—).** Rewrite with a period, comma, colon, or parentheses instead. This applies
everywhere: headings, body copy, UI strings, this skill's own prose. If a draft has one, rewrite the
sentence, don't just swap in a hyphen.

**No AI-sounding filler.** Cut these on sight, don't soften them:
- Throat-clearing opens: "In today's fast-paced world", "Let's dive in", "It's no secret that"
- Empty intensifiers: "seamless", "robust", "cutting-edge", "game-changing", "unlock", "elevate",
  "leverage", "powerful", "revolutionary"
- Hedge-everything framing: "whether you're X or Y", "it's important to note that"
- Padding lists: forcing content into a rule-of-three when there are really one or two real points
- Restating the obvious: a heading that just repeats the section title in different words right
  below it
- A single word in a headline set apart in italics, bold, or a different color for emphasis, when
  the sentence doesn't need it

Write like a specific person who actually built the thing explaining it to another specific person,
not like marketing copy generated to fill a template. If a sentence would be equally true of any
competitor's product, it doesn't belong here, say what's actually different.

**Match Milo's existing voice, don't invent a new one.** The `shipping-log-writer` agent
(`.claude/agents/shipping-log-writer.md`) already states it precisely for changelog copy: "dense,
specific, technical narrative prose, not bullet-point marketing copy, not vague superlatives." The
same bar applies to marketing and UI copy: name the actual mechanism (a real constraint, a specific
behavior, an actual number you've verified), never a generic claim. Read a few existing pages in
`packages/landing/app/(marketing)` or recent `shippingLog` entries before writing new copy in the
same area, so the new text doesn't read like it was written by someone else.

**Never claim something the product doesn't do**, especially around privacy. Root `CLAUDE.md`'s
non-negotiable rules apply to copy as hard as to code: never imply Milo can identify a viewer, show
IP/location, or expose anything beyond the allowed analytics signals. Don't round a capability up to
sound more impressive than what's actually shipped, check `docs/business-requirements.md`'s
"Current state" section if unsure whether something is live yet.

## Plain, understandable writing

- Short sentences over long ones. If a sentence needs a comma-separated clause to make sense, check
  whether it should be two sentences instead.
- Active voice, concrete verbs. "Milo stores the URL" beats "The URL is stored by Milo."
- Name things the way a user understands them, not how the system is built. A user manages a
  tracking link, not a `Link` document.
- One idea per paragraph. Three-sentence paragraphs beat one eight-sentence paragraph on a
  marketing or docs page.
- Define a term the first time it's used if it's Milo-specific (e.g. "tracking link"), then use that
  exact term consistently rather than varying the phrasing for style.

## SEO structure (for `packages/landing` pages)

- Exactly one `<h1>` per page, matching what the page is actually about, not a generic tagline
  repeated everywhere.
- Headings form a real hierarchy (`h1` > `h2` > `h3`) describing the page's actual structure, not
  picked for visual size, don't skip a level.
- Page `<title>` around 50-60 characters, the specific page's topic first, not just "Milo" repeated.
- Meta `description` around 150-160 characters, written as a real sentence that explains the page
  and would make someone want to click, not a keyword list.
- Work the page's real subject into the first paragraph naturally. Don't force a keyword in if it
  reads awkwardly, natural phrasing outranks stuffing.
- Every meaningful image needs descriptive `alt` text (what it shows, not "image of..."). Decorative
  images get `alt=""`.
- Internal links use descriptive anchor text ("see the pricing page") rather than "click here" or a
  bare URL.
- Don't duplicate the same block of copy verbatim across multiple pages, write it once and link to
  it, or write a distinct version for each page's context.

## Before calling copy done

Read it out loud once. If a sentence is awkward to say, it's awkward to read. Check it against the
hard rules above (em dashes, filler phrases) with a literal search if the draft is long enough to
make a manual pass unreliable.
