# @pagopa/nx-docker-release-tools

Reusable CLI utilities for Docker publish steps in Nx release flows.

## Purpose

This package is used only when a Docker project needs to publish both:

- the immutable version tag (for example, `1.2.3`)
- the rolling `latest` tag pointing to the same image

If your release process does not require `latest`, this package is not needed.

In short: this package is the publish-time bridge between Nx Docker release
metadata and the final registry push commands.

## How it integrates with Nx release

1. `nx release version` (with `@nx/docker`) generates metadata at
	 `tmp/<projectRoot>/.docker-version`.
2. That file stores the full image reference to publish (for example,
	 `ghcr.io/pagopa/my-service:1.2.3`).
3. A Docker project's `nx-release-publish` target runs this CLI to:
	 - push the versioned image
	 - tag the same image as `latest`
	 - push `latest`

Example project configuration (`package.json` or `project.json`):

```json
{
	"targets": {
		"nx-release-publish": {
			"executor": "nx:run-commands",
			"options": {
				"command": "pnpm --filter @pagopa/nx-docker-release-tools exec dx-docker-release-publish-with-latest --project-root {projectRoot}"
			}
		}
	}
}
```

## CLI

### dx-docker-release-publish-with-latest

Reads `tmp/<projectRoot>/.docker-version`, pushes the version tag, tags the
same image as `latest`, and pushes `latest`.

```bash
npx --yes --package=@pagopa/nx-docker-release-tools dx-docker-release-publish-with-latest --project-root apps/my-docker-app
```

Supported args:

- `--project-root <path>` (required)

Environment behavior:

- `NX_DRY_RUN=true` prints intended push/tag commands and exits without pushing.

`NX_DRY_RUN` name is inherited from Nx release execution conventions used by
the surrounding release flow.
