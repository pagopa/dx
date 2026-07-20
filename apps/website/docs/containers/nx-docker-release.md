---
sidebar_position: 2
---

# Release Docker images with the Nx Docker plugin

This page describes `@pagopa/nx-dx-docker-plugin`, the Nx plugin that infers
`docker:build` and `docker:push` targets for every project with a `Dockerfile`,
regardless of its language or framework.

## When to use this guide

Use this guide if your repository:

- is an Nx monorepo that publishes one or more Docker images
- wants Docker build/push targets to be inferred automatically, without
  hand-writing `docker:build`/`docker:push` targets per project
- wants image tags computed with feature parity to `docker/metadata-action`
  (short sha, branch ref, semver, `latest`)
- prefers DX conventions and inferred metadata over workspace-specific plugin
  configuration

## Why not `@nx/docker`'s release configuration alone

`@nx/docker` provides Nx Release integration and the `docker:run` convenience
target, but its generated build and publish targets do not provide the full OCI
metadata and tag aliases required by DX repositories.

`@pagopa/nx-dx-docker-plugin` owns `docker:build` and `docker:push`, adding OCI
labels and annotations, reproducible build flags, multi-platform builds, and the
DX tag strategy. For projects configured with
`nx.release.docker.repositoryName`, it also replaces the Docker release
publisher so a release pushes the primary semver tag and its aliases.

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
      "plugin": "@pagopa/nx-dx-docker-plugin"
    }
  ]
}
```

Plugin order matters: register the DX plugin after `@nx/docker` so its inferred
`docker:build` target wins.

While no options are strictly required since they all have default values, they
can still be fully customized when the inferred DX conventions do not fit. The
plugin:

- uses fixed `docker:build` and `docker:push` target names
- reads the default branch from `defaultBase`, falling back to `main`
- reads the registry from `release.docker.registryUrl`, falling back to
  `ghcr.io`
- derives repository name and URL from Git `origin`, falling back to the root
  package name and PagoPA organization convention
- defaults OCI authors to `PagoPA`
- builds for `linux/amd64,linux/arm64`

Workspace plugin options configure OCI metadata shared by every inferred target:

```json
{
  "plugin": "@pagopa/nx-dx-docker-plugin",
  "options": {
    "imageAuthors": "Custom Team",
    "imageNamePrefix": "custom/repository",
    "imageUrl": "https://example.com/custom/repository"
  }
}
```

## Generated targets

For every project with a `Dockerfile`, the plugin infers:

- **`docker:build`** — builds the image, tagging it with the strategy described
  below
- **`docker:push`** — pushes the built tags to the configured `registry`

Application compilation and packaging stay inside the Dockerfile. The plugin
does not assume Node.js, pnpm, or any application framework.

Run them like any other Nx target:

```bash
pnpm nx run my-project:docker:build
pnpm nx run my-project:docker:push
```

When running inside a GitHub Actions job, `docker:build`, `docker:push` and
`nx-release-publish` also report pushed image tags — or build/push failures — to
the job summary (`GITHUB_STEP_SUMMARY`).

## Image name and per-project overrides

By default the image name is `{registry}/{imageNamePrefix}/{image-slug}`, where
`image-slug` is the project's `package.json` `name`, normalized for OCI image
names, or a path-derived slug for projects without a `package.json`. Npm scopes
are retained: `@team-a/api` becomes `team-a-api` and `@team-b/api` becomes
`team-b-api`. Projects with the same unscoped name therefore publish to distinct
repositories.

Use `nx.docker` for project-specific Docker build and push settings:

```json
{
  "nx": {
    "docker": {
      "repositoryName": "pagopa/my-image-name",
      "contextPath": ".",
      "dockerfilePath": "apps/my-app/Dockerfile",
      "platform": "linux/amd64"
    }
  }
}
```

`repositoryName` pins the image repository; `contextPath` and `dockerfilePath`
are workspace-relative; `platform` is passed directly to `docker buildx
--platform`. All four values are optional.

`nx.release.docker.repositoryName` has a separate Nx Release meaning: it
replaces the project's `nx-release-publish` target with Docker publishing. Use
it only for projects that publish Docker images through Nx Release and do not
need the default npm publisher. Projects that publish both an npm package and a
Docker image should configure `nx.docker.repositoryName` and publish the image
from a release-tag workflow.

## Nx Release configuration

Use the semantic version produced by Nx version actions as the Docker version:

```json
{
  "release": {
    "docker": {
      "registryUrl": "ghcr.io",
      "versionSchemes": {
        "production": "{versionActionsVersion}"
      }
    }
  }
}
```

This keeps Git release tags, package versions, and Docker image versions
aligned.

## Tag strategy

Every CI build gets a `sha-<short>` tag and a slugified branch-ref tag, plus
`latest` on the default branch. A semantic release publishes:

- full version, for example `1.4.2`
- minor alias, for example `1.4`
- major alias, for example `1` (omitted for `0.x` releases)
- `latest` when the version is the highest release for the project

A prerelease, such as `1.4.2-rc.1`, publishes only its complete prerelease tag.
It never updates the stable major, minor, or `latest` aliases.

This mirrors `docker/metadata-action`'s default `flavor: latest=auto`, using
local project release tags as source of truth.

## Scoping the release-version Docker build to selected projects

`nx release version` runs `docker:build` for every affected project through Nx's
own `preVersionCommand` hook, but doesn't forward whatever
`--projects`/`--groups` filter was passed to `nx release version` — so by
default a release build always falls back to `nx affected`. To scope it to
specific projects instead (e.g. when testing a single project's release
locally), wire the plugin's `docker-prebuild` script into your `nx.json`:

```jsonc
{
  "release": {
    "docker": {
      "preVersionCommand": "node ./node_modules/@pagopa/nx-dx-docker-plugin/dist/docker-prebuild.js",
    },
  },
}
```

Then export `NX_RELEASE_DOCKER_PROJECTS` (a comma/space-separated list of
project names or patterns) alongside `--projects` when invoking the release:

```bash
NX_RELEASE_DOCKER_PROJECTS=my-project \
  pnpm exec nx release version --projects=my-project --dry-run
```

## Installing in another repository

```bash
pnpm add -D @pagopa/nx-dx-docker-plugin
```

After installing, register the plugin in your own `nx.json` exactly as shown in
[nx.json configuration](#nxjson-configuration) above.

## Related documentation

- [Building Docker Images](./docker-image-build.md)
- [Automate versioning and publishing with Nx](../pipelines/nx-release.md)
