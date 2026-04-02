---
title: "Turborepo"
ring: hold
tags: [typescript, monorepo, dx, tool]
---

[Turborepo](https://turbo.build/) is a tool that allows you to manage multiple
packages in a single repository. It provides a monorepo-like experience without
the overhead of a full monorepo setup. Turborepo is designed to work with
TypeScript and JavaScript projects and offers features like shared dependencies,
cross-package testing, and more.

## Use cases

Use Turborepo only when your scope is mostly JavaScript/TypeScript and you do
not need broader polyglot orchestration.

For new monorepo initiatives, prefer [Nx](./nx.md). We put Turborepo on hold in
favor of Nx because we need stronger support beyond JS/TS, including Terraform
and Java workloads in the same workspace.

## Reference of usage in our organization

https://github.com/search?q=org%3Apagopa+path%3A**%2Fturbo.json&type=code
