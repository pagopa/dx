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
5. After successful switch, remove `staging` and deactivate the old revision
6. In case of failure, the new revision is deactivated, while the old revision
   remains active

### Manual Deployment Approval

When the `${environment}-cd` GitHub environment is configured with protection
rules, deployments are approved automatically by default through the
`GH_TOKEN_DEPLOYMENT_APPROVAL` repository secret. Set `enable_auto_deploy` to
`false` to require a manual approval before the new revision receives traffic.

Both the `release` and `swap` jobs use the `${environment}-cd` environment.
Staging is available only after the release job has been approved and has
deployed a healthy candidate. If the swap job is waiting for approval, that is
an opportunity to test the candidate through its staging URL.

### Stable Staging URL

In **Multiple revision mode**, tests can use a stable URL instead of discovering
the new revision suffix after every deployment:

```text
Application: https://my-app.example.azurecontainerapps.io
Staging:     https://my-app---staging.example.azurecontainerapps.io
```

The hostname contains **three dashes** before `staging`.

The label routes directly to the candidate even when that revision receives **0%
of traffic through the application URL**. Reassigning `staging` transfers it
from its previous revision; two revisions cannot hold the same label.

The application URL remains the production endpoint. No `production` label is
created, and the existing revision selection and traffic rollout are unchanged.
There is no additional testing gate: test while swap approval is pending, or
integrate tests into your existing canary monitoring script during incremental
rollout. Without a monitoring script or a pending approval, promotion can be
immediate.

After a successful rollout reaches 100% and the old revision is deactivated, the
workflow removes `staging`. These are separate operations, not an atomic slot
swap. The staging URL is intended only for the candidate's deployment/testing
window; the promoted revision is accessed through the application URL.

On release failure, the candidate is deactivated through the existing failure
path, but its staging label may remain until a later deployment transfers the
label to a new candidate. If the swap fails before cleanup, the label likewise
remains on the candidate as the existing failure path rolls it back and
deactivates it. The workflow removes the label without checking its current
owner, but only after the rollout and old-revision deactivation succeed.

Cancellation or a rejected swap approval can prevent cleanup, especially when
the swap job never starts. The label may then remain on the candidate until a
later deployment transfers it. Workflow concurrency and environment approval
behavior are unchanged; the staging URL is not a promise that a candidate stays
available.

### Why Single Mode Has No Staging Phase

**Single revision mode** is unchanged. Azure automatically switches application
traffic to the new revision when it is ready and deactivates the previous one.
The workflow therefore has no controlled interval in which a healthy candidate
can be tested at 0% production traffic before promotion.

Revision labels are not inherently unsupported in Single mode, but adding one
would not provide App Service-like pre-production staging semantics. Use
Multiple mode for this workflow's stable staging URL and controlled revision
promotion.

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
