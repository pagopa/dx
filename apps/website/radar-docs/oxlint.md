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
so the trial is no longer about writing rules by hand. The package mirrors
`@pagopa/eslint-config`, loads `eslint-plugin-perfectionist` through
`jsPlugins`, and is substantially faster than ESLint on real repositories. Its
tests keep it aligned with the ESLint preset and document the rules Oxlint
cannot express yet.

## Use cases

- Lint JavaScript and TypeScript in local and CI workflows
- Lint PagoPA projects with `@pagopa/oxlint-config` and get the same rule set as
  `@pagopa/eslint-config`, faster
- Evaluate a faster, ESLint-compatible alternative in large repositories
- Run incrementally next to ESLint while migrating overlapping rules

## Related radar entries

- [ESLint](./eslint.md) — current adopt linter
- [Oxfmt](./oxfmt.md) — companion Oxc formatter, also in trial

## Reference of usage in our organization

https://github.com/search?q=org%3Apagopa+oxlint&type=pullrequests
