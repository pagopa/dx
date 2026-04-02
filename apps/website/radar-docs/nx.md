---
title: "Nx"
ring: adopt
tags: [typescript, monorepo, dx, tool]
---

[Nx](https://nx.dev/) is a build system and monorepo platform designed to help
teams build, test, and ship code at scale across different languages and
frameworks.

We put [Turborepo](./turborepo.md) on hold because its core focus is
JavaScript/TypeScript, while we need a broader, polyglot setup. Nx better
supports our direction to run and coordinate workloads beyond
JavaScript/TypeScript, including Terraform and Java, in the same workspace.

## Key capabilities

**Affected commands**: Nx tracks the dependency graph of your workspace and only
runs tasks (build, test, lint, etc.) for projects that are actually affected by
a given change. This dramatically reduces CI times as the repository grows.

**Local computation caching**: Nx caches task outputs locally. Repeated runs of
the same task with the same inputs are instant, restoring outputs from cache
rather than rerunning the computation.

**Plugin ecosystem**: The `@nx/*` plugin family provides first-class
integrations for common tools and frameworks (Node.js, React, Vite, ESLint,
etc.), so projects get consistent, pre-configured targets without boilerplate.

**Dependency graph visualization**: Running `nx graph` renders an interactive
visualization of all projects and their dependencies. This makes it easy to
reason about the blast radius of a change and understand the overall
architecture of the workspace.

**MCP server / AI integration**: Nx ships an MCP server (`@nx/mcp`) and
ready-made agent skills that expose workspace context and best practices to AI
assistants. This helps tools like GitHub Copilot query targets and
configurations, run tasks, and use generators with reliable, workspace-aware
guidance.

**Release automation**: Nx provides `nx release` to automate versioning,
changelog generation, and package publishing across interdependent packages in
your monorepo. It analyzes commit history and dependency changes to determine
version bumps (following semantic versioning), generates changelogs
automatically, and publishes packages. This is a built-in alternative to tools
like [Changeset](./changeset.md) for monorepos using Nx.

## Use cases

- Orchestrating build, test, lint, and typecheck tasks across all packages in a
  monorepo
- Running only affected tasks on pull requests to keep CI fast
- Visualizing and auditing project interdependencies
- Automating version bumps, changelog generation, and package publishing with
  `nx release` across interdependent packages

## Reference of usage in our organization

- https://github.com/pagopa/dx
