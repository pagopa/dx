---
"azure_cosmos_account": patch
---

# Patch Changes

Replaced the `tier` variable with a new `use_case` variable for tiering configuration.

## Upgrade Notes

| Old Value | New Value   | Description                                        |
|-----------|-------------|----------------------------------------------------|
| s         | development | Used only for `development` and `testing` purposes |
| l         | default     | Ideal for `production` environments                |

This change simplifies and clarifies the selection of Cosmos Account tiers.

For Example:

- **Before**

  ```hcl
  module "cosmos" {
    source  = "pagopa-dx/azure-cosmos-account/azurerm
    version = "~> 0.0"
    
    tier    = "l"
    
    # ...other variables...
  }
  ```

- **After**

  ```hcl
  module "cosmos" {
    source  = "pagopa-dx/azure-cosmos-account/azurerm
    version = "~> 0.0"
    
    use_case = "default"

    # ...other variables remain unchanged...
  }
  ```
