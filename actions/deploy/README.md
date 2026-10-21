# Deploy Action

This GitHub Action supports staging a new version and incrementally rolling it out for Azure App Service, Azure Function Apps, and Azure Container Apps. Set `phase` to `stage` to update an existing Linux container web app or Function App's staging slot image or create a new Container Apps revision without production traffic, or `rollout` to gradually shift traffic and finalize the deployment.

## Usage

```yaml
- name: Deploy
  uses: pagopa/dx/actions/deploy@main
  with:
    phase: "stage"
    resource_type: "Microsoft.App/containerApps"
    resource_name: ${{ env.WEB_APP_NAME }}
    image: ${{ env.CONTAINER_IMAGE }}
    resource_group_name: ${{ env.RESOURCE_GROUP_NAME }}
```

## Inputs

| Input               | Description                                                                 | Required |
| ------------------- | --------------------------------------------------------------------------- | -------- |
| phase               | Action phase: `stage` or `rollout`                                          | Yes      |
| resource_type       | Azure resource type: `Microsoft.Web/sites` or `Microsoft.App/containerApps` | Yes      |
| resource_name       | Name of the deployment target                                               | Yes      |
| image               | Container image to stage; required when `phase` is `stage`                  | No       |
| resource_group_name | Azure Resource Group name (required for Azure resources)                    | No       |

## Phases

- `stage`
  - `Container Apps`: Creates a healthy `staging` revision from the revision receiving 100% of traffic. Fails if traffic is split; if the image is unchanged, makes no changes. On health-check failure, deactivates the staged revision and leaves traffic unchanged.
  - `App Service/Function Apps`: Sets the image on the existing `staging` slot of Linux web apps and Function Apps. Requires production and staging to be configured for containers; does not configure registry access, create slots, change production traffic, or wait for application health.
- `rollout`
  - `Container Apps`: Moves traffic from the current revision to `staging`, gradually with a canary script or immediately without one. On success, removes the `staging` label and deactivates the old revision; on failure, restores traffic and deactivates the staged revision. No-op if no staged revision exists.
  - `App Service/Function Apps`: Shifts traffic to the `staging` slot in canary steps, then swaps slots. Without a canary script, swaps immediately. On canary failure, clears traffic routing.

## How It Works

1. **Incremental Traffic Shift**: Gradually moves traffic from production to the staged target in steps, running the provided canary script at each increment.
2. **Canary Script Validation**: At each step, the script is executed. If it fails, traffic is reverted to production and the rollout stops.
3. **Finalize on Success**: Once 100% of traffic is on the staged target, App Service swaps slots; Container Apps removes the `staging` label and deactivates the previous revision.

The canary script must output JSON with the following fields:

- `nextPercentage`: (integer, 0-100) The next percentage of traffic to shift to staging.
- `afterMs`: (non-negative integer, at most 9007199254740991) How long to wait (in milliseconds) before the next increment. The upper bound keeps the value within JSON's interoperable integer range.

Malformed JSON, missing fields, or invalid values cause the rollout to stop and revert traffic to production, just like a failing monitoring script.

## Example Canary Script Output

```json
{
  "nextPercentage": 50,
  "afterMs": 30000
}
```

## Requirements

- The action requires Azure CLI (`az`) and `jq` to be available in the runner environment.
- Azure Container Apps must use multiple active revisions; the `stage` phase fails in single revision mode.
- An optional bash script named `canary-monitor.sh` in the repository root enables canary rollout. Without it, rollout promotes the staged target directly. The script takes the resource group name, resource name, and current traffic percentage as arguments.
- App Service and Function App staging requires an existing Linux app with both production and the `staging` slot already configured with a container image (`DOCKER|` in `linuxFxVersion`). Provision the infrastructure, registry access, and any managed identity permissions beforehand. The image must be accessible using the slot's existing registry configuration; this action does not configure credentials or convert zip-based apps to containers.
- With the Azure Function App or App Service Terraform module, set `container_image` and select a use case that provisions the `staging` slot. The modules require a tagged image at creation and ignore subsequent image changes so deployments can change the registry, repository, tag, or digest. Registry authentication remains the responsibility of Terraform or the caller; configure any required credentials or managed identity permissions (including caller-granted `AcrPull` for Azure Container Registry) before staging a new image.

## Example Workflow

```yaml
steps:
  - name: Deploy to Staging Slot
    uses: pagopa/dx/actions/deploy@main
    with:
      phase: "stage"
      resource_type: "Microsoft.Web/sites"
      resource_name: ${{ env.WEB_APP_NAME }}
      resource_group_name: ${{ env.RESOURCE_GROUP_NAME }}
      image: ${{ env.CONTAINER_IMAGE }}

  - name: Incremental Rollout and Swap
    uses: pagopa/dx/actions/deploy@main
    with:
      phase: "rollout"
      resource_type: "Microsoft.Web/sites"
      resource_name: ${{ env.WEB_APP_NAME }}
      resource_group_name: ${{ env.RESOURCE_GROUP_NAME }}
```
