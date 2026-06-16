# @pagopa/nx-docker-release-tools

Reusable CLI utilities for Docker publish steps in Nx release flows.

## CLI

### dx-docker-release-publish-with-latest

Reads `tmp/<projectRoot>/.docker-version`, pushes the version tag, tags the same image as `latest`, and pushes `latest`.

```bash
npx --yes --package=@pagopa/nx-docker-release-tools dx-docker-release-publish-with-latest --project-root apps/my-docker-app
```

Supported args:

- `--project-root <path>` (required)

Environment behavior:

- `NX_DRY_RUN=true` prints intended commands and exits without pushing.
