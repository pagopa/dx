---
title: "Changeset"
ring: hold
tags: [typescript, monorepo, frontend, backend, dx, tool]
---

[Changeset](https://github.com/changesets/changesets)

Changeset is a tool to manage your versioning and changelogs with a focus on
monorepos. It is designed to work with any language, any package manager, and
any codebase.

## Use cases

Changeset helps with:

- Changelog generation
- Versioning of software artifacts
- Publishing of packages
- GitHub releases

## Why we put Changeset on hold

We are consolidating release automation on
[`nx release`](https://nx.dev/features/manage-releases), which runs versioning,
changelog generation, and publishing inside the same workspace graph we already
use to build, test, and lint. Keeping releases in [Nx](./nx.md) removes a
separate tool and its configuration from the stack, and integrates versioning
with the project graph and affected-based workflows.

For new monorepo initiatives, prefer Nx with its built-in release automation.
Existing repositories should migrate their release pipelines to `nx release`
too.

## Reference of usage in our organization

See https://github.com/search?q=org%3Apagopa+.changeset%2Fconfig.json&type=code
