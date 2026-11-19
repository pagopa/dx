---
title: "@pagopa/eslint-config"
ring: hold
tags: [typescript, javascript, dx, tool]
---

[`@pagopa/eslint-config`](https://www.npmjs.com/package/@pagopa/eslint-config)
is PagoPA's shared ESLint flat config, published as the default export of the
package. It bundles the rules, plugins, and presets the DX team recommends, and
supports both ESLint 9 and ESLint 10.

The package is no longer maintained. Its published version keeps working and
stays installable for repositories that have not migrated yet, but the rule set
is frozen: no new rules, plugin upgrades, or fixes land here. Those live in
[`@pagopa/oxlint-config`](./pagopa-oxlint-config.md), the native
[Oxlint](./oxlint.md) configuration that supersedes it.

## Use cases

- Keeping an existing ESLint setup on the DX baseline while the
  [Oxlint](./oxlint.md) migration is in progress
- Reusing the DX-recommended rule set in a repository pinned to ESLint because a
  plugin it depends on has no Oxlint equivalent yet
- Getting test-runner-aware rules out of the box, with the default entry point
  for [Vitest](/radar/vitest) and a dedicated subpath for Jest

## DX ecosystem

- [Package source](https://github.com/pagopa/dx/tree/main/packages/eslint-config)
- [Package documentation](https://github.com/pagopa/dx/blob/main/packages/eslint-config/README.md)
- [Replacement: @pagopa/oxlint-config](./pagopa-oxlint-config.md)

## Reference of usage in our organization

- [Organization-wide usage search](https://github.com/search?q=org%3Apagopa+%22%40pagopa%2Feslint-config%22&type=code)
