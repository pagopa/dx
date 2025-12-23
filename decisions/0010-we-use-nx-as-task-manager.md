# We use Nx as task manager

Date: 2025-12-23

## Status

Accepted

## Context

Following the initial adoption of Turborepo as described in ADR 0002, our
monorepo has evolved to include multiple programming languages (TypeScript, Go,
Terraform) and more complex task orchestration needs. Turborepo, while effective
for JavaScript-focused monorepos, lacks native support for multi-language
projects and top-level task definitions.

We require a task manager that:

- Supports multi-language monorepos (TypeScript, Go, Terraform, etc.)
- Allows defining tasks at the top level for better organization

## Decision

We have switched to Nx as our task manager, superseding the previous decision to
use Turborepo (ADR 0002). Nx's multi-language support and flexible task
definition capabilities better align with our monorepo's evolution.

Nx allows us to:

- Define tasks at the top level in nx.json
- Support projects in multiple languages through its extensible plugin system
- Maintain efficient caching and parallel execution
- Integrate with our existing pnpm workspace setup
