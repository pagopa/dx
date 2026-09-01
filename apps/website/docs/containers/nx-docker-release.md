---
sidebar_position: 2
---

# Release Docker images with the Nx Docker plugin

This page describes `@pagopa/nx-dx-docker-plugin`, the Nx plugin that infers
`docker:build`, `docker:push`, and `docker:run` targets for every project with a
`Dockerfile`, regardless of its language or framework.

## When to use this guide

Use this guide if your repository:

- is an Nx monorepo that publishes one or more Docker images
- wants Docker build/push targets to be inferred automatically, without
  hand-writing `docker:build`/`docker:push` targets per project
- wants image tags computed with feature parity to `docker/metadata-action`
  (short sha, branch ref, semver, `latest`)
- prefers DX conventions and inferred metadata over workspace-specific plugin
  configuration

## Why use the DX plugin alone

`@pagopa/nx-dx-docker-plugin` owns every inferred Docker target. It adds OCI
labels and annotations, reproducible build flags, multi-platform builds, the DX
tag strategy, and a local `docker:run` workflow.

Do not register `@nx/docker` alongside this plugin. Its Docker Release
integration treats Docker targets as release-versioning inputs and can prompt
for an interactive `production` or `hotfix` scheme. The DX plugin uses
`container-image` target metadata instead, so `nx release` does not enter that
interactive flow. For projects configured with
`nx.release.docker.repositoryName`, the plugin adds a custom publisher that
pushes the primary semver tag and its aliases.

## nx.json configuration

Install and configure the plugin with:

```bash
pnpm nx add @pagopa/nx-dx-docker-plugin
```

The generator registers `@pagopa/nx-dx-docker-plugin`. For a manual
configuration, use:

```json
{
  "plugins": [
    {
      "plugin": "@pagopa/nx-dx-docker-plugin",
      "options": {
        "imageAuthors": "Custom Team",
        "imageNamePrefix": "custom/repository",
        "imageUrl": "https://example.com/custom/repository"
      }
    }
  ]
}
```

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

The optional `imageAuthors`, `imageNamePrefix`, and `imageUrl` settings shown
above configure OCI metadata shared by every inferred target.

## Generated targets

For every project with a `Dockerfile`, the plugin infers:

- **`docker:build`** — builds the image, tagging it with the strategy described
  below
- **`docker:push`** — pushes the built tags to the configured `registry`
- **`docker:run`** — builds the image if needed, then runs its local untagged
  alias

Application compilation and packaging stay inside the Dockerfile. The plugin
does not assume Node.js, pnpm, or any application framework.

Run them like any other Nx target:

```bash
pnpm nx run my-project:docker:build
pnpm nx run my-project:docker:push
pnpm nx run my-project:docker:run -- --port 3000:3000
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
are workspace-relative; `platform` is passed directly to
`docker buildx --platform`. All four values are optional.

`nx.release.docker.repositoryName` has a separate Nx Release meaning: it enables
Docker release publishing for the project. For a project with a `package.json`,
Nx also infers its JavaScript `nx-release-publish` target; add a minimal
`project.json` override to select the DX Docker publisher:

```json
{
  "targets": {
    "nx-release-publish": {
      "executor": "@pagopa/nx-dx-docker-plugin:release-publish"
    }
  }
}
```

The publisher reuses the fully resolved `docker:build` options, so do not repeat
the image name, build context, Dockerfile, platform, or OCI metadata in this
target. Use this setup only for projects that publish Docker images through Nx
Release and do not need the default npm publisher. Projects that publish both an
npm package and a Docker image should configure `nx.docker.repositoryName` and
publish the image from a release-tag workflow.

### Container-only projects

For a Docker-only project without `package.json`, keep its durable release
version in `project.json` and use the plugin's VersionActions implementation:

```json
{
  "metadata": {
    "docker": {
      "contextPath": "containers/my-container",
      "platform": "linux/amd64",
      "repositoryName": "pagopa/my-container"
    },
    "version": "0.0.2"
  },
  "release": {
    "version": {
      "currentVersionResolver": "disk",
      "versionActions": "@pagopa/nx-dx-docker-plugin/release/version-actions"
    }
  }
}
```

`metadata.docker` accepts the same `contextPath`, `dockerfilePath`, and
`platform` build overrides as `nx.docker`. The plugin infers
`nx-release-publish` from `metadata.docker.repositoryName`. `pnpm nx release`
updates `metadata.version`; the publish step builds and pushes the image using
that version. No package manifest or temporary version file is needed.

## Nx Release configuration

Do not configure `release.docker.versionSchemes` or an `@nx/docker` plugin for
this flow. The DX publisher reads the version produced by Nx from the project's
`package.json`, or `project.json` `metadata.version` for a container-only
project, then derives the Docker aliases itself. This keeps Git release tags,
package versions, and Docker image versions aligned without interactive scheme
selection.

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
