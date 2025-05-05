---
sidebar_position: 1
sidebar_label: Deploying App to Azure Container App
---

# Deploying App to Azure Container App

This documentation covers the Container App Release reusable workflow defined in [release-azure-containerapp-v1.yaml](https://github.com/pagopa/dx/blob/main/.github/workflows/release-azure-containerapp-v1.yaml).

## How It Works

The workflow performs the following steps:

1. Builds and pushes the Docker image with the `docker-build-push` action.
2. Determines the Container App revision mode (`Single` or `Multiple`).
3. In `Single` mode, updates the app with the new image.
4. In `Multiple` mode, creates a new revision, waits for health, shifts traffic, and deactivates the old revision.

## Usage

```yaml
jobs:
  deploy:
    uses: pagopa/dx/.github/workflows/release-azure-containerapp-v1.yaml@main
    with:
      container_app: <app-name>
      resource_group_name: <resource-group>
      environment: <environment>
      docker_image_description: "<image-description>"
```

## Notes

- Ensure the following secrets are set in your repository: `ARM_SUBSCRIPTION_ID`, `ARM_TENANT_ID`, `ARM_CLIENT_ID`, `GITHUB_TOKEN`.
