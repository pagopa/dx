# We use pnpm as package manager

Date: 2025-12-23

## Status

Accepted

## Context

Previously, we adopted Yarn with Plug'n'Play (PnP) as our package manager to
address issues with npm workspaces in monorepos, particularly the flat
`node_modules` structure that caused deployment problems. Yarn PnP provided
efficient dependency resolution, global caching, and detection of ghost
dependencies.

However, Yarn PnP requires maintaining an up-to-date SDK, which can be
cumbersome and impact developer experience (DX). Additionally, while effective,
it introduced complexity in setup and occasional friction in CI/CD pipelines.

pnpm offers similar benefits to Yarn PnP—efficient handling of monorepos,
detection of ghost dependencies, and a global cache for dependency reuse—without
the need to keep an SDK updated. This results in a smoother DX and simpler
maintenance.

## Decision

We have switched to pnpm as our package manager. It handles ghost dependencies
effectively, supports monorepos well, and provides better developer experience
compared to Yarn PnP by eliminating the SDK update requirement.

This decision amends our previous choices in ADR-0001 (using Yarn) and ADR-0005
(using Yarn with PnP).

## Change History

- 2025-12-23: Adopted pnpm as package manager, superseding ADR-0001 and ADR-0005
  due to better DX and reduced maintenance overhead.
