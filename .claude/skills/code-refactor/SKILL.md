---
name: code-refactor
description: Behavior-preserving refactors (renames, extractions, moving code between layers, de-duplication, splitting/merging files) anywhere in Milo. Use when asked to refactor, clean up, restructure, extract, or reorganize existing code without changing what it does. Orchestrates read-only exploration and post-edit verification through subagents (code-explorer / Explore to find every call site, code-reviewer and test-runner to verify the result) so the main session edits with full knowledge of the blast radius and never declares a refactor done on its own say-so.
---

# Refactoring in Milo

A refactor changes shape, not behavior. The bar for "done" is: every call site still compiles,
every test that passed before still passes, and a reviewer who didn't write the change can't find a
behavior difference. This skill is about the workflow, explore before editing, verify after editing,
both via subagents, not about any specific refactor technique.

## Why subagents here specifically

The main session holds the conversation and the judgment calls; subagents hold the parts of the work
that are either read-only grunt work (finding every place something is used) or need to be blind to
the diff to be trustworthy (verifying it). Don't skip straight to editing on the assumption that a
grep you ran yourself was exhaustive. A fresh agent searching with no priors catches call sites an
assumption-laden search misses.

## Workflow

### 1. Scope the refactor, state the invariant

Before touching anything, write down (in your own head/response, not a file) what must stay true:
the function's return type, the route's response shape, the layering direction
(`routes -> service -> dao -> MongoDB` per root `CLAUDE.md`), the privacy constraint on `dao`/`model`
(no visitor-identity field, ever). A refactor that can't state its invariant is a rewrite wearing a
refactor's name. Ask the user to confirm scope if "refactor X" turns out to require behavior change
to do cleanly.

### 2. Explore, find the full blast radius before editing

Spawn **`code-explorer`** (read-only, scoped to this repo's three packages) or **`Explore`** (faster,
more general search) to answer: every file that imports/calls the thing being refactored, every test
that exercises it, every doc under `docs/` that describes its contract. Use `code-explorer` when the
question is "how is this wired across layers" (it knows the route→service→dao shape); use `Explore`
for a flatter "find every usage of this symbol" sweep. Run both in parallel when the refactor spans
both a wiring question and a symbol sweep. Independent calls go in one message.

Fork yourself (`subagent_type: "fork"`) instead when the exploration needs your conversation context
(e.g. "does this match what we already decided about the auth flow"). Forks inherit full context
and are cheap; fresh agents start cold and need everything restated.

Don't skip this step because the refactor "looks local." A rename inside `packages/backend`'s
`service` layer still needs its `routes` callers and its test doubles checked; a prop rename in
`@milo/ui` needs every app that imports that subpath checked (grep the `exports` map in
`packages/ui/package.json` first to know which subpaths exist).

### 3. Edit

Do the actual refactor yourself in the main session, informed by what exploration found. Don't
delegate the edit itself to a fresh agent that lacks the context you just gathered. Keep the diff to
the stated invariant: no drive-by renames, no "while I'm here" cleanups outside the stated scope, no
new abstractions the refactor didn't call for (per root `CLAUDE.md`'s simplicity rules). If
exploration turned up a call site in a different package, fix that call site in the same change. A
refactor that leaves one caller on the old shape isn't finished; it's half-done and now inconsistent.

### 4. Verify: two independent checks, not your own read-back

- **`code-reviewer`** on the diff: correctness bugs the rename/move introduced, layering violations
  (a route now importing `dao`, a service now importing `fastapi`), and privacy-rule violations
  (root `CLAUDE.md`'s non-negotiable list). It only returns findings; it won't fix anything. Treat
  every finding it returns as something to address or explicitly accept, not ignore.
- **`test-runner`**: lint, typecheck, test, build across whichever workspaces/Poetry env the change
  touched. This is the same `make lint && make typecheck && make test && make build` bar root
  `CLAUDE.md` sets for "done," run through an agent so the raw output doesn't flood your context.

Run both in parallel; they're independent of each other. A refactor isn't done when the edit looks
right to you; it's done when both come back clean, or when you've fixed what they found and re-run.

### 5. If something comes back

Fix it yourself (you have full context on why the refactor was shaped the way it was); don't bounce
a vague "fix this" back to another agent. Re-run only the check that failed, not the whole pipeline,
unless the fix touched new ground.

## When not to use this much machinery

A one-line rename inside a single file with an IDE-obvious blast radius doesn't need an exploration
agent. Grep it yourself and move on. This workflow earns its cost on refactors that cross files,
packages, or the route/service/dao boundary, where "I'm pretty sure I found every caller" is exactly
the failure mode subagent verification exists to catch.
