---
name: technical-writing
description: Writing any technical, internal, or explanatory text in Milo that a developer or teammate reads, not an end user, code comments, docstrings, commit messages, PR descriptions, architecture docs (docs/*.md), skill files (.claude/skills/*.md), and chat explanations of how something works. Use whenever writing or editing this kind of text, not just user-facing copy (see the content-writing skill for that). Covers plain human-readable explanation, matching this repo's existing document structure and design, and a hard rule against em dashes.
---

# Writing technical content for humans

This governs explanatory text written for a developer, reviewer, or teammate: code comments,
docstrings, commit messages, PR descriptions, `docs/*.md`, `.claude/skills/*.md`, and any chat
response that explains how something works or why a decision was made. The `content-writing` skill
owns the opposite case: copy an end user of the product reads (marketing pages, UI labels, error
messages, the shipping log). If you're not sure which applies, ask who actually reads this text. A
developer reading a docstring: this skill. A candidate reading a button label: `content-writing`.

## Hard rule: no em dashes

**Never use an em dash (—), anywhere, in anything this skill covers.** Not in a code comment, not in
a docstring, not in a commit message, not in a skill file, not in a chat response. If a sentence
wants one, it needs different punctuation instead, not a workaround:

- A dash marking an aside or a definition becomes a comma, a colon, or parentheses.
- A dash joining two closely related clauses becomes a period, splitting it into two sentences.
- A dash listing a consequence or a reason becomes "since", "because", or a colon.

Before finishing any piece of writing this skill covers, search it for "—" and fix every instance.
Don't substitute a double hyphen (`--`) or a spaced single hyphen (" - ") as a stand-in, pick
punctuation that actually fits that sentence's grammar. This rule holds even when editing or quoting
older text in this repo that already has em dashes: fix them as part of the same change rather than
copying the pattern forward.

## Write so a human actually understands it

- Say what the reader needs to know before saying why, unless the why is what makes the what make
  sense. Don't bury the actual point in the third sentence of a paragraph.
- One idea per sentence. If a sentence has two independent clauses joined by "and" or a comma splice,
  check whether it should be two sentences.
- Name the real mechanism, not a vague gesture at one. "Retries twice with a linear backoff on a 5xx"
  beats "handles errors gracefully." A reader should be able to picture the actual code path from the
  sentence.
- Explain the non-obvious thing, not the obvious one. A comment restating what a line of code
  already says in plain sight teaches the reader nothing; a comment explaining why that line exists,
  what breaks if it's removed, or what constraint it's working around earns its place.
- Write for the reader's first pass, not just a careful re-read. If a sentence needs to be read twice
  to parse, rewrite it, don't trust the reader to work for it.
- Prefer the concrete example over the abstract description when either would do. "A user with
  `email_verified=false` gets `email_not_verified`, not a login" is clearer than "unverified users
  are rejected."

## Match this repo's existing document design

Milo's docs and skills already have a consistent shape, a new one should look like it belongs next
to them, not like a different author wrote it:

- `docs/*.md` files open with a one-line statement of what the file covers, then move straight into
  structure (tables, numbered lists, `##` sections named after the thing they describe), not a
  throat-clearing intro paragraph.
- Tables are used for anything enumerable and comparable (endpoint contracts, settings, file-to-role
  maps), prose is used for anything that needs reasoning or sequence. Don't force a table where the
  content is actually a narrative, and don't write three paragraphs where a table would show the same
  facts faster.
- Skill files (`.claude/skills/*/SKILL.md`) follow the frontmatter-plus-sections shape every existing
  skill uses: a `name`/`description` header naming exactly when to load it, then a `# Title`, then
  `##` sections that each cover one concern. Read two or three existing skills before writing a new
  one so the new file's voice and structure match, not just its frontmatter.
- A code comment matches the terseness of the surrounding code. One line for a one-line reason, a
  short paragraph only when the reason genuinely needs it (a non-obvious bug workaround, a security
  decision, a constraint from an external system). Never a comment block that restates a function's
  signature.
- Commit messages and PR descriptions lead with what changed and why it matters, in that order, as
  plain sentences, not a changelog-style bullet list of file names.

## Before calling it done

Read it back once as the reader, not the writer. Then search it for "—" specifically, a single
missed em dash undoes the rest of this skill. If the text is long enough that a manual read is
unreliable, use a literal search rather than trusting a skim.
