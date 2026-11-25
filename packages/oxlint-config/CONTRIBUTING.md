# Contributing to `@pagopa/oxlint-config`

The decisions behind this package, for maintainers and coding agents. Consumer
documentation lives in [README.md](./README.md); internal procedures stay here.

## Where rules live

`core.json` is the single source of truth for shared rules, which is what keeps
the two overlays from drifting. An overlay holds its runner's rules and nothing
else: oxlint merges `extends` additively and cannot remove a parent's plugin, so
a rule in `core.json` reaches both variants.

Each overlay repeats the test-file globs and the `no-empty-function: "off"`
override because oxlint has no way to share an override between files; the tests
pin every copy to the same values.

`core.json` ships in `files` but not in `exports`. The overlay reaches it by a
path relative to itself, which resolves inside the installed package, so a
`core.json` at the consumer root cannot shadow it.

## Why the module entries nest

A JSON config takes file paths in `extends`, while `oxlint.config.ts` takes
configuration objects. `compose.js` therefore hands oxlint `[core, overlay]` and
lets it merge, instead of inlining a merged copy.

Two oxlint behaviours shape that object:

- `ignorePatterns` of an extended configuration is rooted at the file that
  declares it, so the package's patterns never match a consumer path and can
  stay in the layer.
- A bare `jsPlugins` specifier resolves from the consumer root, where
  `eslint-plugin-perfectionist` is absent, so the specifier is anchored with
  `require.resolve`.

The trade-off: `oxlint --print-config` prints only the root layer of a module
config, so a `base` consumer cannot inspect its effective rule set that way.

## Rule coverage

Every oxlint category is `off` and rules are switched on one by one, so the set
moves only when someone edits `core.json`.

The Jest overlay mirrors the Vitest one rule for rule wherever oxlint ships a
`jest/*` equivalent, with the same severity and options, and omits the rest
rather than approximating it.

## Making changes

Change `core.json` first: it reaches both variants. A rule both runners need is
written in both overlays with the same value. A rule TypeScript already enforces
belongs in the override for scripts, not the one for `*.ts`.

When oxlint gains a rule missing here, or moves one out of `nursery`, enable it
and drop it from [what is not covered](./README.md#what-is-not-covered).

Rule additions and new flavours are a minor bump; removing a rule or changing an
export path is breaking and needs a migration note in the version plan.

## What the tests prove

Every variant is loaded by the real oxlint binary from a scratch consumer
directory, so a green suite means the shipped files load and lint: an unknown
rule, a broken plugin path or a tarball entry missing from `files` fails there.

oxlint ignores unrecognised rule options silently, so the one option set here is
proven by a test file whose only assertion is a local `assert` helper: it passes
only while `jest/expect-expect` reads `assertFunctionNames`.

## Pinned options

Options are pinned where a default would hide the intent:

- `no-unused-vars` reports values used only as types, so
  `const id = 1; export type Id = typeof id;` is reported.
- `arrow-body-style` uses `as-needed`, the only style oxlint exposes.
- `radix` sets `always` explicitly, because oxlint requires the mode.

## Performance

The ~3x in the readme is a warm-cache median of 5 runs on Apple silicon, over a
generated directory where both linters report the same findings: oxlint 0.35 s
against ESLint 1.02 s. Startup dominates small file sets, so real projects see a
smaller ratio. Reproduce by generating such a directory and pointing both
linters at it.
