---
"azure_event_hub": major
---

## Breaking Change

Replace the `tier` variable with a new `use_case` variable for tiering configuration. The previous values (`s`,`m`, `l`) have been replaced by a new option: `default` (formerly `m`). This change simplifies and clarifies the selection of EventHub.

## Migration Path

To migrate to this new major version:

1. Update the module version to `~> 1.0` in your Terraform configuration.
2. Update your `module` configuration to use the new `use_case` variable instead of `tier`. Only `default` is supported.
3. Refer to the README and module documentation for updated examples and guidance.

### Example

#### Before

```hcl
module "eventhub" {
  source  = "pagopa-dx/azure-event-hub/azurerm"
  version = "~> 0.0"

  tier    = "m"
  # ...other variables...
}
```

#### After

```hcl
module "eventhub" {
  source  = "pagopa-dx/azure-event-hub/azurerm"
  version = "~> 1.0"
  
  use_case = "default"
  # ...other variables remain unchanged...
}
```
