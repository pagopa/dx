# @pagopa/oxlint-config

PagoPA's lint rules, expressed as a native
[oxlint](https://oxc.rs/docs/guide/usage/linter) configuration.

This package is the source of truth for linting in PagoPA projects, and it
lints a workspace roughly 3× faster than ESLint. It supersedes
[`@pagopa/eslint-config`](../eslint-config), which is frozen: see
[migrating from ESLint](#migrating-from-eslint).

## Installation

The package is published on GitHub Packages. Log in to that registry, then
install through pnpm's [`gh:` alias](https://pnpm.io/registries#prefix):

```shell
pnpm login --registry https://npm.pkg.github.com/
pnpm add @pagopa/oxlint-config@gh:latest
```

`oxlint` is a peer dependency, install it alongside with `pnpm add -D oxlint`:
the configuration relies on the rule set and the JS plugin support of oxlint
`>= 1.93.0 < 2`. `eslint-plugin-perfectionist` comes with the package, so there
is nothing else to install.

## Usage

Create an `.oxlintrc.json` file at the root of your workspace, picking the
variant that matches your test runner:

```json
{
  "extends": ["./node_modules/@pagopa/oxlint-config/base.json"],
  "ignorePatterns": ["**/generated/*", "**/dist/**", "**/bin/**"]
}
```

`base.json` enables the `vitest/*` rules on test files. If your workspace tests
with Jest instead — React Native projects, for instance — extend
`base-jest.json`: everything else is identical, and only the test overlay
changes to the `jest/*` rules. It mirrors the Vitest rules one for one, except
for the three that oxlint only ships for Vitest: `no-import-node-test`,
`prefer-called-exactly-once-with` and
`require-local-test-context-for-concurrent-snapshots`.

```json
{
  "extends": ["./node_modules/@pagopa/oxlint-config/base-jest.json"],
  "ignorePatterns": ["**/generated/*", "**/dist/**", "**/bin/**"]
}
```

Neither variant loads the other's plugin, so a Jest workspace never sees
`vitest/*` findings, and vice versa. Pick one per workspace; extending both
would enable both rule sets.

`ignorePatterns` in your own file keeps `oxlint --fix` from rewriting
generated code and build output. oxlint resolves each pattern against the
directory of the configuration file that declares it, so the list shipped with
the package never matches your files: the line in your `.oxlintrc.json` is the
one that counts.

> [!IMPORTANT]  
> oxlint only accepts **file paths** in `extends`, not package specifiers, so
> `"@pagopa/oxlint-config"` is rejected with
> `Unsupported named config ... in extends`. Use the path form above. If your
> package manager does not hoist dependencies to the workspace root, point the
> path to where `@pagopa/oxlint-config` is actually installed.

Then replace your `lint` scripts:

```json
{
  "scripts": {
    "lint": "oxlint --fix",
    "lint:check": "oxlint"
  }
}
```

## Migrating from ESLint

`@pagopa/eslint-config` is frozen: it keeps working, but it will not receive new
rules or fixes. To move a workspace over:

1. `pnpm remove @pagopa/eslint-config eslint` — keep ESLint if you still need
   the [type-aware rules](#what-is-not-covered).
2. `pnpm add -D oxlint @pagopa/oxlint-config` and add the `.oxlintrc.json`
   shown above.
3. Point the `lint` scripts at `oxlint` and delete `eslint.config.js`.
4. Review the first run: the handful of rules oxlint cannot express are listed
   under [what is not covered](#what-is-not-covered), and formatting is
   unchanged.

## What is not covered

- **Rules with no oxlint implementation.** `no-dupe-args`, `no-octal` and
  `no-undef-init` are
  [not implemented](https://oxc.rs/docs/guide/usage/linter/rules) by oxlint.
- **`no-undef`.** oxlint implements it only in its `nursery` category, which
  this config leaves disabled. It only applies to JavaScript files, where
  TypeScript users rarely lint.
- **Type-aware rules.** They run through a separate backend rather than this
  config: install `tsrs`, the preferred one, and oxlint uses it automatically.
  They stay opt-in through `--type-aware` or `options.typeAware`, so projects
  that need them can enable `--type-aware` or `options.typeAware` with `tsrs`; keep
  ESLint only for rules or plugins that Oxlint cannot replace.
- **Checks the TypeScript compiler already reports.** `no-const-assign`,
  `no-unreachable` and the like are on for scripts and off for `*.ts` files,
  where `tsc` fails first.
- **Editor integrations that ignore `.oxlintrc.json`.** oxlint integrations
  that do not read the config from the workspace root will not pick up these
  rules.
- **Test blocks created by extending the runner.** A `test` created with
  `baseTest.extend()` is not recognised as a test block, because oxlint does
  not follow the fixtures it was extended from. Both variants treat any
  function named `it` or `test` as a block instead, which clears the false
  positives and still reports an `expect` sitting outside a block.
- **`.cjs` files are always CommonJS.** oxlint picks the module type from the
  extension and `overrides` cannot change it, so an ESM mock has to be renamed
  from `.cjs` to `.js` (or `.mjs`) to be parsed — the usual case being
  `__mocks__/fs.cjs` for `node:fs`.
