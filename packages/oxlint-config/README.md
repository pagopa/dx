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
changes to the `jest/*` rules.

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
   the [type-aware rules](#limitations).
2. `pnpm add -D oxlint @pagopa/oxlint-config` and add the `.oxlintrc.json`
   shown above.
3. Point the `lint` scripts at `oxlint` and delete `eslint.config.js`.
4. Review the first run: the handful of rules oxlint cannot express are listed
   under [rule coverage](#rule-coverage), and formatting is unchanged.

## Rule coverage

Coverage is explicit: every oxlint category is `off`, and the configuration
turns each rule on individually. On test files (`*.test.*`, `*.spec.*`,
`test/**`) the variant adds the rules of one runner: `vitest/*` rules with
`base.json`, `jest/*` rules with `base-jest.json`.

The Jest variant mirrors the Vitest one rule for rule wherever oxlint ships a
`jest/*` equivalent, with the same severity and the same options. The rules
without a Jest counterpart are omitted rather than approximated:
`no-import-node-test`, `prefer-called-exactly-once-with` and
`require-local-test-context-for-concurrent-snapshots`.

JavaScript and TypeScript are linted differently: rules that TypeScript already
enforces (`no-const-assign`, `no-unreachable`, ...) are enabled for scripts and
turned off for `*.ts` files, where `prefer-rest-params` and `prefer-spread` only
make sense.

Rules from the ESLint era with no counterpart here:

- `no-dupe-args`, `no-octal`, `no-undef-init` —
  [not implemented](https://oxc.rs/docs/guide/usage/linter/rules) by oxlint.
- `no-undef` — implemented by oxlint, but only in its `nursery` category, which
  this config leaves disabled. It only applies to JavaScript files, where
  TypeScript users rarely lint.

## Limitations

- **Type-aware rules are not included.** They require `oxlint-tsgolint`, which
  needs a TypeScript version newer than the one used by DX today. Projects that
  need them keep a minimal ESLint setup next to oxlint.
- **No config inheritance for editors.** oxlint integrations that do not read
  `.oxlintrc.json` from the workspace root will not pick up these rules.
