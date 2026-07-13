# @pagopa/nx-dx-docker-plugin

TypeScript Nx plugin that generates `docker:build`/`docker:push` (and
`package`) targets for every project with a `Dockerfile`, reaching feature
parity with `docker/metadata-action`: full OCI labels/annotations, a
multi-tag strategy (branch ref, short sha, semver + `latest`), and
provenance/reproducibility flags.

`docker:build`/`docker:push` are backed by this plugin's own
`@pagopa/nx-dx-docker-plugin:build`/`:push` Nx executors (see
`src/executors/docker-build`/`src/executors/docker-push` and
`src/docker-run.ts` for the shared build/push logic); `@nx/docker` remains
the official base plugin (registered **before** this one in `nx.json`) for
the `docker:run` convenience target. See `src/docker-targets.ts` for the
rationale on why this plugin owns the whole `docker:build`/`docker:push`
targets instead of layering on top of `@nx/docker`'s own.

Projects using the *official* Nx Docker release flow
(`nx.release.docker.repositoryName` in `package.json`) also get their
`nx-release-publish` target overridden with this plugin's
`@pagopa/nx-dx-docker-plugin:release-publish` executor, which pushes the
same alias tags (major/major.minor/`latest`) on top of `@nx/docker`'s own
version-only tag — see `src/executors/release-publish`.

## Installation

```bash
pnpm add -D @pagopa/nx-dx-docker-plugin
```

Then register it in your `nx.json` `plugins` array (see [Options](#options)
below).

## Options

See `src/options.ts` (zod-validated) for the full list of options and the
rationale behind which ones are required, auto-detected, or defaulted.

- `imageAuthors` is always required.
- `imageNamePrefix`/`imageUrl` are auto-detected from the workspace's git
  `origin` remote when possible, otherwise required.
- `buildTargetName`, `defaultBranch`, `jsBuildTargetName`,
  `packageTargetName`, `platform`, `pushTargetName` and `registry` default
  to `docker:build`, `main`, `build`, `package`,
  `linux/amd64,linux/arm64`, `docker:push` and `ghcr.io`.

## Per-project Docker build layout

Generated targets run Docker from the workspace root. By default they use
the workspace root (`.`) as build context and `{projectRoot}/Dockerfile` as
the Dockerfile. Override either value in a project's `package.json` when a
Dockerfile needs a narrower context or lives outside the project root:

```jsonc
{
  "nx": {
    "docker": {
      "contextPath": "apps/my-app",
      "dockerfilePath": "apps/my-app/docker/Dockerfile.release",
      "repositoryName": "my-app"
    }
  }
}
```

Both paths are workspace-relative. The same options can be supplied for a
single invocation, for example `nx run my-app:docker:build --contextPath=apps/my-app`.

Projects without a `package.json` can configure the generated target directly
in `project.json` instead:

```jsonc
{
  "targets": {
    "docker:build": {
      "options": {
        "contextPath": "infra/modules/example/tests/apps/probe",
        "dockerfilePath": "infra/modules/example/tests/apps/probe/Dockerfile"
      }
    }
  }
}
```

## Tag strategy

See `src/docker-image.ts`'s `computeImageTags` for the full tag strategy
(mirrors `docker/metadata-action`'s default `flavor: latest=auto`).

## CI job summary

In a GitHub Actions job (`GITHUB_STEP_SUMMARY` set), `docker:build`,
`docker:push` and `nx-release-publish` report pushed image tags and
build/push failures to the job summary — see `src/github-summary.ts`.

## Scoping the release-version Docker build to selected projects

`nx release version` runs `docker:build` for every affected project through
Nx's own `preVersionCommand` hook, but doesn't forward whatever
`--projects`/`--groups` filter was passed to `nx release version` — so by
default a release build always falls back to `nx affected`. To scope it to
specific projects instead (e.g. when testing a single project's release
locally), wire this plugin's `src/docker-prebuild.ts` into your `nx.json`:

```jsonc
{
  "release": {
    "docker": {
      "preVersionCommand": "node ./node_modules/@pagopa/nx-dx-docker-plugin/dist/docker-prebuild.js"
    }
  }
}
```

Then export `NX_RELEASE_DOCKER_PROJECTS` (a comma/space-separated list of
project names or patterns) alongside `--projects` when invoking the
release:

```bash
NX_RELEASE_DOCKER_PROJECTS=dockerapp3 \
  pnpm exec nx release version --projects=dockerapp3 --dry-run
```

