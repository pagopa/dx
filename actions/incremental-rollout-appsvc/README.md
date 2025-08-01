# Incremental Rollout for Azure App Service Action

This GitHub Action enables incremental rollouts for Azure App Service deployments using staging slots. It gradually shifts traffic from production to staging, runs a user-provided canary script to validate the new version, and finalizes the deployment with a slot swap to ensure the production slot always runs the latest code.

## Usage

```yaml
- name: Incremental Rollout and Swap
  uses: ./.github/actions/incremental-rollout-appservice
  with:
    resource_group_name: ${{ env.RESOURCE_GROUP_NAME }}
    web_app_name: ${{ env.WEB_APP_NAME }}
    script_language: "typescript (npm)"
    script_name: "canary-check"
```

## Inputs

| Input               | Description                                                | Required | Default            |
| ------------------- | ---------------------------------------------------------- | -------- | ------------------ |
| resource_group_name | Azure Resource Group name                                  | Yes      |                    |
| web_app_name        | Azure Web App name                                         | Yes      |                    |
| script_language     | Script language: 'typescript (npm)' or 'typescript (yarn)' | Yes      | 'typescript (npm)' |
| script_name         | Script name to execute during canary deployment            | Yes      |                    |

## How It Works

1. **Incremental Traffic Shift**: Gradually moves traffic from production to staging slot in steps, running the provided script at each increment.
2. **Canary Script Validation**: At each step, the script is executed. If it fails, traffic is reverted to production and the rollout stops.
3. **Swap on Success**: Once 100% of traffic is on staging and the script passes, a final slot swap is performed so the production slot runs the new version and staging is reset.

The canary script must output JSON with the following fields:

- `nextPercentage`: (number) The next percentage of traffic to shift to staging.
- `afterMs`: (number) How long to wait (in milliseconds) before the next increment.
- `swap`: (boolean, optional) If true, immediately shift all traffic to staging and proceed to swap.

## Example Canary Script Output

```json
{
  "nextPercentage": 50,
  "afterMs": 30000,
  "swap": false
}
```

## Requirements

- The action requires `jq` and Azure CLI (`az`) to be available in the runner environment.
- The script referenced by `script_name` must be available and executable in the workflow context.

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
    uses: pagopa/dx/actions/incremental-rollout-appservice@main
    with:
      resource_group_name: ${{ env.RESOURCE_GROUP_NAME }}
      web_app_name: ${{ env.WEB_APP_NAME }}
      script_language: "typescript (npm)"
      script_name: "canary-check"
```
