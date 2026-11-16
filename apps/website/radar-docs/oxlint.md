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

We are trialing Oxlint as a possible successor to [ESLint](./eslint.md) for
JavaScript and TypeScript linting. ESLint and
[`@pagopa/eslint-config`](https://github.com/pagopa/dx/tree/main/packages/eslint-config)
remain the current adopt choice until this evaluation is complete.

PagoPA's rule set is available as a native Oxlint configuration in
[`@pagopa/oxlint-config`](https://github.com/pagopa/dx/tree/main/packages/oxlint-config),
so the trial is no longer about writing rules by hand. The package ports 141 of
the 143 rules enabled by `@pagopa/eslint-config` (only `no-octal` and
`no-undef-init` are missing, because Oxlint does not implement them), loads
`eslint-plugin-perfectionist` through `jsPlugins` with identical findings on 20
of its 22 rules, and runs about 3× faster than ESLint on a 500-file benchmark. Two gaps remain before
it can be adopted: type-aware rules need `oxlint-tsgolint` and a TypeScript
version newer than we run today, and there is no Jest flavour of the overlay.

## Use cases

- Lint JavaScript and TypeScript in local and CI workflows
- Lint PagoPA projects with `@pagopa/oxlint-config` and get the same findings as
  `@pagopa/eslint-config`, faster
- Evaluate a faster, ESLint-compatible alternative in large repositories
- Run incrementally next to ESLint while migrating overlapping rules

## Related radar entries

- [ESLint](./eslint.md) — current adopt linter
- [Oxfmt](./oxfmt.md) — companion Oxc formatter, also in trial

## Reference of usage in our organization

https://github.com/search?q=org%3Apagopa+oxlint&type=pullrequests
