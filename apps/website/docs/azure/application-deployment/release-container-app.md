---
sidebar_position: 1
sidebar_label: Deploying App to Azure Container App
---

# Deploying Apps to Azure Container App

:::info Reusable Workflow

| Workflow                        | Version | Source                                                                                                                              |
| ------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Release Azure Container App** | v1      | [`release-azure-containerapp-v1.yaml`](https://github.com/pagopa/dx/blob/main/.github/workflows/release-azure-containerapp-v1.yaml) |

:::

This documentation covers the Container App Release reusable workflow.

## How It Works

The workflow performs the following steps:

1. Build and push the Docker image to the registry using the `docker-build-push`
   action
2. Determine the Container App’s
   [revision mode](https://learn.microsoft.com/en-us/azure/container-apps/revisions#revision-modes):
   **Single** or **Multiple**
3. In **Single** mode, deploy the new image; Azure automatically routes 100% of
   traffic to the new revision when it is ready
4. In **Multiple** mode (canary rollout):
   1. Create a new revision with the updated image
   2. Wait until the new revision reports **Healthy** status for the app
      (according to configured probes)
   3. Assign the stable `staging` revision label for testing the candidate
   4. To implement a canary deployment, you can set up
      [a custom script](#implementing-a-canary-test-script) within your pipeline
      that guides the deployment process using its output, in JSON format (more
      details below):
      - Use a `swap` flag to cut over immediately (100% traffic to new revision)
      - Use `nextPercentage` and `afterMs` to schedule gradual rollouts
   5. If no script is provided, perform a full switch (100% to new revision)
5. After successful switch, deactivate the old revision and remove `staging`
6. In case of failure, the new revision is deactivated, while the old revision
   remains active

### Manual Deployment Approval

When the `${environment}-cd` GitHub environment is configured with protection
rules, deployments are approved automatically by default through the
`GH_TOKEN_DEPLOYMENT_APPROVAL` repository secret. Set `enable_auto_deploy` to
`false` to require a manual approval before the new revision receives traffic.

### Staging URL

In **Multiple** mode, test the healthy candidate at this stable URL, even when
it receives 0% of application traffic:

```text
https://my-app---staging.example.azurecontainerapps.io
```

The app URL remains the production endpoint. After a successful rollout and old
revision deactivation, the workflow removes the `staging` endpoint.

**Single** mode is unchanged: Azure switches traffic as soon as the new revision
is ready, so there is no pre-promotion testing window for a staging label.

### Implementing a Canary Test Script

For canary deployments, add a TypeScript (`npm`, `yarn` or `pnpm`) script to
test the new version and drive workflow behaviour. This script can check the
results of integration tests and/or monitoring metrics before outputting a
payload that influence the workflow.

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
      enable_auto_deploy: false
      docker_image_description: "<image-description>"
```

## Notes

- Ensure the following secrets are set in your repository:
  `ARM_SUBSCRIPTION_ID`, `ARM_TENANT_ID`, `ARM_CLIENT_ID`, `GITHUB_TOKEN`, and
  `GH_TOKEN_DEPLOYMENT_APPROVAL`.
