---
title: "Oxlint"
ring: trial
tags: [typescript, dx, tool]
---

[Oxlint](https://oxc.rs/docs/guide/usage/linter) is a high-performance,
ESLint-compatible linter for JavaScript and TypeScript from the
[Oxc](https://oxc.rs/) compiler stack. It is built for large repositories and
CI, with correctness-focused defaults and a large ruleset covering ESLint core,
TypeScript, React, Jest, Vitest, and related plugins.

Oxlint can replace ESLint or run alongside it during migration, including
type-aware checks and multi-file analysis. Benchmarks report it as substantially
faster than ESLint on large codebases.

We are adopting Oxlint as the successor to [ESLint](./eslint.md) for
JavaScript and TypeScript linting.
[`@pagopa/eslint-config`](https://github.com/pagopa/dx/tree/main/packages/eslint-config)
is frozen at its current version, so new projects should start on Oxlint.

PagoPA's rule set is available as a native Oxlint configuration in
[`@pagopa/oxlint-config`](https://github.com/pagopa/dx/tree/main/packages/oxlint-config),
so adopting it is not about writing rules by hand. The package loads
`eslint-plugin-perfectionist` through `jsPlugins`, is substantially faster than
ESLint on real repositories, and documents the few rules Oxlint cannot express
yet.

## Use cases

- Lint JavaScript and TypeScript in local and CI workflows
- Lint PagoPA projects with `@pagopa/oxlint-config`, faster than the frozen
  `@pagopa/eslint-config`
- Evaluate a faster, ESLint-compatible alternative in large repositories
- Run incrementally next to ESLint while migrating overlapping rules

## Related radar entries

- [ESLint](./eslint.md) — linter being replaced; its PagoPA config is frozen
- [Oxfmt](./oxfmt.md) — companion Oxc formatter, also in trial

## Reference of usage in our organization

https://github.com/search?q=org%3Apagopa+oxlint&type=pullrequests
