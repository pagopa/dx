---
sidebar_position: 12
---

# Release Docker images with Nx

This page complements
[Automate versioning and publishing with Nx](./nx-release.md) and focuses on
repositories that release Docker images with Nx in the PagoPA organization.

## When to use this guide

Use this guide if your repository:

- uses [Nx Release](https://nx.dev/features/manage-releases) with version plans
- publishes one or more Docker images
- uses the DX release workflow based on `release-v2.yaml`

## Prerequisites

- A working Nx release setup (see [Nx Release](./nx-release.md))
- Docker projects discoverable by Nx (for example via `@nx/docker` plugin)
- A registry target (for example `ghcr.io`)

For GitHub Container Registry (GHCR), ensure your workflow job includes:

```yaml
permissions:
  contents: write
  id-token: write
  pull-requests: write
  packages: write
```

## Recommended nx.json Docker configuration

Add Docker configuration under `release`:

```json
{
  "release": {
    "versionPlans": true,
    "projectsRelationship": "independent",
    "docker": {
      "registryUrl": "ghcr.io",
      "versionSchemes": {
        "production": "{versionActionsVersion}"
      }
    }
  }
}
```

### Why `{versionActionsVersion}`

Using `{versionActionsVersion}` aligns Docker image tags with the version
calculated by Nx version actions, keeping package and image releases coherent.

## Project-level Docker release configuration

Define Docker release metadata for each Docker project:

- `release.docker.repositoryName` (required)
- `release.docker.registryUrl` (optional override)

If `release.docker.registryUrl` is not set at project level, Nx uses
`release.docker.registryUrl` from workspace `nx.json` (default `ghcr.io` in DX
setup).

If your project uses `package.json`:

```json
{
  "nx": {
    "targets": {
      "nx-release-publish": {
        "executor": "nx:run-commands",
        "options": {
          "command": "pnpm --filter @pagopa/nx-docker-release-tools exec dx-docker-release-publish-with-latest --project-root {projectRoot}"
        }
      }
    },
    "release": {
      "docker": {
        "repositoryName": "pagopa/my-service",
        "registryUrl": "ghcr.io"
      }
    }
  }
}
```

If your project uses `project.json`:

```json
{
  "targets": {
    "nx-release-publish": {
      "executor": "nx:run-commands",
      "options": {
        "command": "pnpm --filter @pagopa/nx-docker-release-tools exec dx-docker-release-publish-with-latest --project-root {projectRoot}"
      }
    }
  },
  "release": {
    "docker": {
      "repositoryName": "pagopa/my-service",
      "registryUrl": "ghcr.io"
    }
  }
}
```

## Local validation flow

Before pushing release changes, run:

```bash
pnpm nx release plan
pnpm nx release --dry-run
```

For a specific Docker project, also validate build target resolution:

```bash
pnpm nx run my-project:docker:build
```

## Troubleshooting

### `invalid reference format` with a trailing colon

Example:

```text
docker tag apps-my-service ghcr.io/pagopa/my-service:
```

Cause:

- Docker version resolves to an empty value
- common when `versionSchemes.production` uses `{versionActionsVersion}` and no
  effective version value is produced for that project in your local run

Fix:

1. Ensure the project is covered by a version plan
2. Re-run `pnpm nx release --dry-run` to verify version resolution
3. Re-run the release workflow locally

### `Could not find tmp/<projectRoot>/.docker-version`

Cause:

- Docker publish step runs without a successful Docker version/tag step

Fix:

1. Ensure release version step executed for the project
2. Ensure Docker versioning was not skipped due to prior errors

### `lstat ... no such file or directory` during Docker build

Cause:

- custom `cwd` plus root-relative Dockerfile argument mismatch

Fix:

1. If using custom `cwd`, set Dockerfile path coherently (for example
   `-f Dockerfile` when Dockerfile is inside that `cwd`)
2. Re-run project Docker build target directly

## Related documentation

- [Automate versioning and publishing with Nx](./nx-release.md)
- [Version plan guide](../github/pull-requests/version-plan.md)
