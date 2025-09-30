---
sidebar_position: 51
---

# Publishing an SDK to npm (deprecated)

The
[Publish SDK - Legacy workflow](https://github.com/pagopa/dx/blob/main/.github/workflows/legacy_publish_sdk.yaml)
is used to generate and publish SDKs for **Node.js** projects.

:::caution

This workflow has been deprecated as part of the migration to a monorepo
architecture.

:::

## How It Works

The workflow performs the following steps:

1. Checks out the code from the repository.
2. Generates the SDK client and definitions using the specified OpenAPI
   generator.
3. Set up `Node.js`, installs dependencies and builds the project.
4. Uploads the generated SDK as an artifact.
5. Optionally deploys the artifact to a private or public npm registry.

:::info

Ensure that `yarn` is properly configured in your project with the necessary
scripts for building and generating SDKs. The `package.json` file must define
the following npm tasks:

- `generate`: To generate API models or SDK definitions.
- `build`: To compile the project.
- `prebuild` or `predeploy`: To clean and prepare the environment before
  building.

These scripts are essential for the workflow to function correctly.

:::

## Usage

To use the Publish SDK workflow, you can invoke it as a reusable workflow in
your repository. Below is an example configuration:

```yaml
name: Publish SDK

on:
  workflow_dispatch:

jobs:
  publish_sdk:
    uses: pagopa/dx/.github/workflows/legacy_publish_sdk.yaml@main
    name: Publish SDK on PROD
    secrets: inherit
    with:
      environment: "prod"
      use_private_agent: false
      openapiSpecPath: "path/to/openapi/spec.yaml"
```

### Notes

- Ensure that the `CODEGEN_VERSION` is correctly resolved in your project to
  avoid issues with the generator package.
- The workflow supports both public and private npm registries for publishing.
