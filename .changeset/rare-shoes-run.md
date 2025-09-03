---
"azure_api_management": major
---

# Major Changes

Replaced the `tier` variable with a new `use_case` variable for tiering configuration. 

## Upgrade Notes

| Old Value | New Value      | Description                                                            |
|-----------|----------------|------------------------------------------------------------------------|
| s         | development    | Ideal `development` and `testing` purposess                            |
| m         | cost_optimized | Ideal for `production` environments purposes, now using StandardV2 SKU |
| l         | high_load      | Ideal for large-scale production workloads                             |
| xl        | *none**        | Now don't exist                                                        |

This change simplifies and clarifies the selection of API Management tiers.

For Example:

- **Before**

  ```hcl
  module "apim" {
    source  = "pagopa-dx/azure-api-management/azurerm
    version = "~> 1.0"

    tier    = "m"
    
    # ...other variables...
  }
  ```

- **After**

  ```hcl
  module "apim" {
    source  = "pagopa-dx/azure-api-management/azurerm
    version = "~> 2.0"
    
    use_case = "cost_optimized"

    # ...other variables remain unchanged...
  }
  ```
