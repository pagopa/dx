---
"azure_event_hub": patch
---

# Patch Changes

Replace the `tier` variable with a new `use_case` variable for tiering configuration.

## Upgrade Notes

| Old Value | New Value  |
|-----------|------------|
| s         | *none*     |
| m         | `default`  |
| l         | *none*     |

This change simplifies and clarifies the selection of EventHub.

For Example:

- **Before**

  ```hcl
  module "eventhub" {
    source  = "pagopa-dx/azure-event-hub/azurerm"
    version = "~> 0.0"

    tier    = "m"
    # ...other variables...
  }
  ```

- **After**

  ```hcl
  module "eventhub" {
    source  = "pagopa-dx/azure-event-hub/azurerm"
    version = "~> 0.0"
    
    use_case = "default"
    # ...other variables remain unchanged...
  }
  ```
