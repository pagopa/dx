# Nx DX Docker Plugin

`@pagopa/nx-dx-docker-plugin` is an Nx plugin that extends `@nx/docker` with workspace-wide Docker conventions.

It keeps the standard Docker target inference provided by Nx, then enriches the inferred targets with:

- automatic Docker build context selection
- automatic `--file` resolution relative to the selected build context
- automatic OCI image labels
- passthrough metadata tags and labels attached to the inferred Docker build target
- a custom `nx-release-publish` executor that publishes the release image and its semver aliases

## Requirements

- Node.js 22 or newer
- Nx workspace
- Docker available in the environment that runs build or publish targets

## Installation

Install the package as a development dependency in the target monorepo.

```bash
pnpm add -D @pagopa/nx-dx-docker-plugin
# or
npm install -D @pagopa/nx-dx-docker-plugin
# or
yarn add -D @pagopa/nx-dx-docker-plugin
```

Then register it in `nx.json`.

## Configure The Plugin

No plugin options are required when the default target names inferred by `@nx/docker` are acceptable.

Minimal configuration:

```json
{
  "plugins": ["@pagopa/nx-dx-docker-plugin"]
}
```

Optional overrides:

```json
{
  "plugins": [
    {
      "plugin": "@pagopa/nx-dx-docker-plugin",
      "options": {
        "buildTarget": {
          "name": "docker:build",
          "args": ["--platform linux/arm64,linux/amd64"],
          "metadata": {
            "tags": [
              "type=raw,value=latest,enable={{is_default_branch}}",
              "type=semver,pattern={{version}}",
              "type=semver,pattern={{major}}.{{minor}}",
              "type=ref,event=branch",
              "type=sha"
            ],
            "labels": ["com.acme.channel=stable"]
          }
        },
        "dockerImageAuthors": "PagoPA"
      }
    }
  ]
}
```

### Supported Options

Plugin options in `nx.json` are all optional.

The plugin accepts these optional parameters:

- `buildTarget`: same contract supported by `@nx/docker`. Use it to customize the inferred Docker build target name or pass supported upstream target options.
- `buildTarget.metadata.tags`: optional tag descriptors preserved on the inferred Docker build target for downstream tooling or workspace-specific release flows.
- `buildTarget.metadata.labels`: optional additional labels expressed as `key=value` entries. They are appended after the automatic OCI labels, so repeated keys can override the defaults.
- `runTarget`: same contract supported by `@nx/docker`, used for the inferred Docker run target.
- `dockerImageAuthors`: value used for the `org.opencontainers.image.authors` OCI label. When omitted, the plugin tries to use the GitHub organization or owner extracted from the workspace `origin` remote. If that information is unavailable, it falls back to `PagoPA`.

The plugin does not require any mandatory custom parameters.

### Default Runtime Conventions

The plugin applies these defaults even when they are not declared in `nx.json`:

- `DOCKER_BUILDKIT=1` is injected into the inferred Docker build target unless the target already defines `DOCKER_BUILDKIT`.
- OCI labels are generated automatically from project metadata and workspace Git metadata.
- optional metadata tags and labels are attached to the inferred Docker build target.
- Projects configured for Docker release publishing get a custom `nx-release-publish` target.
- target option objects without an explicit `name` are normalized to `docker:build` or `docker:run` before they are passed to `@nx/docker`

### `docker:run` Behavior

The plugin does not rewrite the inferred Docker run target.

- discovery of the run target is still delegated to `@nx/docker`
- the optional `runTarget` plugin option keeps the same public contract as `@nx/docker`; this package only fills the default target name before delegating
- once the target is inferred, the plugin leaves its command and options untouched

This means the package owns Docker build normalization, metadata propagation, and publish behavior, while `docker:run` keeps the standard Nx Docker semantics.

## How Target Inference Works

The plugin discovers Dockerfiles and infers each project's Docker targets.

For each inferred Docker project it:

1. creates `docker:build` and `docker:push` backed by this plugin's executors
2. resolves workspace-relative Docker contexts, Dockerfiles, and platforms
3. adds OCI labels and the DX image-tag strategy
4. adds `nx-release-publish` when a project declares a Docker release repository

The plugin preserves unrelated build arguments already defined on the inferred target.

## Workspace Release Composition

For package projects, set `nx.release.docker.repositoryName` or
`release.docker.repositoryName` in `package.json`. The plugin then replaces
Nx's publish target with its Docker publisher. Docker-only projects declare the
repository and version in `project.json` metadata, as shown below.

## Build Context Resolution

The plugin inspects the Dockerfile to choose the narrowest valid build context.

It parses local `COPY` and `ADD` instructions in both shell form and JSON-array form, then:

- ignores `ADD` sources that point to remote URLs
- ignores stage-to-stage copies declared with `--from`
- collects candidate contexts from directories under the project root and from ancestor directories up to the workspace root
- keeps only the contexts that can resolve every local source path referenced by the Dockerfile
- selects the deepest valid context so Docker sends the smallest practical build context

If the Dockerfile does not reference any local `COPY` or `ADD` sources, the project root is used as the build context.

## Automatic OCI Labels

The plugin adds these labels to the Docker build target:

- `org.opencontainers.image.title`
- `org.opencontainers.image.description`
- `org.opencontainers.image.authors`
- `org.opencontainers.image.url`
- `org.opencontainers.image.source`
- `org.opencontainers.image.revision` when the workspace has a readable `HEAD`

It also appends `--provenance=false`.

### Metadata Sources

The label values are resolved from project metadata in this order:

- `project.json` inside the project root
- `package.json` inside the project root
- workspace Git metadata discovered from the `origin` remote when repository information is not declared locally

The `source` label always points to the project directory inside the repository.
The `repository` field is therefore optional when the workspace Git remote already identifies the source repository.

## Metadata Tags And Labels

`buildTarget.metadata.tags` and `buildTarget.metadata.labels` are preserved on the inferred Docker build target.

The plugin does not interpret or expand those values at build time. Their purpose is to make the enriched target shape visible in `nx show project` output and available to downstream tooling or workspace-specific release orchestration.

`buildTarget.metadata.labels` is appended after the automatic OCI labels in the inferred target options.

## Publish Flow

The package provides one executor:

- `@pagopa/nx-dx-docker-plugin:release-publish`

This executor is reached through the inferred `nx-release-publish` target.

Its behavior is:

1. read the released version from the project's `package.json`, or from
  `project.json` `metadata.version` for Docker-only projects
2. compute the immutable version, major/minor, and `latest` tags
3. in dry-run mode, print the tags that would be published and stop
4. otherwise rebuild the image with Buildx and push every release tag

The versioned `package.json` is the cross-job release contract. The executor does not read, create, or require `tmp/<projectRoot>/.docker-version`, so versioning and publishing can safely run on different CI runners.

### Executor Options

The inferred `nx-release-publish` target provides the Docker build context, Dockerfile, image name, platform, and project root automatically.

The `release-publish` executor supports these options:

- `dryRun`: log the publish plan without pushing images

`NX_DRY_RUN=true` is also honored.

## Expected Project Metadata

Package projects can configure Docker release publishing in `package.json`:

```json
{
  "name": "dockerapp",
  "description": "Example Docker application",
  "repository": {
    "url": "https://github.com/acme/example-monorepo"
  },
  "release": {
    "docker": {
      "repositoryName": "acme/dockerapp"
    }
  }
}
```

Docker-only projects use `project.json` instead:

```json
{
  "metadata": {
    "docker": {
      "contextPath": "containers/my-runner",
      "platform": "linux/amd64",
      "repositoryName": "pagopa/my-runner"
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

Nx Release updates `metadata.version`; the custom publisher consumes the same
value in a later job, without relying on a temporary file.

## Package Development

Build the package from the workspace root with:

```bash
pnpm nx build @pagopa/nx-dx-docker-plugin
```

The build generates the compiled files under `dist`.
