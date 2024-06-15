# We use yarn with Plug'n'Play

Date: 2024-04-15

## Status

Accepted

## Context

**Plug'n'Play** is an installation strategy, alternative to the classic
resolution algorithm used by `npm`/`node.js` with `node_modules`, that simplify
working on monorepo and large javascript codebases.

For our use cases, `pnp` has two major advantages over the classic approach:

1. An efficient dependency resolution algorithm and a global cache that allows
   dependency reuse (the developer installs dependencies only once on his
   machine, regardless of how many projects it is used in).

2. Catch _ghost dependencies_ (dependencies that are not listed in
   `package.json`), ensuring that each workspace declares all dependencies it
   uses.

See the documentation for more details https://yarnpkg.com/features/pnp

## Decision

We decided to enable `plug'n'play` with global cache on our yarn setup.
