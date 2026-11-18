---
title: "ESLint"
ring: hold
tags: [typescript, dx, tool]
---

While [ESLint](https://eslint.org/) has been the reference linter for JavaScript
and TypeScript for years, we no longer recommend it for new projects and we are
migrating existing ones.

## Reasons:

1. **Superseded:** [Oxlint](./oxlint.md) is our `adopt` linter, with no grace
   period. New projects start on Oxlint and existing ones migrate as they go.

2. **Slower:** Oxlint is built on [Oxc](https://oxc.rs/) and reports it as
   substantially faster than ESLint on large codebases, which matters in local
   hooks and CI.

3. **Migration is small:** Oxlint is ESLint-compatible and covers ESLint core,
   TypeScript, React, Jest, and Vitest rules, so `eslint --fix` becomes
   `oxlint --fix`. Our rule set already ships as a native Oxlint configuration:
   see [`@pagopa/oxlint-config`](./pagopa-oxlint-config.md).

4. **Config frozen:** [`@pagopa/eslint-config`](./pagopa-eslint-config.md) is
   no longer maintained. Its published version stays installable for
   repositories that have not migrated yet, but it receives no new rules or
   fixes.

## Why not keep both:

ESLint keeps working, but running two linters over the same files doubles the
maintenance and the CI time. Keep ESLint only while a plugin you depend on has
no Oxlint equivalent, and point it at the DX baseline while you do.

## Reference of usage in our organization

ESLint is still found in several TypeScript projects while they migrate:

https://github.com/search?q=org%3Apagopa+%22eslint%22+path%3A**%2Fpackage.json&type=code
