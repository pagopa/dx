---
sidebar_position: 1
sidebar_label: Publish SDK - Legacy
---

# Publish SDK - Legacy

The [Publish SDK - Legacy workflow](https://github.com/pagopa/dx/blob/main/.github/workflows/legacy_publish_sdk.yaml) is used to generate and publish SDKs for projects that still rely on a legacy architecture.

:::note

This workflow will eventually be deprecated as part of the migration to a monorepo architecture.

:::

## How It Works

The workflow performs the following steps:

1. Checks out the code from the repository.
2. Generates the SDK client and definitions using the specified OpenAPI generator.
3. Set up `Node.js`, installs dependencies and builds the project.
4. Uploads the generated SDK as an artifact.
5. Optionally deploys the artifact to a private or public npm registry.

## Usage

To use the Publish SDK workflow, you can invoke it as a reusable workflow in your repository. Below is an example configuration:

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

### Configuration Variables

- **environment**: Specifies the deployment environment (e.g., `dev`, `uat`, `prod`).
- **openapiSpecPath**: Path to the OpenAPI specification file.
- **apiProjectDir**: Directory containing the API project. Default is `"."`.
- **sdkPackageName**: Name of the SDK package. Default is an empty string.
- **generatorPackageName**: Name of the OpenAPI generator package. Default is `@pagopa/openapi-codegen-ts`.
- **npmRegistry**: URL of the npm registry. Default is `https://registry.npmjs.org/`.
- **artifactName**: Name of the artifact to be generated. Default is `Bundle_SDK`.

### Notes

- Ensure that the `CODEGEN_VERSION` is correctly resolved in your project to avoid issues with the generator package.
- The workflow supports both public and private npm registries for publishing.

:::warning

Make sure to configure the necessary secrets (e.g., `NPM_TOKEN`) in your repository for secure authentication.

:::
