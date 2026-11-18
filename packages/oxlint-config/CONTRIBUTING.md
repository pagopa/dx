# Contributing to `@pagopa/oxlint-config`

Working notes for maintainers and coding agents. Consumer documentation lives in
[README.md](./README.md); keep the readme free of internal procedures.

## Layout

- `core.json` — the rules every project shares, with
  `plugins: ["eslint", "typescript"]`, plus `perfectionist` from `jsPlugins`.
  `eslint-plugin-perfectionist` is a regular dependency, its specifier resolved
  relative to `core.json`, so consumers install nothing.
- `base.json` — the Vitest overlay: `extends: ["./core.json"]`,
  `plugins: ["vitest"]`, the `vitest/*` rules.
- `base-jest.json` — the Jest overlay: `extends: ["./core.json"]`,
  `plugins: ["jest"]`, the `jest/*` rules.

Keeping the shared rules in `core.json` is what stops the two overlays from
drifting apart. oxlint's `extends` takes file paths only, so the overlay points
at its sibling: the nested `./core.json` resolves relative to the installed
package, which is why the tarball layout works and a consumer-root `core.json`
cannot shadow it. `core.json` ships in `files` but is not exported — consumers
reach it through the overlay.

oxlint merges `extends` additively: a child adds plugins, rules and overrides,
and cannot remove the parent's plugin. So `core.json` holds no test-runner rule
— anything there would reach both variants.

oxlint cannot share an override between files either, so each overlay repeats
the test-file globs and the `no-empty-function: "off"` override verbatim; the
tests pin every copy to the same values.

## Rule coverage

Coverage is explicit: every oxlint category is `off` and each rule is turned on
individually, so the rule set moves only when someone edits `core.json`.

On test files (`*.test.*`, `*.spec.*`, `test/**`) the variant adds the rules of
one runner. The Jest overlay mirrors the Vitest one rule for rule wherever
oxlint ships a `jest/*` equivalent, with the same severity and the same
options; the three without a Jest counterpart — `no-import-node-test`,
`prefer-called-exactly-once-with` and
`require-local-test-context-for-concurrent-snapshots` — are omitted rather than
approximated.

JavaScript and TypeScript are linted differently: rules that TypeScript already
enforces (`no-const-assign`, `no-unreachable`, ...) are enabled for scripts and
turned off for `*.ts` files, where `prefer-rest-params` and `prefer-spread` only
make sense.

## Making changes

`core.json` is the source of truth: adding, removing or retuning a rule there
updates both variants at once. Framework rules stay in the overlays, and a rule
both test runners need is written in both with the same value.

When oxlint gains a rule missing here, or moves `no-undef` out of `nursery`,
add it and drop it from the uncovered list in [README.md](./README.md).

After editing:

```shell
pnpm nx run-many -t test typecheck lint -p @pagopa/oxlint-config
./node_modules/.bin/oxfmt --check packages/oxlint-config
pnpm nx release plan
```

Rule additions and new flavours are a minor bump; a removal or a changed export
path is breaking and needs a migration note in the plan.

## Known gaps

The migration to oxlint did not rewrite code that needs more than a mechanical
fix. These are the exemptions and the coverage holes it left in the DX
workspace, none of them new to oxlint:

- `apps/dx-metrics` is excluded from linting by an `apps/dx-metrics/**` entry
  in the workspace `.oxlintrc.json`. The app needs a handful of code fixes and
  an `overrides` entry of its own, so it lands in a follow-up change: until
  then the entry keeps the lint gate honest instead of red. Note that the
  `@nx/oxlint` plugin infers a `lint` target only for projects that still have
  lintable files, so while the entry is in place the app has no `lint` target
  at all rather than a target that skips its files. Removing the entry is part
  of that follow-up change, not of this one.
- Files that no project owns are not linted: the DX lint gate runs per project,
  so root files (`oxfmt.config.ts`, `.pnpmfile.cjs`) and code living inside a
  non-JavaScript project (`infra/modules/aws_open_next`, whose Lambda and
  CloudFront functions are JavaScript next to Terraform) only show up in a
  manual `oxlint .` run at the workspace root.
- `plugins/padef/skills` ships its own scripts and is not an nx project, so the
  lint gate skips it as well. Its findings are `perfectionist/sort-objects` and
  `perfectionist/sort-modules` over script test fixtures almost entirely:
  mechanical, but outside a migration that promises a green gate and nothing
  else.

Run `pnpm exec oxlint --format=json .` at the workspace root to see the current
state of the last two groups.

## How the package is verified

`src/__tests__` drives the real oxlint binary from a scratch directory whose
`.oxlintrc.json` extends each shipped variant, then lints a clean file. A
configuration oxlint cannot load — a typo, an absent rule, a broken plugin
reference — fails there, so a green suite means the variants load and run.

oxlint ignores unrecognised rule options silently, so the one option set here is
proven by linting a Jest test file whose only assertion is a local `assert`
helper: it passes only while `jest/expect-expect` reads `assertFunctionNames`.

The suite also asserts what a config file cannot show about itself: every rule
prefix is declared in `plugins` or `jsPlugins` with no declared plugin unused,
the categories stay `off`, the TypeScript override keeps its split, the overlays
carry the same globs and matching rules with identical values, and every
`exports` entry plus every extended file is present in the tarball.

```shell
pnpm nx test @pagopa/oxlint-config
```

## Pinned options

A few options are pinned instead of relying on defaults:

- `no-unused-vars` sets `reportVarsOnlyUsedAsTypes` for TypeScript files, so a
  value consumed only by a type (`const id = 1; export type Id = typeof id;`)
  is reported.
- `arrow-body-style` uses `as-needed`, the only style oxlint exposes.
- `radix` sets `always` explicitly, because oxlint requires the mode.

## Performance

The readme quotes ~3×, measured on a generated directory of TypeScript files
producing the same findings under both linters, warm cache, median of 5 runs, on
Apple silicon: oxlint 0.35 s against ESLint 1.02 s. Startup cost dominates small
file sets, so real projects see a smaller ratio.

Reproduce by generating a directory of files and running both against it:

```shell
pnpm exec oxlint -c node_modules/@pagopa/oxlint-config/base.json src
pnpm exec eslint src
```
