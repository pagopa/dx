# Container App staging label

Assign the stable `staging` revision label to an explicit candidate revision, or
remove it only if that candidate still owns it. This action is used by the
Container App release workflow after a new **Multiple-mode** revision is healthy
and during promotion/failure cleanup. It does not change traffic weights, activate
revisions, or select the production revision.

Azure CLI authentication, the `containerapp` command group, Bash, and `jq` must
already be available.

| Input                 | Required | Description                             |
| --------------------- | -------- | --------------------------------------- |
| `operation`           | Yes      | `add` or `remove`                       |
| `container_app_name`  | Yes      | Azure Container App name                |
| `resource_group_name` | Yes      | Resource group containing the app       |
| `revision_name`       | Yes      | Explicit candidate name; never `latest` |

The `add` operation transfers any existing staging label without an interactive
confirmation, verifies the assignment, and returns `staging_url`. Given the app
URL `https://my-app.example.azurecontainerapps.io`, the label URL is
`https://my-app---staging.example.azurecontainerapps.io`.

The `remove` operation checks ownership and leaves an absent label or a label
belonging to another revision unchanged. The ownership check and removal are
separate Azure calls, not an atomic concurrency guard. Azure query and mutation
errors fail the action.

```yaml
- uses: pagopa/dx/actions/containerapp-staging-label@main
  with:
    operation: add
    container_app_name: my-app
    resource_group_name: my-resource-group
    revision_name: my-app--0000002
```

Labels do not create an App Service-like testing interval in **Single mode**:
Azure automatically switches traffic when the new revision is ready. The release
workflow therefore calls this action only in Multiple mode.
