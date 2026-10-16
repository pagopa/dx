# Deploy Action

This GitHub Action supports staging a new version and incrementally rolling it out for Azure App Service and Azure Container Apps. Set `phase` to `stage` to create a new Container Apps revision without production traffic, or `rollout` to gradually shift traffic and finalize the deployment.

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
| image               | Container image to stage; required for Container Apps `stage`               | No       |
| resource_group_name | Azure Resource Group name (required for Azure resources)                    | No       |

## Phases

- `stage`: For Azure Container Apps, finds the revision receiving 100% of traffic (and fails if traffic is split across revisions), pins all traffic to it, then copies it with `image`, keeping all traffic on the current revision, waits for the new revision to become healthy, and assigns it the `staging` label. If Azure returns the current revision (the image is unchanged), the stage ends without changes. If the new revision does not become healthy (30 checks, 3 seconds apart), traffic stays on the current revision, the new revision is deactivated, and the action fails.
- `rollout`: For Azure Container Apps, shifts traffic from the previous revision (the one receiving 100% of traffic) to the `staging` revision through the `latest` revision weight. With a canary script, traffic increases step by step; without one, all traffic moves at once. On success, the `staging` label is removed and the previous revision is deactivated. On any failure, all traffic returns to the previous revision and the staged revision is deactivated. If no revision has the `staging` label, the rollout ends without changes.

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

## Example Workflow

```yaml
steps:
  - name: Deploy to Staging Slot
    run: |
      az webapp deploy \
        --resource-group "$RESOURCE_GROUP_NAME" \
        --name "$WEB_APP_NAME" \
        --slot staging \
        --src-path "bundle.zip" \
        --type zip \
        --async false

  - name: Incremental Rollout and Swap
    uses: pagopa/dx/actions/deploy@main
    with:
      phase: "rollout"
      resource_type: "Microsoft.Web/sites"
      resource_name: ${{ env.WEB_APP_NAME }}
      resource_group_name: ${{ env.RESOURCE_GROUP_NAME }}
```
