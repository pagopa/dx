---
"azure_function_app": major
---

Now it is possible to set more than one action group to be invoked when an alert is triggered

**Migration Guide**

Replace `action_group_id` with `action_group_ids` and provide a list of action group IDs instead of a single value.

From this:

```hcl
module "function_app" {
  source = "pagopa/dx-azure-function-app/azurerm"

  action_group_id = "<the-action-group-id>"
}
```

to this:

```hcl
module "function_app" {
  source = "pagopa/dx-azure-function-app/azurerm"

  action_group_ids = [
    "<the-action-group-id>"
  ]
}
```
