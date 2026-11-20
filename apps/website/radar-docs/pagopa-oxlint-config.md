---
title: "@pagopa/oxlint-config"
ring: adopt
tags: [typescript, javascript, dx, tool]
---

[`@pagopa/oxlint-config`](https://github.com/pagopa/dx/pkgs/npm/oxlint-config)
is PagoPA's shared [Oxlint](./oxlint.md) configuration. It expresses the DX
lint baseline as native Oxlint rules, so a workspace can adopt the same rule set
by installing one package, and it supersedes
[`@pagopa/eslint-config`](./pagopa-eslint-config.md), which moved to `hold`.

The package ships two JSON configurations: `base.json` for [Vitest](/radar/vitest)
workspaces and `base-jest.json` for Jest ones. Oxlint only accepts file paths in
`extends`, so a workspace references the configuration through its installed
path instead of a package specifier.

## Use cases

- Enforcing a consistent set of lint rules across TypeScript and JavaScript
  repositories
- Adopting Oxlint without rewriting the DX rule set by hand
- Linting a workspace substantially faster than with the frozen ESLint
  configuration
- Sharing one baseline between a workspace, its packages, and its CI checks

## DX ecosystem

The package is published on GitHub Packages, not on npmjs.com: install it
through the `gh:` alias after logging in to that registry.

- [GitHub Packages page](https://github.com/pagopa/dx/pkgs/npm/oxlint-config)
- [Package source](https://github.com/pagopa/dx/tree/main/packages/oxlint-config)
- [Package documentation](https://github.com/pagopa/dx/blob/main/packages/oxlint-config/README.md)

## Reference of usage in our organization

- [Organization-wide usage search](https://github.com/search?q=org%3Apagopa+%22%40pagopa%2Foxlint-config%22&type=code)
