---
sidebar_position: 2
---

# Release Docker images with the Nx Docker plugin

This page describes `@pagopa/nx-dx-docker-plugin`, the internal Nx plugin
this repository uses to infer `docker:build`, `docker:push` and `package`
targets for projects with a `Dockerfile`.

## When to use this guide

Use this guide if your repository:

- is an Nx monorepo that publishes one or more Docker images
- wants Docker build/push targets to be inferred automatically, without
  hand-writing `docker:build`/`docker:push` targets per project
- wants image tags computed with feature parity to `docker/metadata-action`
  (short sha, branch ref, semver, `latest`), without depending on the
  official `@nx/docker` release configuration (`release.docker.*` in
  `nx.json`)

## Why not `@nx/docker`'s release configuration alone

`@nx/docker` infers a `docker:build`/`docker:run` target pair, but its
built-in release flow (`release.docker.registryUrl`, project-level
`release.docker.repositoryName`, and its `nx-release-publish` executor)
couples Docker image publishing to Nx Release's version/tag bookkeeping.
That's a good fit when a project's **only** release artifact is a Docker
image, but it gets in the way for projects — like this repository's
`mcpserver` — that publish an npm package via `nx-release-publish` and
**also** want a Docker image built and pushed as a secondary artifact.

`@pagopa/nx-dx-docker-plugin` solves this by owning the full
`docker:build`/`docker:push` target definitions itself (image name, tags,
labels, provenance flags), completely independent of `nx-release-publish`.
`@nx/docker` remains registered for the `docker:run` convenience target.

## nx.json configuration

Register both plugins, in this order (`@nx/docker` first, then
`@pagopa/nx-dx-docker-plugin`):

```json
{
  "plugins": [
    {
      "plugin": "@nx/docker",
      "options": {
        "buildTarget": "docker:build",
        "runTarget": "docker:run"
      }
    },
    {
      "plugin": "@pagopa/nx-dx-docker-plugin",
      "options": {
        "imageAuthors": "PagoPA"
      }
    }
  ]
}
```

Because Nx merges `options.args`/`command` per later-registered-plugin-wins
(not a partial merge), `@pagopa/nx-dx-docker-plugin` must be registered
**after** `@nx/docker` so it fully owns `docker:build`/`docker:push`.

`imageAuthors` (a human-readable legal/org name, e.g. `"PagoPA"`) is the
only option every consumer must set — there's no reliable way to derive it.
`imageNamePrefix`/`imageUrl` are auto-detected from the workspace's git
`origin` remote when it's hosted on `github.com` (this repo's remote
resolves to `pagopa/dx` / `https://github.com/pagopa/dx`); set them
explicitly only for a custom image name prefix or a non-GitHub remote.
`buildTargetName`, `pushTargetName`, `packageTargetName`,
`jsBuildTargetName`, `defaultBranch` and `registry` default to
`docker:build`, `docker:push`, `package`, `build`, `main` and `ghcr.io`
respectively — override them only if your repo deviates from those
conventions. See the package's `README.md` for the full option reference.

## Generated targets

For every project with a `Dockerfile` that also has the configured
`jsBuildTargetName` (`build` by default) and `packageTargetName`
(`package` by default) targets, the plugin infers:

- **`docker:build`** — builds the image, tagging it with the strategy
  described below
- **`docker:push`** — pushes the built tags to the configured `registry`
- **`package`** — a lightweight target consumed by `docker:build`

Run them like any other Nx target:

```bash
pnpm nx run my-project:docker:build
pnpm nx run my-project:docker:push
```

## Image name and per-project overrides

By default the image name is
`{registry}/{imageNamePrefix}/{project-slug}`. To keep a legacy or
otherwise different image name, set `nx.docker.repositoryName` in the
project's `package.json`:

```json
{
  "nx": {
    "docker": {
      "repositoryName": "pagopa/my-legacy-image-name"
    }
  }
}
```

`nx.docker.repositoryName` only overrides the **build/push image name**. It
is deliberately a different field from `nx.release.docker.repositoryName`,
which also changes the `nx-release-publish` executor's behavior for
`@nx/docker`-driven releases — reusing that field for projects that publish
an npm package (like `mcpserver`) would have unintentionally changed how
they publish to npm.

## Tag strategy

Every build gets a `sha-<short>` tag and a slugified branch-ref tag (plus
`latest` on the `defaultBranch`). On a `{projectName}@{version}` release
tag push, the plugin also computes `version`, `major.minor` and `major`
tags (major is skipped for `0.x` releases), plus `latest` when the pushed
version is the highest released so far for the project — mirroring
`docker/metadata-action`'s default `flavor: latest=auto`, but using local
git tags instead of a registry query.

## Installing in another repository

`@pagopa/nx-dx-docker-plugin` is `"private": true` — it isn't published to
an npm registry. Repositories in this monorepo (`dx`) consume it as a
normal pnpm workspace dependency (`"workspace:^"`). An external repository
can install a specific released version straight from this repo's git tag,
using pnpm's [git subdirectory
syntax](https://pnpm.io/package-sources#install-from-a-subdirectory-of-a-git-repository):

```bash
pnpm add "pagopa/dx#@pagopa/nx-dx-docker-plugin@0.1.0&path:/packages/nx-dx-docker-plugin"
```

After installing, register the plugin in your own `nx.json` exactly as
shown in [nx.json configuration](#nxjson-configuration) above.

## Related documentation

- [Building Docker Images](./docker-image-build.md)
- [Automate versioning and publishing with Nx](../pipelines/nx-release.md)
