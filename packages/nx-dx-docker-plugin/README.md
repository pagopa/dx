# @pagopa/nx-dx-docker-plugin

TypeScript Nx plugin that generates `docker:build`/`docker:push` targets for
every project with a `Dockerfile`, regardless of its language or framework,
reaching feature parity with `docker/metadata-action`: full OCI
labels/annotations, a multi-tag strategy (branch ref, short sha, semver +
`latest`), and
provenance/reproducibility flags.

`docker:build`/`docker:push` are backed by this plugin's own
`@pagopa/nx-dx-docker-plugin:build`/`:push` Nx executors (see
`src/executors/docker-build`/`src/executors/docker-push` and
`src/docker-run.ts` for the shared build/push logic); `@nx/docker` remains
the official base plugin (registered **before** this one in `nx.json`) for
the `docker:run` convenience target. See `src/docker-targets.ts` for the
rationale on why this plugin owns the whole `docker:build`/`docker:push`
targets instead of layering on top of `@nx/docker`'s own.

Projects using the _official_ Nx Docker release flow
(`nx.release.docker.repositoryName` in `package.json`) also get their
`nx-release-publish` target overridden with this plugin's
`@pagopa/nx-dx-docker-plugin:release-publish` executor, which pushes the
same alias tags (major/major.minor/`latest`) on top of `@nx/docker`'s own
version-only tag — see `src/executors/release-publish`.

## Installation

```bash
pnpm nx add @pagopa/nx-dx-docker-plugin
```

The generator registers `@nx/docker` and `@pagopa/nx-dx-docker-plugin` in the
required order. To configure an existing installation manually, use:

```jsonc
{
  "plugin": "@pagopa/nx-dx-docker-plugin",
}
```

## Conventions and optional metadata

The plugin requires no workspace-level inputs. It infers repository metadata
from the Git origin or root package name, reads registry/default branch from
`nx.json`, and applies DX conventions for target names and multi-architecture
builds. This keeps standard consumer configuration empty and makes the same
rules apply across repositories.

Only descriptive metadata supports optional overrides: `imageAuthors`
(defaults to `PagoPA`), `imageNamePrefix`, and `imageUrl`. Use them only when
inference or PagoPA conventions do not represent the repository correctly.

## Per-project Docker build layout

Generated targets run Docker from the workspace root. By default they use
the workspace root (`.`) as build context, `{projectRoot}/Dockerfile` as
the Dockerfile, and build for `linux/amd64,linux/arm64`. Override these values
in a project's `package.json` when its Docker build differs:

```jsonc
{
  "nx": {
    "docker": {
      "contextPath": "apps/my-app",
      "dockerfilePath": "apps/my-app/docker/Dockerfile.release",
      "platform": "linux/amd64",
    },
  },
}
```

Both paths are workspace-relative. `platform` accepts the comma-separated value
passed to `docker buildx --platform`. The same options can be supplied for a
single invocation, for example
`nx run my-app:docker:build --platform=linux/amd64`.

Projects without a `package.json` can configure the generated target directly
in `project.json` instead:

```jsonc
{
  "targets": {
    "docker:build": {
      "options": {
        "contextPath": "infra/modules/example/tests/apps/probe",
        "dockerfilePath": "infra/modules/example/tests/apps/probe/Dockerfile",
      },
    },
  },
}
```

## Image repository

For projects released through Nx Docker, configure the image repository once
using Nx's standard `nx.release.docker.repositoryName` setting:

```jsonc
{
  "nx": {
    "release": {
      "docker": {
        "repositoryName": "pagopa/my-app",
      },
    },
  },
}
```

The plugin reuses this value for build, push, and release publishing. Use
`nx.docker.repositoryName` only as an exceptional build-only override when the
build image must differ from the released image.

If another Nx plugin also infers `nx-release-publish` for the same project (for
example `@nx/js` for a publishable npm package), select the Docker publisher
explicitly. The DX plugin still supplies project-specific options:

```jsonc
{
  "nx": {
    "targets": {
      "nx-release-publish": {
        "executor": "@pagopa/nx-dx-docker-plugin:release-publish",
      },
    },
  },
}
```

## Tag strategy

See `src/docker-image.ts`'s `computeImageTags` for the full tag strategy
(mirrors `docker/metadata-action`'s default `flavor: latest=auto`). `latest`
and major/minor aliases are emitted only for stable SemVer releases;
prereleases such as `1.2.3-rc.1` receive only their complete prerelease tag.

## CI job summary

In a GitHub Actions job (`GITHUB_STEP_SUMMARY` set), `docker:build`,
`docker:push` and `nx-release-publish` report pushed image tags and
build/push failures to the job summary — see `src/github-summary.ts`.

## FAQ

### Why does the plugin own `docker:build` and `docker:push`?

DX repositories need complete OCI metadata, reproducibility flags,
multi-platform builds, and the same branch/SHA/semver aliases produced by
`docker/metadata-action`. Extending the targets inferred by `@nx/docker` is
fragile because Nx replaces colliding target options instead of deeply merging
them. Dedicated targets provide one predictable source of truth.

### Why is `@nx/docker` still registered?

It remains the official source of the `docker:run` convenience target and Nx
Docker version flow. The DX plugin only replaces behavior where DX conventions
require additional metadata or tags.

### Why are tags and OCI metadata computed at task runtime?

Nx caches inferred project targets using file inputs, not CI environment
variables. Computing tags, timestamps, or GitHub metadata while creating the
project graph could therefore reuse stale values. Executors recompute them for
every build or push.

### Why is there a custom `nx-release-publish` executor?

The standard Nx Docker publisher pushes only the primary version tag and does
not invoke `docker:push`. For projects using
`nx.release.docker.repositoryName`, the DX executor reuses the version selected
by Nx and also publishes major, minor, and `latest` aliases. When another plugin
infers the same target, only the executor must be selected explicitly;
`projectName` and `projectRoot` remain inferred.

### Why is there no application build or `package` target?

The plugin detects Docker projects, not application frameworks. Compilation and
packaging belong in each Dockerfile, keeping the generated targets independent
from Node.js, pnpm, or any other language toolchain.

### Why does the build context default to the workspace root?

Monorepo Dockerfiles often copy root configuration or shared packages. A root
context supports that convention without language-specific assumptions;
projects that need a narrower context can override `contextPath`.

### Why is the package built as CommonJS?

Some supported Nx versions mutate the loaded plugin namespace. Native ES module
namespaces are immutable, while a CommonJS export remains compatible with those
loaders.

### Why is `dist` committed?

Nx loads plugins from `nx.json` while creating the project graph, before any
build target can run. Committing the built entry points makes the plugin
loadable in a fresh checkout.

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
      "preVersionCommand": "node ./node_modules/@pagopa/nx-dx-docker-plugin/dist/docker-prebuild.js",
    },
  },
}
```

Then export `NX_RELEASE_DOCKER_PROJECTS` (a comma/space-separated list of
project names or patterns) alongside `--projects` when invoking the
release:

```bash
NX_RELEASE_DOCKER_PROJECTS=dockerapp3 \
  pnpm exec nx release version --projects=dockerapp3 --dry-run
```
