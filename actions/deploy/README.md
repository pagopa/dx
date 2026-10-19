# Deploy Action

This GitHub Action supports staging a new version and incrementally rolling it out for Azure App Service and Azure Container Apps. Set `phase` to `stage` to create a new Container Apps revision without production traffic, or `rollout` to gradually shift traffic and finalize the deployment.

## Usage

```yaml
- name: Deploy
  uses: ./.github/actions/deploy
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

- `stage`: For Azure Container Apps, creates a revision from `image`, keeps the `production` label at 100% traffic, waits for the new revision to become healthy, and assigns it the `staging` label. If no `production` label exists yet, the action initializes it from the revision receiving 100% of traffic.
- `rollout`: Splits traffic between the `production` and `staging` labels. On success, the staged revision is promoted to `production`, the `staging` label is removed, and the old production revision is deactivated.

## How It Works

1. **Incremental Traffic Shift**: Gradually moves traffic from production to the staged target in steps, running the provided canary script at each increment.
2. **Canary Script Validation**: At each step, the script is executed. If it fails, traffic is reverted to production and the rollout stops.
3. **Finalize on Success**: Once 100% of traffic is on the staged target, App Service swaps slots; Container Apps promotes the `staging` label to `production` and deactivates the previous production revision.

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

- The action requires Azure CLI (`az`) to be available in the runner environment. The rollout phase also requires `jq`.
- Azure Container Apps must use multiple active revisions.
- There must be a bash script named `canary-monitor.sh` in the root directory, which will be executed at each traffic increment. It takes the resource group name, web app name, and current traffic percentage as arguments.

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
