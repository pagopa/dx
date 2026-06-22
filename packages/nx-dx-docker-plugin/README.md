# Nx DX Docker Plugin

`@pagopa/nx-dx-docker-plugin` is an Nx plugin that extends `@nx/docker` with workspace-wide Docker conventions.

It keeps the standard Docker target inference provided by Nx, then enriches the inferred targets with:

- automatic Docker build context selection
- automatic `--file` resolution relative to the selected build context
- automatic OCI image labels
- passthrough metadata tags and labels attached to the inferred Docker build target
- a dedicated `docker-release-publish` executor that publishes both the versioned image tag and `latest`

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
- `docker-release-publish` is added as a dedicated Docker publish target.
- Docker-only projects get an `nx-release-publish` shell target so they can participate in Nx release flows.
- target option objects without an explicit `name` are normalized to `docker:build` or `docker:run` before they are passed to `@nx/docker`

### `docker:run` Behavior

The plugin does not rewrite the inferred Docker run target.

- discovery of the run target is still delegated to `@nx/docker`
- the optional `runTarget` plugin option keeps the same public contract as `@nx/docker`; this package only fills the default target name before delegating
- once the target is inferred, the plugin leaves its command and options untouched

This means the package owns Docker build normalization, metadata propagation, and publish behavior, while `docker:run` keeps the standard Nx Docker semantics.

## How Target Inference Works

The plugin delegates Docker project discovery to `@nx/docker` and then patches the inferred projects.

For each inferred Docker project it:

1. keeps the target names produced by `@nx/docker`
2. rewrites the Docker build target so that `cwd` is the selected build context
3. rewrites `--file` so the Dockerfile path is relative to that build context
4. keeps the upstream build target executor and command produced by `@nx/docker`
5. removes previously defined OCI image labels managed by the plugin
6. appends a fresh set of automatically generated OCI labels
7. forwards optional `buildTarget.metadata` settings to the inferred build target options
8. adds `docker-release-publish` backed by `@pagopa/nx-dx-docker-plugin:release-publish`
9. ensures Docker-only projects still expose `nx-release-publish` as an executable shell target

The plugin preserves unrelated build arguments already defined on the inferred target.

## Workspace Release Composition

The plugin intentionally keeps Docker publishing separate from other artifact publishers.

- `docker-release-publish` is always added for Docker projects.
- Docker-only projects get `nx-release-publish` as a lightweight `nx:noop` shell target.
- package-based projects keep Nx core's implicit `nx-release-publish` target.

If a workspace wants package publishing and Docker publishing to run together behind `nx-release-publish`, the reliable integration point is `targetDefaults` in `nx.json`:

```json
{
  "targetDefaults": {
    "nx-release-publish": {
      "dependsOn": [
        {
          "target": "docker-release-publish",
          "params": "forward"
        }
      ]
    }
  }
}
```

Nx core merges that default into the implicit `nx-release-publish` target it creates for non-private `package.json` projects, which keeps per-project `project.json` files minimal.

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

This executor is normally reached through the inferred `docker-release-publish` target.

Workspaces can also compose it into `nx-release-publish` centrally through `targetDefaults` when package publishing and Docker publishing should happen together.

Its behavior is:

1. resolve the current project from the Nx execution context
2. read `tmp/<projectRoot>/.docker-version`
3. treat the file content as the already versioned Docker image reference
4. derive the corresponding `latest` image reference
5. in dry-run mode, print the two tags that would be published and stop
6. otherwise verify that the versioned image exists locally
7. push the versioned image tag
8. tag the same local image as `latest` and push it
9. remove `tmp/<projectRoot>` after a successful publish

Because the executor reuses the image reference stored in `.docker-version`, publish works against the exact tag produced during the versioning phase and only adds the rolling `latest` alias.

### Executor Options

The `release-publish` executor does not require any mandatory parameters.

The `release-publish` executor supports these options:

- `dryRun`: log the publish plan without pushing images
- `quiet`: suppress Docker command output unless a command fails

`NX_DRY_RUN=true` is also honored.

## Expected Project Metadata

Projects work best when they expose meaningful metadata in `package.json` or `project.json`, for example:

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

The plugin uses `name`, `description`, and repository metadata for label generation. Docker release configuration remains owned by the workspace release setup.

## Package Development

Build the package from the workspace root with:

```bash
pnpm nx build @pagopa/nx-dx-docker-plugin
```

The build generates the compiled files under `dist`.