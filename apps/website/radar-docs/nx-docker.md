---
title: "@pagopa/nx-docker"
ring: adopt
tags: [typescript, monorepo, containerization, dx, tool]
---

[`@pagopa/nx-docker`](https://www.npmjs.com/package/@pagopa/nx-docker) is the DX
Nx plugin that infers `docker:build`, `docker:push`, and `docker:run` targets for
every project with a `Dockerfile`, regardless of language or framework. It
resolves the build context and `--file` automatically, adds OCI image labels,
applies reproducible build flags, and computes image tags with feature parity to
`docker/metadata-action` (short sha, branch ref, semver, `latest`).

## Use cases

- Building and publishing Docker images from an Nx monorepo without
  hand-writing `docker:build`/`docker:push` targets per project
- Reusing the DX tag strategy and OCI metadata conventions across services
- Publishing release images through the custom `nx-release-publish` executor,
  which pushes the primary semver tag and its aliases
- Running the same inferred targets locally and in CI, with multi-platform
  builds
- Managing image releases with `nx release`, without the interactive Docker
  versioning prompts of `@nx/docker`

## DX ecosystem

- [Package source](https://github.com/pagopa/dx/tree/main/packages/nx-dx-docker-plugin)
- [Package README](https://github.com/pagopa/dx/blob/main/packages/nx-dx-docker-plugin/README.md)
- [Release Docker images guide](https://dx.pagopa.it/docs/containers/nx-docker-release)
