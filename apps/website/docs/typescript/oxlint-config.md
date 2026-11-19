---
sidebar_position: 3
---

# Configuring Oxlint

The `@pagopa/oxlint-config` package is our shared lint rule set, expressed as a
native [oxlint](https://oxc.rs/docs/guide/usage/linter) configuration. It
supersedes [`@pagopa/eslint-config`](./eslint-config.md), which is frozen.

:::note

Most rules are **autofixable** - run `oxlint --fix` to automatically fix
formatting and style issues.

:::

## Requirements

The configuration relies on the rule set and the JS plugin support of oxlint
`>= 1.93.0 < 2`, which is a peer dependency.

## Installation

The package is published on GitHub Packages. Log in to that registry, then
install it through pnpm's [`gh:` alias](https://pnpm.io/registries#prefix):

```bash
pnpm login --registry https://npm.pkg.github.com/
pnpm add -D oxlint
pnpm add @pagopa/oxlint-config@gh:latest
```

## Configuration

Create an `.oxlintrc.json` file at the root of your workspace, picking the
variant that matches your test runner.

Vitest is the default, and `base.json` enables the `vitest/*` rules on test
files:

```json
{
  "extends": ["./node_modules/@pagopa/oxlint-config/base.json"],
  "ignorePatterns": ["**/generated/*", "**/dist/**", "**/bin/**"]
}
```

Jest workspaces, React Native projects for instance, extend `base-jest.json`
instead: everything else is identical and only the test overlay changes to the
`jest/*` rules.

```json
{
  "extends": ["./node_modules/@pagopa/oxlint-config/base-jest.json"],
  "ignorePatterns": ["**/generated/*", "**/dist/**", "**/bin/**"]
}
```

Pick one variant per workspace: extending both would enable both rule sets.

`ignorePatterns` in your own file keeps `oxlint --fix` from rewriting generated
code and build output.

:::warning

oxlint only accepts **file paths** in `extends`, not package specifiers, so
`"@pagopa/oxlint-config"` is rejected with
`Unsupported named config ... in extends`.

:::

## Scripts

Replace your lint scripts as follows:

```json
{
  "scripts": {
    "lint": "oxlint --fix",
    "lint:check": "oxlint"
  }
}
```

See the [npm scripts conventions](./npm-scripts.md) for the full naming scheme.

## Migrating from ESLint

[`@pagopa/eslint-config`](./eslint-config.md) keeps working, but it receives no
new rules or fixes. To move a workspace over:

1. Remove the old configuration:
   `pnpm remove @pagopa/eslint-config eslint` and delete `eslint.config.js`.
2. Install oxlint and this package, then add the `.oxlintrc.json` shown above.
3. Point the `lint` scripts at `oxlint`.
4. Review the first run: the rules oxlint cannot express are listed in the
   [configuration README](https://github.com/pagopa/dx/blob/main/packages/oxlint-config/README.md#what-is-not-covered).

## Type-aware rules

Type-aware rules run through a separate backend rather than this configuration.
Install `tsrs` and oxlint picks it up automatically; the rules stay opt-in
through `--type-aware` or `options.typeAware`. Keep ESLint only for rules or
plugins that oxlint cannot replace.
