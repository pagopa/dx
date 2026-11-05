---
title: "@pagopa/eslint-config"
ring: adopt
tags: [typescript, javascript, dx, tool]
---

[`@pagopa/eslint-config`](https://www.npmjs.com/package/@pagopa/eslint-config)
is PagoPA's shared ESLint flat config, published as the default export of the
package. It bundles the rules, plugins, and presets the DX team recommends, and
supports both ESLint 9 and ESLint 10, so teams can adopt a consistent linting
baseline by installing one package instead of maintaining their own
configuration.

## Use cases

- Enforcing a consistent set of lint rules across TypeScript and JavaScript
  repositories
- Reusing the DX-recommended rule set in generated workspaces and new projects
  instead of copying configuration between repositories
- Getting test-runner-aware rules out of the box, with the default entry point
  for [Vitest](/radar/vitest) and a dedicated subpath for Jest

## DX ecosystem

- [Package source](https://github.com/pagopa/dx/tree/main/packages/eslint-config)
- [Package documentation](https://github.com/pagopa/dx/blob/main/packages/eslint-config/README.md)

## Reference of usage in our organization

- [Organization-wide usage search](https://github.com/search?q=org%3Apagopa+%22%40pagopa%2Feslint-config%22&type=code)
