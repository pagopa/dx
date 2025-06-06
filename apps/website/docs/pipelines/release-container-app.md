---
sidebar_position: 1
sidebar_label: Deploying App to Azure Container App
---

# Deploying Apps to Azure Container App

This documentation covers the Container App Release reusable workflow defined in
[release-azure-containerapp-v1.yaml](https://github.com/pagopa/dx/blob/main/.github/workflows/release-azure-containerapp-v1.yaml).

## How It Works

The workflow performs the following steps:

1. Build and push the Docker image to the registry using the `docker-build-push`
   action
2. Determine the Container App’s
   [revision mode](https://learn.microsoft.com/en-us/azure/container-apps/revisions#revision-modes):
   **Single** or **Multiple**
3. In **Single** mode, update the existing revision with the new image, routing
   100% of traffic immediately
4. In **Multiple** mode (canary rollout):
   1. Create a new revision with the updated image
   2. Wait until the new revision reports **Healthy** status for the app
      (according to configured probes)
   3. To implement a canary deployment, you can set up a custom script within
      your pipeline that guides the deployment process using its output, in JSON
      format (more details below):
      - Use a `swap` flag to cut over immediately (100% traffic to new revision)
      - Use `nextPercentage` and `afterMs` to schedule gradual rollouts
   4. If no script is provided, perform a full switch (100% to new revision)
5. After successful switch, deactivate the old revision
6. In case of failure, the new revision is deactivated, while the old revision
   remains active

### Implementing a Canary Test Script

For canary deployments, add an NPM script to test the new version and drive
workflow behaviour. This script can check the results of integration tests
and/or monitoring metrics before outputting a payload that influence the
workflow.

The following schemas for the script output are supported:

```json
{
  "swap": true
}
```

Output such payload to immediate cutover to the new version:

- `swap`: when `true`, switches all traffic to the new revision immediately.

Instead, for gradual rollout output:

```json
{
  "nextPercentage": 50,
  "afterMs": 30000
}
```

- `nextPercentage`: percentage of users traffic that will flow to the new
  revision in the next iteration of the script.
- `afterMs`: delay in milliseconds before moving to the next iteration.

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

- Ensure the following secrets are set in your repository:
  `ARM_SUBSCRIPTION_ID`, `ARM_TENANT_ID`, `ARM_CLIENT_ID`, `GITHUB_TOKEN`.
