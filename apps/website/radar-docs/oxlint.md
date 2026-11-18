---
title: "Oxlint"
ring: adopt
tags: [typescript, dx, tool]
---

[Oxlint](https://oxc.rs/docs/guide/usage/linter) is a high-performance,
ESLint-compatible linter for JavaScript and TypeScript from the
[Oxc](https://oxc.rs/) compiler stack. It is built for large repositories and
CI, with correctness-focused defaults and a large ruleset covering ESLint core,
TypeScript, React, Jest, Vitest, and related plugins.

Oxlint replaces ESLint for JavaScript and TypeScript linting. It covers the
ESLint core, TypeScript, React, Jest, and Vitest rules, adds multi-file
analysis, and runs at a speed ESLint cannot match on large codebases; a plugin
with no Oxlint equivalent still calls for a minimal ESLint setup next to it. It
can also run next to ESLint while overlapping rules are migrated.

[Type-aware rules](https://oxc.rs/docs/guide/usage/linter/type-aware) run
through a separate backend: prefer `tsrs`, the Rust port of the TypeScript
compiler, which Oxlint picks up automatically once installed. It drops in for
the Go-based backend, and
[Oxc reports](https://oxc.rs/blog/2026-11-17-faster-type-aware-linting-with-tsrs)
up to 5 times its speed with roughly 70% less peak memory.

We are adopting Oxlint as the successor to [ESLint](./eslint.md), which moved to
`hold`. There is no grace period: new projects start on Oxlint, and existing
projects replace `eslint --fix` with `oxlint --fix` as they go, since
[`@pagopa/eslint-config`](https://github.com/pagopa/dx/tree/main/packages/eslint-config)
is frozen.

PagoPA's rule set is available as a native Oxlint configuration in
[`@pagopa/oxlint-config`](./pagopa-oxlint-config.md), so adopting it is not about
writing rules by hand. The package loads `eslint-plugin-perfectionist` through
`jsPlugins`, is substantially faster than ESLint on real repositories, and
documents the few rules Oxlint cannot express yet.

## Use cases

- Lint JavaScript and TypeScript in local and CI workflows
- Run type-aware rules through `tsrs` instead of typescript-eslint
- Lint PagoPA projects with `@pagopa/oxlint-config`, faster than the frozen
  `@pagopa/eslint-config`
- Replace a slower, ESLint-compatible linter in large repositories
- Run incrementally next to ESLint while migrating overlapping rules

## Related radar entries

- [@pagopa/oxlint-config](./pagopa-oxlint-config.md) — the DX configuration new
  projects start from
- [ESLint](./eslint.md) — linter being replaced; now in hold
- [Oxfmt](./oxfmt.md) — companion Oxc formatter

## Reference of usage in our organization

https://github.com/search?q=org%3Apagopa+oxlint&type=pullrequests
